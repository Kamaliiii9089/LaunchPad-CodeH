const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const axios = require('axios');
const { logActivity } = require('../services/activityLogger');

const router = express.Router();

// Get all subscriptions with filtering
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      category,
      status,
      search,
      sortBy = 'lastEmailReceived',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Build filter query
    const filter = { userId, isActive: true };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { serviceName: { $regex: search, $options: 'i' } },
        { domain: { $regex: search, $options: 'i' } },
        { serviceEmail: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get subscriptions
    const subscriptions = await Subscription.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalCount = await Subscription.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      subscriptions,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNextPage: parseInt(page) < totalPages,
        hasPreviousPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ message: 'Failed to fetch subscriptions' });
  }
});

// Get subscription by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const subscriptionId = req.params.id;

    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      userId,
      isActive: true
    });

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Get related emails
    const Email = require('../models/Email');
    const emails = await Email.find({
      subscriptionId: subscriptionId,
      userId
    })
      .sort({ receivedDate: -1 })
      .limit(10)
      .select('subject snippet receivedDate from category')
      .lean();

    res.json({
      subscription,
      recentEmails: emails
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ message: 'Failed to fetch subscription' });
  }
});

// Revoke access to a subscription
router.patch('/:id/revoke', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const subscriptionId = req.params.id;

    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      userId,
      isActive: true
    });

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Update subscription status
    subscription.status = 'revoked';
    await subscription.save();

    // If there's an unsubscribe URL, we could potentially make a request
    // Note: This is complex and depends on the service's API
    let revokeResult = { success: true, method: 'manual' };

    if (subscription.unsubscribeUrl) {
      try {
        // This is a simplified approach - in reality, unsubscribe mechanisms vary greatly
        await axios.get(subscription.unsubscribeUrl, { timeout: 5000 });
        revokeResult.method = 'automatic';
      } catch (error) {
        console.error('Automatic unsubscribe failed:', error.message);
        revokeResult.method = 'manual';
        revokeResult.unsubscribeUrl = subscription.unsubscribeUrl;
      }
    }

    // Log activity
    await logActivity(userId, 'REVOKE_ACCESS', `Revoked access for ${subscription.serviceName}`, req, 'warning', {
      subscriptionId: subscription._id,
      serviceName: subscription.serviceName,
      manual: revokeResult.method === 'manual'
    });

    res.json({
      message: 'Subscription access revoked',
      subscription,
      revokeResult
    });
  } catch (error) {
    console.error('Revoke subscription error:', error);
    res.status(500).json({ message: 'Failed to revoke subscription access' });
  }
});

// Grant access to a previously revoked subscription
router.patch('/:id/grant', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const subscriptionId = req.params.id;

    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      userId,
      isActive: true
    });

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Update subscription status
    subscription.status = 'active';
    await subscription.save();

    await logActivity(userId, 'GRANT_ACCESS', `Usage access granted for ${subscription.serviceName}`, req, 'success', {
      subscriptionId: subscription._id,
      serviceName: subscription.serviceName
    });

    res.json({
      message: 'Subscription access granted',
      subscription
    });
  } catch (error) {
    console.error('Grant subscription error:', error);
    res.status(500).json({ message: 'Failed to grant subscription access' });
  }
});

// Update subscription details
router.patch('/:id', [
  authMiddleware,
  body('serviceName').optional().trim().isLength({ min: 1 }),
  body('category').optional().isIn(['subscription', 'newsletter', 'verification', 'login', 'signup', 'billing', 'other']),
  body('tags').optional().isArray(),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user._id;
    const subscriptionId = req.params.id;
    const { serviceName, category, tags, description } = req.body;

    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      userId,
      isActive: true
    });

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Update allowed fields
    if (serviceName) subscription.serviceName = serviceName;
    if (category) subscription.category = category;
    if (tags) subscription.tags = tags;
    if (description !== undefined) subscription.description = description;

    await subscription.save();

    res.json({
      message: 'Subscription updated successfully',
      subscription
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ message: 'Failed to update subscription' });
  }
});

