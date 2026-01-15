const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

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

const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../errors/AppError');

// Get Google OAuth URL - Apply strict rate limiting to prevent abuse
router.get('/google/url', authStrictLimiter, loginAttemptTracker, wrapAuthResponse(async (req, res) => {
  try {
    const authUrl = googleAuthService.getAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ message: 'Failed to generate authentication URL' });
  }
}));

// Get Google re-authorization URL (clears old tokens and forces new consent)
router.get('/google/reauth-url', authMiddleware, authModerateLimiter, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Clear old tokens to force fresh OAuth
    await googleAuthService.clearUserTokens(userId);
    
    const authUrl = googleAuthService.getAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating reauth URL:', error);
    res.status(500).json({ message: 'Failed to generate re-authorization URL' });
  }
});

// Handle Google OAuth callback (GET request from Google) - Critical endpoint with strict rate limiting
router.get('/google/callback', authStrictLimiter, loginAttemptTracker, wrapAuthResponse(async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  
  try {
    const { code, error } = req.query;

    if (error) {
      securityLogger.logOAuthCallback(null, ip, false, error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=${error}`);
    }

/* =====================================================
   Utility: Validation Error Handler

/* =====================================================
   GOOGLE OAUTH ROUTES

/**
 * @route   GET /api/auth/google/url
 * @desc    Get Google OAuth URL
 * @access  Public
 */
router.get('/google/url', (req, res) => {
  const url = googleAuthService.getConnectionUrl();
  res.json({ authUrl: url });
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authMiddleware, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      picture: req.user.picture,
      role: req.user.role,
      preferences: req.user.preferences,
      lastEmailScan: req.user.lastEmailScan,
    }
  });
});

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

    const tokens = await googleAuthService.getTokens(req.body.code);
    const userInfo = await googleAuthService.getUserInfo(tokens.access_token);
    const user = await googleAuthService.createOrUpdateUser(userInfo, tokens);

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

    const jwtToken = googleAuthService.generateJWT(user._id);

    // Log detailed login activity
    await logActivity(user._id, 'LOGIN', 'Logged in via Google', req, 'success', {
      provider: 'google',
      email: user.email
    });

    res.status(200).json({
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    });
  } catch (error) {
    console.error('Google callback error:', error);
    securityLogger.logOAuthCallback(null, ip, false, error.message);
    
    res.status(400).json({ 
      message: error.message || 'Authentication failed'
    });
  }
})); 
      message: error.message || 'Authentication failed'
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

    const jwtToken = googleAuthService.generateJWT(user._id);

    await logActivity(user._id, 'LOGIN', 'Logged in via Email', req, 'success', {
      provider: 'email',
      email: user.email
    });

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

router.patch(
  '/preferences',
  authMiddleware,
  body('scanFrequency')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'manual']),
  body('emailCategories').optional().isArray(),
  body('notifications').optional().isBoolean(),
  body('theme').optional().isIn(['light', 'dark', 'custom']),
  body('customTheme').optional().isObject(),
  body('whitelist').optional().isArray(),
  body('blacklist').optional().isArray(),
  asyncHandler(async (req, res) => {
    handleValidation(req);

    const user = req.user;
    const { scanFrequency, emailCategories, notifications, theme, customTheme, whitelist, blacklist } = req.body;

    if (scanFrequency) user.preferences.scanFrequency = scanFrequency;
    if (emailCategories)
      user.preferences.emailCategories = emailCategories;
    if (notifications !== undefined)
      user.preferences.notifications = notifications;
    if (theme) user.preferences.theme = theme;
    if (customTheme) {
      user.preferences.customTheme = {
        ...user.preferences.customTheme,
        ...customTheme
      };
    }
    if (whitelist) user.preferences.whitelist = whitelist;
    if (blacklist) user.preferences.blacklist = blacklist;

    await user.save();

    res.status(200).json({
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Preferences update error:', error);
    res.status(500).json({ message: 'Failed to update preferences' });
  }
});

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

// Revoke access (revoke OAuth tokens and delete user account and data) - Strict rate limiting for critical operation
router.delete('/revoke', authMiddleware, authStrictLimiter, async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  
  try {
    const userId = req.user._id;
    const userEmail = req.user.email;
    
    console.log(`🔄 Starting revoke process for user: ${userEmail}`);
    
    // Step 1: Revoke OAuth tokens from Google
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
    console.log(`🗑️ Deleted user account: ${userEmail}`);
    
    // Log account deletion
    securityLogger.logAccountDeletion(userId, userEmail, ip, {
      subscriptions: deletedSubs.deletedCount,
      emails: deletedEmails.deletedCount
    });
    
    console.log('✅ Complete revoke process finished');
    
    res.json({ 
      message: 'Access revoked successfully. Your account and all data have been deleted.',
      deletedData: {
        subscriptions: deletedSubs.deletedCount,
        emails: deletedEmails.deletedCount,
      },
    });
  } catch (error) {
    console.error('Revoke error:', error);
    securityLogger.logSuspiciousActivity(ip, 'Account deletion failed', error.message);
    res.status(500).json({ message: 'Failed to revoke access completely' });
  }
});
  }
});

module.exports = router;
