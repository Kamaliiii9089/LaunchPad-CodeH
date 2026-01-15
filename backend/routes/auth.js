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

const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../errors/AppError');
const User = require('../models/User');

const router = express.Router();

    if (!code) {
      securityLogger.logOAuthCallback(null, ip, false, 'No authorization code');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=no_code`);
    }

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
        picture: user.picture,
      },
    });
  })
);

/* =====================================================
   EMAIL / PASSWORD AUTH (CSRF PROTECTED)
    });
  }
}));

/* =====================================================
   AUTHENTICATED USER ROUTES
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        picture: req.user.picture,
        preferences: req.user.preferences,
      },
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
 */
router.post(
  '/logout',
  authMiddleware,
  requireCsrf,
  asyncHandler(async (req, res) => {
    res.status(200).json({ message: 'Logged out successfully' });
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
    const userId = req.user._id;

    await googleAuthService.revokeAllUserTokens(userId).catch(() => {});
    await User.deleteOne({ _id: userId });

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