// Delete subscription
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const subscriptionId = req.params.id;

    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      userId,
      isActive: true
    });

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Soft delete - mark as inactive instead of removing
    subscription.isActive = false;
    await subscription.save();

    await logActivity(userId, 'DELETE_SUBSCRIPTION', `Deleted subscription ${subscription.serviceName}`, req, 'warning', {
      subscriptionId: subscription._id,
      serviceName: subscription.serviceName
    });

    res.json({
      message: 'Subscription deleted successfully'
    });
  } catch (error) {
    console.error('Delete subscription error:', error);
    res.status(500).json({ message: 'Failed to delete subscription' });
  }
});

// Bulk operations
router.post('/bulk', [
  authMiddleware,
  body('action').isIn(['revoke', 'grant', 'delete']),
  body('subscriptionIds').isArray({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user._id;
    const { action, subscriptionIds } = req.body;

    const subscriptions = await Subscription.find({
      _id: { $in: subscriptionIds },
      userId,
      isActive: true
    });

    if (subscriptions.length !== subscriptionIds.length) {
      return res.status(400).json({
        message: 'Some subscriptions not found or not accessible'
      });
    }

    let updateQuery;
    switch (action) {
      case 'revoke':
        updateQuery = { status: 'revoked' };
        break;
      case 'grant':
        updateQuery = { status: 'active' };
        break;
      case 'delete':
        updateQuery = { isActive: false };
        break;
    }

    const result = await Subscription.updateMany(
      { _id: { $in: subscriptionIds }, userId },
      updateQuery
    );

    res.json({
      message: `Bulk ${action} completed successfully`,
      affectedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk operation error:', error);
    res.status(500).json({ message: `Failed to perform bulk ${req.body.action}` });
  }
});

// Get subscription statistics
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await Subscription.aggregate([
      { $match: { userId: userId, isActive: true } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          revoked: { $sum: { $cond: [{ $eq: ['$status', 'revoked'] }, 1, 0] } },
          totalMonthlySpend: {
            $sum: {
              $cond: [
                { $eq: ["$financials.period", "yearly"] },
                { $divide: [{ $ifNull: ["$financials.cost", 0] }, 12] },
                { $ifNull: ["$financials.cost", 0] }
              ]
            }
          },
          byCategory: {
            $push: {
              category: '$category',
              status: '$status',
              cost: { $ifNull: ["$financials.cost", 0] },
              period: { $ifNull: ["$financials.period", "unknown"] }
            }
          }
        }
      }
    ]);

    // Process category breakdown
    let categoryBreakdown = {};
    if (stats.length > 0 && stats[0].byCategory) {
      stats[0].byCategory.forEach(item => {
        if (!categoryBreakdown[item.category]) {
          categoryBreakdown[item.category] = { active: 0, revoked: 0, total: 0, monthlyCost: 0 };
        }
        categoryBreakdown[item.category][item.status]++;
        categoryBreakdown[item.category].total++;

        // Add cost
        let itemCost = item.cost;
        if (item.period === 'yearly') itemCost /= 12;
        categoryBreakdown[item.category].monthlyCost += itemCost;
      });
    }

    res.json({
      summary: stats[0] || { total: 0, active: 0, revoked: 0 },
      categoryBreakdown
    });
  } catch (error) {
    console.error('Get subscription stats error:', error);
    res.status(500).json({ message: 'Failed to fetch subscription statistics' });
  }
});

// Search subscriptions by domain or service name
router.get('/search/:query', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const query = req.params.query;

    const subscriptions = await Subscription.find({
      userId,
      isActive: true,
      $or: [
        { serviceName: { $regex: query, $options: 'i' } },
        { domain: { $regex: query, $options: 'i' } },
        { serviceEmail: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    })
      .sort({ lastEmailReceived: -1 })
      .limit(20)
      .lean();

    res.json({ subscriptions });
  } catch (error) {
    console.error('Search subscriptions error:', error);
    res.status(500).json({ message: 'Failed to search subscriptions' });
  }
});

module.exports = router;
