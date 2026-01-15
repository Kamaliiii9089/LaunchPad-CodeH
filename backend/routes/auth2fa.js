const express = require('express');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

/**
 * @route   POST /api/auth/2fa/setup
 * @desc    Generate 2FA secret and QR code
 * @access  Private
 */
router.post('/setup', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        // Generate secret
        const secret = speakeasy.generateSecret({
            name: `LaunchPad (${user.email})`
        });

        // Save secret immediately but keep is2FAEnabled = false
        user.twoFactorSecret = secret;
        await user.save();

        // Generate QR Code
        QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err) {
                console.error('QR Gen error:', err);
                return res.status(500).json({ message: 'Error generating QR code' });
            }

            res.json({
                secret: secret.base32,
                otpauth_url: secret.otpauth_url,
                qrCode: data_url
            });
        });
    } catch (error) {
        console.error('2FA setup error:', error);
        res.status(500).json({ message: 'Server error during 2FA setup' });
    }
});

/**
 * @route   POST /api/auth/2fa/verify
 * @desc    Verify token and enable 2FA
 * @access  Private
 */
router.post('/verify', authMiddleware, async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: 'Token is required' });
        }

        // Need to explicitly select twoFactorSecret as it's hidden by default
        const user = await User.findById(req.user._id).select('+twoFactorSecret');

        if (!user.twoFactorSecret) {
            return res.status(400).json({ message: '2FA setup not initiated' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret.base32,
            encoding: 'base32',
            token
        });

        if (verified) {
            user.is2FAEnabled = true;
            await user.save();

            res.json({
                message: 'Two-Factor Authentication enabled successfully',
                is2FAEnabled: true
            });
        } else {
            res.status(400).json({ message: 'Invalid authentication code' });
        }
    } catch (error) {
        console.error('2FA verify error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   POST /api/auth/2fa/disable
 * @desc    Disable 2FA (requires current token or password - using token for now)
 * @access  Private
 */
router.post('/disable', authMiddleware, async (req, res) => {
    try {
        const { token } = req.body;
        const user = await User.findById(req.user._id).select('+twoFactorSecret');

        if (!user.is2FAEnabled) {
            return res.status(400).json({ message: '2FA is not enabled' });
        }

        // Verify token one last time before disabling
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret.base32,
            encoding: 'base32',
            token
        });

        if (verified) {
            user.is2FAEnabled = false;
            user.twoFactorSecret = undefined;
            await user.save();
            res.json({ message: 'Two-Factor Authentication disabled' });
        } else {
            res.status(400).json({ message: 'Invalid authentication code' });
        }
    } catch (error) {
        console.error('2FA disable error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   POST /api/auth/2fa/validate
 * @desc    Validate 2FA token during login flow
 * @access  Public (with temp token or userId) - wait, this is intricate.
 *          If I use the main login flow, the standard /auth/login should handle the first step.
 *          This endpoint is for Part 2 of login.
 */
router.post('/validate', async (req, res) => {
    // This expects a temporary session token or userId.
    // Simplifying: The login endpoint returns `userId` if 2FA required.
    // This endpoint takes `userId` and `token`.
    // DANGER: Passing userId is not secure enough unless we have a temporary signed token.
    // Better: `auth/login` returns a temporary JWT with scope: '2fa_pending'.

    try {
        const { tempToken, token } = req.body;

        if (!tempToken || !token) {
            return res.status(400).json({ message: 'Missing token or session' });
        }

        // Verify temp token (standard JWT verification)
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);

        if (decoded.scope !== '2fa_pending') {
            return res.status(401).json({ message: 'Invalid session scope' });
        }

        const user = await User.findById(decoded.id).select('+twoFactorSecret');

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret.base32,
            encoding: 'base32',
            token
        });

        if (verified) {
            // Generate FULL token
            const payload = { id: user._id, email: user.email, role: user.role || 'user' };
            const fullToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

            res.json({
                token: fullToken,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    preferences: user.preferences,
                    is2FAEnabled: true
                }
            });
        } else {
            res.status(400).json({ message: 'Invalid authentication code' });
        }

    } catch (error) {
        console.error('2FA login validation error:', error);
        res.status(401).json({ message: 'Invalid or expired session' });
    }
});

module.exports = router;
