const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

const googleAuthService = require('../services/googleAuth');
const { authMiddleware } = require('../middleware/auth');
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

/* =====================================================
   PROTECTED ROUTES (JWT REQUIRED)
    });
  })
);

/**
 * PATCH /preferences
 */
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
  }
});

module.exports = router;
