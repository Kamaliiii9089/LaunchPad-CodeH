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
const securityLogger = require('../services/securityLogger');

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
  const ip = req.ip || req.connection.remoteAddress;
  
  try {
    const { code, error } = req.query;

    if (error) {
      securityLogger.logOAuthCallback(null, ip, false, error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=${error}`);
    }

    if (!code) {
      securityLogger.logOAuthCallback(null, ip, false, 'No authorization code');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=no_code`);
    }

    // Exchange code for tokens
    const tokens = await googleAuthService.getTokens(code);
    
    // Get user info from Google
    const userInfo = await googleAuthService.getUserInfo(tokens.access_token);
    
    // Create or update user in database
    const user = await googleAuthService.createOrUpdateUser(userInfo, tokens);
    
    // Generate JWT token
    const jwtToken = googleAuthService.generateJWT(user._id);
    
    // Log successful authentication
    securityLogger.logOAuthCallback(user.email, ip, true);
    securityLogger.logAuthSuccess(user._id, user.email, ip, 'oauth');
    
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
    securityLogger.logOAuthCallback(null, ip, false, error.message);
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error.message || 'Authentication failed')}`);
  }
}));

// Handle Google OAuth callback (POST request for API) - Critical endpoint with strict rate limiting
router.post('/google/callback', authStrictLimiter, loginAttemptTracker, [
  body('code').notEmpty().withMessage('Authorization code is required')
], wrapAuthResponse(async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      securityLogger.logAuthFailure(null, ip, 'Validation failed');
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { code } = req.body;

    // Exchange code for tokens
    const tokens = await googleAuthService.getTokens(code);
    
    // Get user info from Google
    const userInfo = await googleAuthService.getUserInfo(tokens.access_token);
    
    // Create or update user in database
    const user = await googleAuthService.createOrUpdateUser(userInfo, tokens);
    
    // Generate JWT token
    const jwtToken = googleAuthService.generateJWT(user._id);
    
    // Log successful authentication
    securityLogger.logOAuthCallback(user.email, ip, true);
    securityLogger.logAuthSuccess(user._id, user.email, ip, 'oauth');
    
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
    securityLogger.logOAuthCallback(null, ip, false, error.message);
    
    res.status(400).json({ 
      message: error.message || 'Authentication failed'
    });
  }
})); 
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
  body('notifications').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
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
      const revokeResult = await googleAuthService.revokeAllUserTokens(userId);
      console.log('Token revocation result:', revokeResult);
    } catch (tokenError) {
      console.error('Token revocation failed, but continuing with data cleanup:', tokenError);
      // Continue with cleanup even if token revocation fails
    }
    
    // Step 2: Delete user's subscriptions
    const Subscription = require('../models/Subscription');
    const deletedSubs = await Subscription.deleteMany({ userId });
    console.log(`🗑️ Deleted ${deletedSubs.deletedCount} subscriptions`);
    
    // Step 3: Delete user's emails
    const Email = require('../models/Email');
    const deletedEmails = await Email.deleteMany({ userId });
    console.log(`🗑️ Deleted ${deletedEmails.deletedCount} emails`);
    
    // Step 4: Delete user account
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
        emails: deletedEmails.deletedCount
      }
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
