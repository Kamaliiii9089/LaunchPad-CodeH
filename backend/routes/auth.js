const express = require('express');
const { body, validationResult } = require('express-validator');

const googleAuthService = require('../services/googleAuth');
const { authMiddleware } = require('../middleware/auth');

const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../errors/AppError');
const AuthError = require('../errors/AuthError');

const router = express.Router();

/**
 * GET Google OAuth URL
 */
router.get('/google/url', asyncHandler(async (req, res) => {
  const authUrl = googleAuthService.getAuthUrl();
  res.json({ authUrl });
}));

/**
 * GET Google Re-Authorization URL
 */
router.get('/google/reauth-url', authMiddleware, asyncHandler(async (req, res) => {
  await googleAuthService.clearUserTokens(req.user._id);
  const authUrl = googleAuthService.getAuthUrl();
  res.json({ authUrl });
}));

/**
 * Google OAuth Callback (GET - browser redirect)
 */
router.get('/google/callback', asyncHandler(async (req, res) => {
  const { code, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (error) {
    return res.redirect(`${frontendUrl}/login?error=${error}`);
  }

  if (!code) {
    return res.redirect(`${frontendUrl}/login?error=no_code`);
  }

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
        picture: user.picture
      })
    )}`
  );
}));

/**
 * Google OAuth Callback (POST - API)
 */
router.post(
  '/google/callback',
  body('code').notEmpty().withMessage('Authorization code is required'),
  asyncHandler(async (req, res) => {
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
  })
);

/**
 * Get Current User Profile
 */
router.get('/profile', authMiddleware, asyncHandler(async (req, res) => {
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
}));

/**
 * Update User Preferences
 */
router.patch(
  '/preferences',
  authMiddleware,
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

  try {
    await googleAuthService.revokeAllUserTokens(userId);
  } catch (err) {
    console.error('Token revocation failed, continuing cleanup');
  }

  const Subscription = require('../models/Subscription');
  const Email = require('../models/Email');

  const deletedSubs = await Subscription.deleteMany({ userId });
  const deletedEmails = await Email.deleteMany({ userId });

  await req.user.deleteOne();

  res.json({
    message: 'Access revoked successfully. Account and data deleted.',
    deletedData: {
      subscriptions: deletedSubs.deletedCount,
      emails: deletedEmails.deletedCount
    }
  });
}));

module.exports = router;
