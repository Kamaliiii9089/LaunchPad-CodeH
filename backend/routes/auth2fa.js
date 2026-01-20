const express = require('express');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

/**
 * Generate recovery codes
 * @returns {Array} Array of recovery codes
 */
const generateRecoveryCodes = () => {
    const codes = [];
    for (let i = 0; i < 10; i++) {
        // Generate 8-character alphanumeric code
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push(code);
    }
    return codes;
};

/**
 * Hash recovery codes for secure storage
 * @param {Array} codes - Array of plain text recovery codes
 * @returns {Promise<Array>} Array of hashed recovery codes
 */
const hashRecoveryCodes = async (codes) => {
    const hashedCodes = [];
    for (const code of codes) {
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(code, salt);
        hashedCodes.push(hashed);
    }
    return hashedCodes;
};

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

        console.log('2FA Verify Request:', {
            userId: req.user._id,
            tokenLength: token?.length,
            token: token
        });

        if (!token) {
            return res.status(400).json({ message: 'Token is required' });
        }

        // Need to explicitly select twoFactorSecret as it's hidden by default
        const user = await User.findById(req.user._id).select('+twoFactorSecret');

        if (!user.twoFactorSecret) {
            console.log('2FA verify failed: No secret found for user');
            return res.status(400).json({ message: '2FA setup not initiated' });
        }

        console.log('Verifying token with secret:', {
            secretExists: !!user.twoFactorSecret.base32,
            tokenProvided: token
        });

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret.base32,
            encoding: 'base32',
            token,
            window: 2 // Allow 2 time steps before/after for clock drift
        });

        console.log('Verification result:', verified);

        if (verified) {
            // Generate recovery codes
            const recoveryCodes = generateRecoveryCodes();
            const hashedCodes = await hashRecoveryCodes(recoveryCodes);
            
            console.log('Generated recovery codes, enabling 2FA');
            
            user.is2FAEnabled = true;
            user.twoFactorRecoveryCodes = hashedCodes;
            await user.save();

            console.log('2FA enabled successfully for user:', req.user._id);

            res.json({
                message: 'Two-Factor Authentication enabled successfully',
                is2FAEnabled: true,
                recoveryCodes: recoveryCodes // Send plain codes only once
            });
        } else {
            console.log('2FA verify failed: Invalid token');
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
            user.twoFactorRecoveryCodes = undefined;
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
        const { tempToken, token, isRecoveryCode } = req.body;

        if (!tempToken || !token) {
            return res.status(400).json({ message: 'Missing token or session' });
        }

        // Verify temp token (standard JWT verification)
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);

        if (decoded.scope !== '2fa_pending') {
            return res.status(401).json({ message: 'Invalid session scope' });
        }

        const user = await User.findById(decoded.id)
            .select('+twoFactorSecret +twoFactorRecoveryCodes');

        let verified = false;

        if (isRecoveryCode) {
            // Validate recovery code
            if (!user.twoFactorRecoveryCodes || user.twoFactorRecoveryCodes.length === 0) {
                return res.status(400).json({ message: 'No recovery codes available' });
            }

            // Check if recovery code matches any hashed code
            for (let i = 0; i < user.twoFactorRecoveryCodes.length; i++) {
                const isMatch = await bcrypt.compare(token, user.twoFactorRecoveryCodes[i]);
                if (isMatch) {
                    verified = true;
                    // Remove used recovery code
                    user.twoFactorRecoveryCodes.splice(i, 1);
                    await user.save();
                    break;
                }
            }
        } else {
            // Validate TOTP token
            verified = speakeasy.totp.verify({
                secret: user.twoFactorSecret.base32,
                encoding: 'base32',
                token
            });
        }

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
            res.status(400).json({ message: isRecoveryCode ? 'Invalid recovery code' : 'Invalid authentication code' });
        }

    } catch (error) {
        console.error('2FA login validation error:', error);
        res.status(401).json({ message: 'Invalid or expired session' });
    }
});

/**
 * @route   POST /api/auth/2fa/regenerate-recovery-codes
 * @desc    Regenerate recovery codes (requires 2FA verification)
 * @access  Private
 */
router.post('/regenerate-recovery-codes', authMiddleware, async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ message: 'Authentication code is required' });
        }

        const user = await User.findById(req.user._id).select('+twoFactorSecret');

        if (!user.is2FAEnabled) {
            return res.status(400).json({ message: '2FA is not enabled' });
        }

        // Verify current token before regenerating codes
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret.base32,
            encoding: 'base32',
            token
        });

        if (!verified) {
            return res.status(400).json({ message: 'Invalid authentication code' });
        }

        // Generate new recovery codes
        const recoveryCodes = generateRecoveryCodes();
        const hashedCodes = await hashRecoveryCodes(recoveryCodes);
        
        user.twoFactorRecoveryCodes = hashedCodes;
        await user.save();

        res.json({
            message: 'Recovery codes regenerated successfully',
            recoveryCodes: recoveryCodes
        });
    } catch (error) {
        console.error('2FA regenerate recovery codes error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   GET /api/auth/2fa/recovery-codes-status
 * @desc    Get count of remaining recovery codes
 * @access  Private
 */
router.get('/recovery-codes-status', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('+twoFactorRecoveryCodes');

        if (!user.is2FAEnabled) {
            return res.status(400).json({ message: '2FA is not enabled' });
        }

        const count = user.twoFactorRecoveryCodes ? user.twoFactorRecoveryCodes.length : 0;

        res.json({
            remainingCodes: count,
            hasRecoveryCodes: count > 0
        });
    } catch (error) {
        console.error('2FA recovery codes status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
