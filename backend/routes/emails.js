const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const gmailService = require('../services/gmailService');
const User = require('../models/User');
const Email = require('../models/Email');
const { logActivity } = require('../services/activityLogger');

const router = express.Router();

// Trigger email scan
router.post('/scan', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { daysBack = 90, fullScan = false } = req.body; // Reduced default to 90 days for better performance

    console.log('=== EMAIL SCAN DEBUG ===');
    console.log('User ID:', userId);
    console.log('User Email:', req.user.email);
    console.log('Has Refresh Token:', !!req.user.refreshToken);
    console.log('Has Access Token:', !!req.user.accessToken);
    console.log('Token Expiry:', req.user.tokenExpiry);
    console.log('Refresh Token length:', req.user.refreshToken?.length || 0);
    console.log('Access Token length:', req.user.accessToken?.length || 0);
    console.log('========================');

    // Check if user has any Gmail tokens
    if (!req.user.refreshToken && !req.user.accessToken) {
      console.log('❌ No tokens found for user');
      const googleAuthService = require('../services/googleAuth');
      const authUrl = googleAuthService.getAuthUrl();

      return res.status(403).json({
        message: 'Gmail access not authorized. Please authenticate with Google to enable email scanning.',
        code: 'GMAIL_NOT_AUTHORIZED',
        authUrl: authUrl
      });
    }

    console.log('✅ User has tokens, proceeding with scan');

    // Prevent too frequent scans
    if (req.user.lastEmailScan) {
      const timeSinceLastScan = Date.now() - req.user.lastEmailScan.getTime();
      const minInterval = fullScan ? 3600000 : 300000; // 1 hour for full scan, 5 min for regular

      if (timeSinceLastScan < minInterval) {
        const waitTime = Math.ceil((minInterval - timeSinceLastScan) / 60000);
        return res.status(429).json({
          message: `Please wait ${waitTime} minutes before scanning again.`,
          code: 'RATE_LIMITED',
          waitTime: waitTime
        });
      }
    }

    console.log('Starting email scan for user:', userId);

    // Start the scan
    const emails = await gmailService.scanForSubscriptions(userId, parseInt(daysBack));

    // Update user's last scan time
    await User.findByIdAndUpdate(userId, { lastEmailScan: new Date() });

    // Log activity
    await logActivity(userId, 'SCAN_COMPLETED', `Scanned ${emails.length} emails`, req, 'info', {
      count: emails.length,
      daysBack: parseInt(daysBack)
    });

    res.json({
      message: 'Email scan completed successfully',
      results: {
        emailsProcessed: emails.length,
        newSubscriptions: emails.filter(e => e.processingResults?.extractedService).length,
        scanDate: new Date()
      }
    });
  } catch (error) {
    console.error('Email scan error:', error);

    // Handle Gmail re-authorization requirement
    if (error.message === 'GMAIL_REAUTH_REQUIRED') {
      const googleAuthService = require('../services/googleAuth');

      // Clear old tokens to force fresh OAuth flow
      await googleAuthService.clearUserTokens(req.user._id);

      const reauthUrl = googleAuthService.getAuthUrl();

      return res.status(403).json({
        message: 'Gmail access requires additional permissions. Please re-authorize the application.',
        code: 'GMAIL_REAUTH_REQUIRED',
        reauthUrl: reauthUrl
      });
    }

    // Handle specific error types
    if (error.message.includes('Gmail')) {
      return res.status(400).json({
        message: 'Gmail API error. Please re-authenticate with Google.',
        error: error.message,
        code: 'GMAIL_API_ERROR'
      });
    }

    if (error.message.includes('Token')) {
      return res.status(401).json({
        message: 'Google authentication expired. Please re-authenticate.',
        error: error.message,
        code: 'TOKEN_EXPIRED'
      });
    }

    res.status(500).json({
      message: 'Email scan failed',
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
});

// Get scan status
router.get('/scan/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get scan statistics
    const totalEmails = await Email.countDocuments({ userId });
    const processedEmails = await Email.countDocuments({ userId, processed: true });
    const recentEmails = await Email.countDocuments({
      userId,
      receivedDate: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    res.json({
      lastScan: req.user.lastEmailScan,
      statistics: {
        totalEmails,
        processedEmails,
        recentEmails,
        processingRate: totalEmails > 0 ? (processedEmails / totalEmails) * 100 : 0
      },
      canScan: !req.user.lastEmailScan ||
        (Date.now() - req.user.lastEmailScan.getTime()) > 300000 // 5 minutes
    });
  } catch (error) {
    console.error('Get scan status error:', error);
    res.status(500).json({ message: 'Failed to fetch scan status' });
  }
});

// Get recent emails
router.get('/recent', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      limit = 50,
      category,
      processed,
      page = 1
    } = req.query;

    const filter = { userId };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (processed !== undefined) {
      filter.processed = processed === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const emails = await Email.find(filter)
      .sort({ receivedDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('messageId from subject snippet receivedDate category processed')
      .lean();

    const totalCount = await Email.countDocuments(filter);

    res.json({
      emails,
      pagination: {
        currentPage: parseInt(page),
        totalCount,
        hasMore: skip + emails.length < totalCount
      }
    });
  } catch (error) {
    console.error('Get recent emails error:', error);
    res.status(500).json({ message: 'Failed to fetch recent emails' });
  }
});

// Get email details
router.get('/:messageId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;

    const email = await Email.findOne({
      userId,
      messageId
    })
      .populate('subscriptionId', 'serviceName domain status')
      .lean();

    if (!email) {
      return res.status(404).json({ message: 'Email not found' });
    }

    res.json({ email });
  } catch (error) {
    console.error('Get email details error:', error);
    res.status(500).json({ message: 'Failed to fetch email details' });
  }
});

// Reprocess specific email
router.post('/:messageId/reprocess', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;

    const email = await Email.findOne({ userId, messageId });

    if (!email) {
      return res.status(404).json({ message: 'Email not found' });
    }

    // Re-analyze the email
    const analysis = await gmailService.analyzeEmailContent({
      from: email.from,
      subject: email.subject,
      snippet: email.snippet,
      body: email.body
    });

    // Update email record
    email.category = analysis.category;
    email.processed = true;
    email.processingResults = {
      confidence: analysis.confidence,
      extractedService: analysis.service,
      keywords: analysis.keywords,
      urls: analysis.urls,
      aiAnalysis: analysis.aiAnalysis
    };

    await email.save();

    // Create or update subscription if relevant
    if (analysis.service && analysis.confidence > 0.6) {
      await gmailService.createOrUpdateSubscription(userId, analysis.service, email);
    }

    res.json({
      message: 'Email reprocessed successfully',
      email: email
    });
  } catch (error) {
    console.error('Reprocess email error:', error);
    res.status(500).json({ message: 'Failed to reprocess email' });
  }
});

// Archive email
router.patch('/:messageId/archive', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;

    const email = await Email.findOneAndUpdate(
      { userId, messageId },
      { isArchived: true },
      { new: true }
    );

    if (!email) {
      return res.status(404).json({ message: 'Email not found' });
    }

    res.json({ message: 'Email archived successfully' });
  } catch (error) {
    console.error('Archive email error:', error);
    res.status(500).json({ message: 'Failed to archive email' });
  }
});

// Get email categories summary
router.get('/categories/summary', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const categorySummary = await Email.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          processed: { $sum: { $cond: ['$processed', 1, 0] } },
          recent: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    '$receivedDate',
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({ categorySummary });
  } catch (error) {
    console.error('Get categories summary error:', error);
    res.status(500).json({ message: 'Failed to fetch categories summary' });
  }
});

module.exports = router;
