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
const User = require('../models/User');

const router = express.Router();

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

/* =====================================================
   Helpers

    const tokens = await googleAuthService.getTokens(code);
    const userInfo = await googleAuthService.getUserInfo(tokens.access_token);
    const user = await googleAuthService.createOrUpdateUser(userInfo, tokens);

    // ✅ JWT ACCESS TOKEN ISSUED
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

/**
 * POST /google/callback (API)
 */
router.post(
  '/google/callback',
  body('code').notEmpty(),
  asyncHandler(async (req, res) => {
    handleValidation(req);

    const tokens = await googleAuthService.getTokens(req.body.code);
    const userInfo = await googleAuthService.getUserInfo(tokens.access_token);
    const user = await googleAuthService.createOrUpdateUser(
      userInfo,
      tokens
    );

    // ✅ JWT ACCESS TOKEN ISSUED
    const accessToken = generateAccessToken(user._id);

    res.status(200).json({
      token: accessToken,
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
   EMAIL / PASSWORD AUTH (JWT BASED)
    });
  }
}));

/**
 * PATCH /preferences
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
   AUTHENTICATED USER ACTIONS (CSRF PROTECTED)
   ===================================================== */

// Get current user profile
router.get('/profile', authMiddleware, asyncHandler(async (req, res) => {
  res.status(200).json({
    user: {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      picture: req.user.picture,
      preferences: req.user.preferences,
      is2FAEnabled: req.user.is2FAEnabled
    }
  });
}));

router.patch(
  '/preferences',
  authMiddleware,
  body('scanFrequency')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'manual']),
  body('emailCategories').optional().isArray(),
  body('theme').optional().isIn(['breach-dark', 'security-blue', 'high-contrast']),
  body('language').optional().isIn(['en', 'es', 'hi']),
  asyncHandler(async (req, res) => {
    handleValidation(req);

    const user = req.user;
    const { scanFrequency, emailCategories, notifications, theme, language } = req.body;

    if (scanFrequency) user.preferences.scanFrequency = scanFrequency;
    if (emailCategories) user.preferences.emailCategories = emailCategories;
    if (notifications !== undefined) user.preferences.notifications = notifications;
    if (theme) user.preferences.theme = theme;
    if (language) user.preferences.language = language;

    await user.save();

    res.status(200).json({
      message: 'Preferences updated successfully',
      preferences: req.user.preferences,
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

/**
 * POST /logout
 * (JWT is stateless → client just deletes token)
 */
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

/**
 * DELETE /revoke
 */
router.delete(
  '/revoke',
  authMiddleware,
  requireCsrf,
  asyncHandler(async (req, res) => {
    await User.deleteOne({ _id: req.user._id });

    res.status(200).json({
      message: 'Account and all data deleted successfully',
    });
  } catch (error) {
    console.error('Revoke error:', error);
    securityLogger.logSuspiciousActivity(ip, 'Account deletion failed', error.message);
    res.status(500).json({ message: 'Failed to revoke access completely' });
  }
});

module.exports = router;
