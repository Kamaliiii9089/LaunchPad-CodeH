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
    const user = await googleAuthService.createOrUpdateUser(userInfo, tokens);

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
 * @access  Public API
 */
router.post(
  '/google/callback',
  body('code').notEmpty(),
  asyncHandler(async (req, res) => {
    handleValidation(req);

    const tokens = await googleAuthService.getTokens(req.body.code);
    const userInfo = await googleAuthService.getUserInfo(tokens.access_token);
    const user = await googleAuthService.createOrUpdateUser(userInfo, tokens);

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
   EMAIL / PASSWORD AUTH (CSRF PROTECTED)
===================================================== */

/**
 * @route   POST /api/auth/register
 * @access  Public (CSRF Protected)
 */
router.post(
  '/register',
  requireCsrf,
  body('email').isEmail(),
  body('name').notEmpty(),
  body('password').isLength({ min: 8 }),
  asyncHandler(async (req, res) => {
    handleValidation(req);

    const { email, name, password } = req.body;

    if (await User.findOne({ email })) {
      throw new AppError('User already exists', 409);
    }

    // Password hashing handled at model level
    const user = await User.create({ email, name, password });

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
 * @access  Public (CSRF Protected)
 */
router.post(
  '/login',
  requireCsrf,
  body('email').isEmail(),
  body('password').notEmpty(),
  asyncHandler(async (req, res) => {
    handleValidation(req);

    const user = await User.findOne({ email: req.body.email }).select('+password');
    if (!user || !(await user.comparePassword(req.body.password))) {
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
   AUTHENTICATED USER ACTIONS (CSRF PROTECTED)
  })
);

router.patch(
  '/preferences',
  authMiddleware,
  requireCsrf,
  asyncHandler(async (req, res) => {
    Object.assign(req.user.preferences, req.body);
    await req.user.save();

    res.status(200).json({
      message: 'Preferences updated successfully',
      preferences: req.user.preferences,
    });
  })
);

router.post(
  '/logout',
  authMiddleware,
  requireCsrf,
  asyncHandler(async (req, res) => {
    res.status(200).json({ message: 'Logged out successfully' });
  })
);

router.delete(
  '/revoke',
  authMiddleware,
  requireCsrf,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;

    await googleAuthService.revokeAllUserTokens(userId).catch(() => {});
    await User.deleteOne({ _id: userId });

    res.status(200).json({ message: 'Account deleted successfully' });
  })
);

module.exports = router;
