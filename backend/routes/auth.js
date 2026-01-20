const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const googleAuthService = require('../services/googleAuth');
const { authMiddleware } = require('../middleware/auth');
const { logActivity } = require('../services/activityLogger');
const {
  authStrictLimiter,
  authModerateLimiter,
  loginAttemptTracker,
  wrapAuthResponse
} = require('../middleware/rateLimiter');
const securityLogger = require('../services/securityLogger');
const { changePassword, deleteAccount } = require('../controllers/userController');

const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../errors/AppError');
const User = require('../models/User');

const router = express.Router();

/* =====================================================
   Helpers

    const tokens = await googleAuthService.getTokens(code);
    const userInfo = await googleAuthService.getUserInfo(tokens.access_token);
    const user = await googleAuthService.createOrUpdateUser(userInfo, tokens);

    const accessToken = generateAccessToken(user._id);

    res.redirect(
      `${frontendUrl}/login/callback?token=${accessToken}&user=${encodeURIComponent(
        JSON.stringify({
          id: user._id,
          email: user.email,
          name: user.name,
          picture: user.picture,
        })
      )}`
    );
  })
);
*/

/* =====================================================
   EMAIL / PASSWORD AUTH
===================================================== */

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user with email & password
 * @access  Public
 */
router.post(
  '/register',
  authStrictLimiter,
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('name').trim().notEmpty().withMessage('Name is required'),
  ],
  asyncHandler(async (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      securityLogger.logAuthFailure(null, ip, 'Registration validation failed');
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      securityLogger.logAuthFailure(email, ip, 'Registration failed - email already exists');
      return res.status(400).json({
        message: 'Email already registered. Please login instead.'
      });
    }

    // Create new user
    const user = await User.create({
      email,
      password, // Will be hashed by pre-save hook
      name,
    });

    // Generate JWT token
    const jwtToken = googleAuthService.generateJWT(user._id);

    // Log registration activity
    await logActivity(user._id, 'REGISTRATION', 'Account created via email', req, 'success', {
      provider: 'email',
      email: user.email
    });

    securityLogger.logAuthSuccess(user._id, user.email, ip, 'email-registration');

    res.status(201).json({
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
      message: 'Account created successfully'
    });
  })
);

/**
 * @route   POST /api/auth/login
 * @desc    Login using email & password
 * @access  Public
 */
router.post(
  '/login',
  authStrictLimiter,
  loginAttemptTracker,
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  wrapAuthResponse(async (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      securityLogger.logAuthFailure(null, ip, 'Login validation failed');
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Explicitly select password and 2FA fields for comparison
    const user = await User.findOne({ email }).select('+password +twoFactorSecret');

    if (!user || !user.password) {
      securityLogger.logAuthFailure(email, ip, 'Invalid credentials or OAuth-only account');
      throw new AppError('Invalid credentials', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      securityLogger.logAuthFailure(email, ip, 'Invalid password');
      throw new AppError('Invalid credentials', 401);
    }

    // Debug: Check 2FA status
    console.log('🔐 User 2FA Status:', {
      email: user.email,
      is2FAEnabled: user.is2FAEnabled,
      has2FAEnabled: !!user.is2FAEnabled
    });

    // Check for 2FA
    if (user.is2FAEnabled) {
      const tempToken = jwt.sign(
        { id: user._id, scope: '2fa_pending' },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );

      return res.status(200).json({
        requires2FA: true,
        tempToken,
        message: 'Two-factor authentication required'
      });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    const accessToken = generateAccessToken(user._id);

    securityLogger.logAuthSuccess(user._id, user.email, ip, 'email-login');

    res.status(200).json({
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  })
);

/* =====================================================
   PROTECTED ROUTES
router.post(
  '/logout',
  authMiddleware,
  requireCsrf,
  asyncHandler(async (req, res) => {
    res.status(200).json({
      message: 'Logged out successfully',
    });
  })
);

// Logout (invalidate token on client side) - Moderate rate limiting
router.post('/logout', authMiddleware, authModerateLimiter, (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    
    // Log session termination
    securityLogger.logSessionTerminated(req.user._id, req.user.email, ip, 'logout');
    
    // In a more complex setup, you might want to maintain a blacklist of tokens
    // For now, we'll rely on the client to remove the token
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
});

// Revoke Gmail access only (keep account but clear Gmail tokens) - Strict rate limiting for security
router.post('/revoke-gmail', authMiddleware, authStrictLimiter, async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log(`🔄 Revoking Gmail access for user: ${req.user.email}`);
    
    // Revoke OAuth tokens from Google
    const revokeResult = await googleAuthService.revokeAllUserTokens(userId);
    
    res.json({ 
      message: 'Gmail access revoked successfully. You can re-authenticate anytime to restore access.',
      revokeResult
    });
  } catch (error) {
    console.error('Gmail revoke error:', error);
    res.status(500).json({ message: 'Failed to revoke Gmail access' });
  }
});

/**
 * @route   DELETE /api/auth/revoke
 * @desc    Delete user account and all associated data
 * @access  Private (requires authentication)
 */
router.delete('/revoke', authMiddleware, authStrictLimiter, asyncHandler(deleteAccount));

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private (requires authentication)
 */
router.post(
  '/change-password',
  authMiddleware,
  authStrictLimiter,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  ],
  asyncHandler(changePassword)
);

console.log('✅ Password change route registered at /api/auth/change-password');

module.exports = router;

