const express = require('express');
const router = express.Router();
const hibpService = require('../services/hibpService');
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const Subscription = require('../models/Subscription');

// GET /api/breach-check/status - Get current breach check status
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const subscriptions = await Subscription.find({
      userId: req.user.id,
      isActive: true
    }).sort({ breachStatus: -1, serviceName: 1 });

    const breachedSubscriptions = subscriptions.filter(sub =>
      sub.breachStatus && sub.breachStatus.isBreached
    );

    res.json({
      success: true,
      data: {
        lastChecked: user.lastBreachCheck,
        securityScore: user.securityScore || null,
        totalSubscriptions: subscriptions.length,
        breachedSubscriptions: breachedSubscriptions.length,
        safeSubscriptions: subscriptions.length - breachedSubscriptions.length,
        subscriptions: subscriptions.map(sub => ({
          id: sub._id,
          serviceName: sub.serviceName,
          domain: sub.domain,
          category: sub.category,
          emailCount: sub.emailCount,
          firstEmail: sub.firstEmail,
          lastEmail: sub.lastEmail,
          isDormant: sub.isDormant,
          breachStatus: sub.breachStatus || {
            isBreached: false,
            lastChecked: null
          }
        }))
      }
    });
  } catch (error) {
    console.error('Error getting breach status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get breach status',
      error: error.message
    });
  }
});

const { createNotification, notifyAdmins } = require('../services/notificationService');

// ... imports

// POST /api/breach-check/run - Run HIBP breach check
router.post('/run', authMiddleware, async (req, res) => {
  try {
    console.log(`🔐 Starting HIBP breach check for user ${req.user.id}`);

    // Check if API key is configured
    if (!process.env.HIBP_API_KEY) {
      return res.status(400).json({
        success: false,
        message: 'HIBP API key not configured. Please contact administrator.',
        error: 'HIBP_API_KEY_MISSING'
      });
    }

    // Run the breach check
    const results = await hibpService.runBreachCheckForUser(req.user.id);

    // Generate security recommendations
    const recommendations = hibpService.generateSecurityRecommendations(results);

    // NOTIFICATION LOGIC
    if (results.breachesFound > 0) {
      // 1. Notify User
      await createNotification(
        req.user.id,
        '🚨 Security Breach Detected!',
        `We found ${results.breachesFound} breaches affecting your accounts. Details: ${results.breachedServices.join(', ')}.`,
        'danger',
        '/breach-check',
        { breaches: results.breachesFound.toString() }
      );

      // 2. Notify Admins (System Alert)
      await notifyAdmins(
        'High Risk Breach Detected',
        `User ${req.user.id} has ${results.breachesFound} confirmed breaches.`,
        'warning'
      );
    } else {
      await createNotification(
        req.user.id,
        '✅ Security Check Passed',
        'No data breaches found for your accounts.',
        'success',
        '/breach-check'
      );
    }

    res.json({
      success: true,
      message: `Breach check completed. Found ${results.breachesFound} breaches affecting ${results.breachedServices} of your services.`,
      data: {
        ...results,
        recommendations
      }
    });

  } catch (error) {
    console.error('Error running breach check:', error);

    if (error.message === 'HIBP_RATE_LIMITED') {
      return res.status(429).json({
        success: false,
        message: 'Rate limited by HIBP. Please try again in a few minutes.',
        error: 'RATE_LIMITED'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to run breach check',
      error: error.message
    });
  }
});

// GET /api/breach-check/details/:subscriptionId - Get detailed breach info for a subscription
router.get('/details/:subscriptionId', authMiddleware, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      _id: req.params.subscriptionId,
      userId: req.user.id
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (!subscription.breachStatus || !subscription.breachStatus.isBreached) {
      return res.status(404).json({
        success: false,
        message: 'No breach data found for this subscription'
      });
    }

    // Generate action recommendations based on breach severity
    const actions = generateBreachActions(subscription.breachStatus);

    res.json({
      success: true,
      data: {
        subscription: {
          serviceName: subscription.serviceName,
          domain: subscription.domain,
          category: subscription.category
        },
        breach: subscription.breachStatus,
        recommendedActions: actions
      }
    });

  } catch (error) {
    console.error('Error getting breach details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get breach details',
      error: error.message
    });
  }
});

