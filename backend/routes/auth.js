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
const AuthError = require('../errors/AuthError');

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

// Handle Google OAuth callback (GET request from Google) - Critical endpoint with strict rate limiting
router.get('/google/callback', authStrictLimiter, loginAttemptTracker, wrapAuthResponse(async (req, res) => {
  try {
    const { code, error } = req.query;

  const tokens = await googleAuthService.getTokens(code);
  const userInfo = await googleAuthService.getUserInfo(tokens.access_token);
  const user = await googleAuthService.createOrUpdateUser(userInfo, tokens);

  const jwtToken = googleAuthService.generateJWT(user._id);

    // Exchange code for tokens
    const tokens = await googleAuthService.getTokens(code);
    
    // Get user info from Google
    const userInfo = await googleAuthService.getUserInfo(tokens.access_token);
    
    // Create or update user in database
    const user = await googleAuthService.createOrUpdateUser(userInfo, tokens);
    
    // Generate JWT token
    const jwtToken = googleAuthService.generateJWT(user._id);
    
    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/login/callback?token=${jwtToken}&user=${encodeURIComponent(JSON.stringify({
      id: user._id,
      email: user.email,
      name: user.name,
      picture: user.picture
    }))}`);
  } catch (error) {
    console.error('Google callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error.message || 'Authentication failed')}`);
  }
}));

// Handle Google OAuth callback (POST request for API) - Critical endpoint with strict rate limiting
router.post('/google/callback', authStrictLimiter, loginAttemptTracker, [
  body('code').notEmpty().withMessage('Authorization code is required')
], wrapAuthResponse(async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { code } = req.body;

    const tokens = await googleAuthService.getTokens(code);
    const userInfo = await googleAuthService.getUserInfo(tokens.access_token);
    const user = await googleAuthService.createOrUpdateUser(userInfo, tokens);

    const jwtToken = googleAuthService.generateJWT(user._id);

    res.json({
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture
      }
    });
  } catch (error) {
    console.error('Google callback error:', error);
    res.status(400).json({ 
      message: error.message || 'Authentication failed'
    });
  }
}));

// Get current user profile - Moderate rate limiting for authenticated users
router.get('/profile', authMiddleware, authModerateLimiter, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        picture: req.user.picture,
        preferences: req.user.preferences,
        lastEmailScan: req.user.lastEmailScan
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
});

// Update user preferences - Moderate rate limiting
router.patch('/preferences', authMiddleware, authModerateLimiter, [
  body('scanFrequency').optional().isIn(['daily', 'weekly', 'monthly', 'manual']),
  body('emailCategories').optional().isArray(),
  body('notifications').optional().isBoolean(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { scanFrequency, emailCategories, notifications } = req.body;
    const user = req.user;

    if (scanFrequency) user.preferences.scanFrequency = scanFrequency;
    if (emailCategories) user.preferences.emailCategories = emailCategories;
    if (notifications !== undefined) user.preferences.notifications = notifications;

    await user.save();

    res.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });
  })
);

/**
 * Logout
 */
router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  res.json({ message: 'Logged out successfully' });
}));

/**
 * Revoke Gmail Access Only
 */
router.post('/revoke-gmail', authMiddleware, asyncHandler(async (req, res) => {
  const revokeResult = await googleAuthService.revokeAllUserTokens(req.user._id);

  res.json({
    message: 'Gmail access revoked successfully. You can re-authenticate anytime.',
    revokeResult
  });
}));

/**
 * Revoke Account & All Data
 */
router.delete('/revoke', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user._id;

// Logout (invalidate token on client side) - Moderate rate limiting
router.post('/logout', authMiddleware, authModerateLimiter, (req, res) => {
  try {
    await googleAuthService.revokeAllUserTokens(userId);
  } catch (err) {
    console.error('Token revocation failed, continuing cleanup');
  }

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
  try {
    const userId = req.user._id;
    
    console.log(`🔄 Starting revoke process for user: ${req.user.email}`);
    
    // Step 1: Revoke OAuth tokens from Google
    try {
      const revokeResult = await googleAuthService.revokeAllUserTokens(userId);
      console.log('Token revocation result:', revokeResult);
    } catch (tokenError) {
      console.error('Token revocation failed, but continuing with data cleanup:', tokenError);
      // Continue with cleanup even if token revocation fails
    }
  });
}));

module.exports = router;
