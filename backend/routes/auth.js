const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const googleAuthService = require('../services/googleAuth');
const { authMiddleware } = require('../middleware/auth');
const ERROR_CODES = require('../config/errorCodes');

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

    const user = await User.findOne({ email: req.body.email }).select('+password');

    if (!user || !user.password) {
      securityLogger.logAuthFailure(email, ip, 'Invalid credentials or OAuth-only account');
      throw new AppError('Invalid credentials', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      securityLogger.logAuthFailure(email, ip, 'Invalid password');
      throw new AppError('Invalid credentials', 401);
    }

    const isPasswordValid = await user.comparePassword(req.body.password);

    if (!isPasswordValid) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      }

      await user.save();
      throw new AppError('Invalid credentials', 401);
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

module.exports = router;
*/

module.exports = router;