// POST /api/breach-check/action/:subscriptionId - Mark action as taken
router.post('/action/:subscriptionId', authMiddleware, async (req, res) => {
  try {
    const { action, notes } = req.body;

    const subscription = await Subscription.findOne({
      _id: req.params.subscriptionId,
      userId: req.user.id
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Update breach status with action taken
    const updatedBreachStatus = {
      ...subscription.breachStatus,
      actionsTaken: [
        ...(subscription.breachStatus.actionsTaken || []),
        {
          action,
          notes,
          timestamp: new Date()
        }
      ]
    };

    await Subscription.findByIdAndUpdate(req.params.subscriptionId, {
      breachStatus: updatedBreachStatus
    });

    res.json({
      success: true,
      message: `Action "${action}" recorded successfully`,
      data: {
        actionsTaken: updatedBreachStatus.actionsTaken
      }
    });

  } catch (error) {
    console.error('Error recording breach action:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record action',
      error: error.message
    });
  }
});

// GET /api/breach-check/stats - Get security statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const subscriptions = await Subscription.find({
      userId: req.user.id,
      isActive: true
    });

    const user = await User.findById(req.user.id);

    const stats = {
      totalServices: subscriptions.length,
      breachedServices: subscriptions.filter(s => s.breachStatus?.isBreached).length,
      safeServices: subscriptions.filter(s => !s.breachStatus?.isBreached).length,
      securityScore: user.securityScore || null,
      lastChecked: user.lastBreachCheck,
      severityBreakdown: {
        high: subscriptions.filter(s => s.breachStatus?.severity === 'high').length,
        medium: subscriptions.filter(s => s.breachStatus?.severity === 'medium').length,
        low: subscriptions.filter(s => s.breachStatus?.severity === 'low').length
      },
      actionsTaken: subscriptions.reduce((count, sub) => {
        return count + (sub.breachStatus?.actionsTaken?.length || 0);
      }, 0)
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error getting breach stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get security statistics',
      error: error.message
    });
  }
});

function generateBreachActions(breachStatus) {
  const actions = [];

  // Always recommend password change for breaches
  actions.push({
    id: 'change_password',
    title: '🔑 Change Password',
    description: 'Update your password immediately to secure your account',
    priority: 'high',
    category: 'security'
  });

  // Recommend 2FA if passwords were exposed
  if (breachStatus.dataClasses?.includes('Passwords')) {
    actions.push({
      id: 'enable_2fa',
      title: '🛡️ Enable Two-Factor Authentication',
      description: 'Add an extra layer of security to prevent unauthorized access',
      priority: 'high',
      category: 'security'
    });
  }

  // Account monitoring for high severity breaches
  if (breachStatus.severity === 'high') {
    actions.push({
      id: 'monitor_account',
      title: '👁️ Monitor Account Activity',
      description: 'Check for unusual login attempts or account changes',
      priority: 'medium',
      category: 'monitoring'
    });
  }

  // Data review if personal info was exposed
  const personalDataClasses = ['Email addresses', 'Names', 'Phone numbers', 'Dates of birth'];
  const hasPersonalData = breachStatus.dataClasses?.some(dc => personalDataClasses.includes(dc));

  if (hasPersonalData) {
    actions.push({
      id: 'review_data',
      title: '📋 Review Account Data',
      description: 'Check what personal information is stored and remove unnecessary data',
      priority: 'medium',
      category: 'privacy'
    });
  }

  // Account deletion option for dormant accounts
  actions.push({
    id: 'delete_account',
    title: '🗑️ Delete Account',
    description: 'Consider closing the account if you no longer use this service',
    priority: 'low',
    category: 'cleanup'
  });

  // Session revocation
  actions.push({
    id: 'revoke_sessions',
    title: '🚫 Revoke All Sessions',
    description: 'Log out from all devices and locations',
    priority: 'medium',
    category: 'security'
  });

  return actions;
}

module.exports = router;
