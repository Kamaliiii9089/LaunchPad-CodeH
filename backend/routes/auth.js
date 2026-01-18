const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const User = require('../models/User');
const googleAuthService = require('../services/googleAuth');
const { authMiddleware } = require('../middleware/auth');
const ERROR_CODES = require('../config/errorCodes');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../errors/AppError');

const router = express.Router();

/* =====================================================
   CONFIGURATION CONSTANTS
===================================================== */

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/* =====================================================
   RATE LIMITERS
===================================================== */

// Define authStrictLimiter (was missing)
const authStrictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/* =====================================================
   HELPER FUNCTIONS
===================================================== */

// Generate Access Token (was missing)
const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

// Security Logger (was missing - create a simple version)
const securityLogger = {
  logAuthFailure: (email, ip, message) => {
    console.warn(`[AUTH FAILURE] ${message} | Email: ${email} | IP: ${ip}`);
  },
  logAuthSuccess: (userId, email, ip, method) => {
    console.log(`[AUTH SUCCESS] ${method} | User: ${userId} | Email: ${email} | IP: ${ip}`);
  },
};

// Activity Logger (was missing)
const logActivity = async (userId, action, description, req, status, metadata = {}) => {
  console.log(`[ACTIVITY] User: ${userId} | Action: ${action} | Status: ${status}`);
  // You can implement database logging here if needed
};

// Login Attempt Tracker Middleware (was missing)
const loginAttemptTracker = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  
  if (!email) {
    return next();
  }

  const user = await User.findOne({ email });
  
  if (user && user.lockUntil && user.lockUntil > new Date()) {
    const remainingTime = Math.ceil((user.lockUntil - new Date()) / 60000);
    throw new AppError(
      `Account is locked. Try again in ${remainingTime} minutes.`,
      423
    );
  }
  
  next();
});

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
      .withMessage(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    body('name').trim().notEmpty().withMessage('Name is required'),
  ],
  asyncHandler(async (req, res) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      securityLogger.logAuthFailure(null, ip, 'Registration validation failed');
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      securityLogger.logAuthFailure(email, ip, 'Registration failed - email already exists');
      return res.status(400).json({
        message: 'Email already registered. Please login instead.',
      });
    }

    // Create new user
    const user = await User.create({
      email,
      password, // Will be hashed by pre-save hook
      name,
    });

    // Generate JWT token
    const accessToken = generateAccessToken(user._id);

    // Log registration activity
    await logActivity(user._id, 'REGISTRATION', 'Account created via email', req, 'success', {
      provider: 'email',
      email: user.email,
    });

    securityLogger.logAuthSuccess(user._id, user.email, ip, 'email-registration');

    res.status(201).json({
      token: accessToken, // Fixed: was using undefined 'jwtToken'
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
      message: 'Account created successfully',
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
    body('password').notEmpty().withMessage('Password is required'),
  ],
  asyncHandler(async (req, res) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const { email, password } = req.body; // Fixed: extract variables properly

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      securityLogger.logAuthFailure(null, ip, 'Login validation failed');
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');

    if (!user || !user.password) {
      securityLogger.logAuthFailure(email, ip, 'Invalid credentials or OAuth-only account');
      throw new AppError('Invalid credentials', 401);
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Increment failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      }

      await user.save();
      securityLogger.logAuthFailure(email, ip, 'Invalid password');
      throw new AppError('Invalid credentials', 401);
    }

    // Reset failed attempts on successful login
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    // Generate token
    const accessToken = generateAccessToken(user._id);

    securityLogger.logAuthSuccess(user._id, user.email, ip, 'email-login');

    res.status(200).json({
      token: accessToken, // Fixed: was using undefined 'jwtToken'
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
    res.status(200).json({
      message: 'Logged out successfully',
    });
  })
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    });
  })
);

module.exports = router;