const express = require('express');
const { body, validationResult } = require('express-validator');

const googleAuthService = require('../services/googleAuth');
const { authMiddleware } = require('../middleware/auth');
const { 
  authStrictLimiter, 
  authModerateLimiter, 
  loginAttemptTracker, 
  wrapAuthResponse 
} = require('../middleware/rateLimiter');

const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../errors/AppError');

const User = require('../models/User');

const router = express.Router();

/* =====================================================
   Utility: Validation Error Handler

    const tokens = await googleAuthService.getTokens(code);
    const userInfo = await googleAuthService.getUserInfo(tokens.access_token);

    const user = await googleAuthService.createOrUpdateUser(
      userInfo,
      tokens
    );

    const jwtToken = googleAuthService.generateJWT(user._id);

    res.redirect(
      `${frontendUrl}/login/callback?token=${jwtToken}&user=${encodeURIComponent(
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

/**
 * @route   POST /api/auth/google/callback
 * @desc    Google OAuth callback (API-based)
 * @access  Public
 */
router.post(
  '/google/callback',
  body('code').notEmpty().withMessage('Authorization code is required'),
  asyncHandler(async (req, res) => {
    handleValidation(req);

    const { code } = req.body;

    const tokens = await googleAuthService.getTokens(code);
    const userInfo = await googleAuthService.getUserInfo(tokens.access_token);

    const user = await googleAuthService.createOrUpdateUser(
      userInfo,
      tokens
    );

    const jwtToken = googleAuthService.generateJWT(user._id);

    res.status(200).json({
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    });
  })
);

/* =====================================================
   OPTIONAL: EMAIL / PASSWORD AUTH (SECURE)
   (Uses hashed password from User model)
===================================================== */

/**
 * @route   POST /api/auth/register
 * @desc    Register user with email & password
 * @access  Public
 */
router.post(
  '/register',
  body('email').isEmail(),
  body('name').notEmpty(),
  body('password').isLength({ min: 8 }),
  asyncHandler(async (req, res) => {
    handleValidation(req);

    const { email, name, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('User already exists', 409);
    }

    // IMPORTANT:
    // Password will be hashed automatically via pre-save hook
    const user = await User.create({
      email,
      name,
      password,
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
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
  body('email').isEmail(),
  body('password').notEmpty(),
  asyncHandler(async (req, res) => {
    handleValidation(req);

    const { email, password } = req.body;

    // Explicitly select password for comparison
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    const jwtToken = googleAuthService.generateJWT(user._id);

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
   USER PROFILE & SETTINGS
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        picture: req.user.picture,
        preferences: req.user.preferences,
        lastEmailScan: req.user.lastEmailScan,
      },
    });
  })
);

/**
 * @route   PATCH /api/auth/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.patch(
  '/preferences',
  authMiddleware,
  body('scanFrequency')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'manual']),
  body('emailCategories').optional().isArray(),
  body('notifications').optional().isBoolean(),
  asyncHandler(async (req, res) => {
    handleValidation(req);

    const user = req.user;
    const { scanFrequency, emailCategories, notifications } = req.body;

    if (scanFrequency) user.preferences.scanFrequency = scanFrequency;
    if (emailCategories)
      user.preferences.emailCategories = emailCategories;
    if (notifications !== undefined)
      user.preferences.notifications = notifications;

    await user.save();

    res.status(200).json({
      message: 'Preferences updated successfully',
      preferences: user.preferences,
    });
  })
);

/* =====================================================
   LOGOUT & REVOKE
===================================================== */

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post(
  '/logout',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.status(200).json({ message: 'Logged out successfully' });
  })
);

/**
 * @route   DELETE /api/auth/revoke
 * @desc    Revoke account & delete all data
 * @access  Private
 */
router.delete(
  '/revoke',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;

    try {
      await googleAuthService.revokeAllUserTokens(userId);
    } catch {
      console.warn('Token revocation failed, continuing cleanup');
    }

    const Subscription = require('../models/Subscription');
    const Email = require('../models/Email');

    const deletedSubs = await Subscription.deleteMany({ userId });
    const deletedEmails = await Email.deleteMany({ userId });

    await req.user.deleteOne();

    res.status(200).json({
      message: 'Account and all data deleted successfully',
      deletedData: {
        subscriptions: deletedSubs.deletedCount,
        emails: deletedEmails.deletedCount,
      },
    });
  })
);

module.exports = router;
