const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { authMiddleware } = require('../middleware/auth');

/**
 * @route   GET /api/activity
 * @desc    Get user's activity log (paginated)
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const query = { userId: req.user._id };

        // Filter by action/severity if needed
        if (req.query.severity) {
            query.severity = req.query.severity;
        }

        const logs = await ActivityLog.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await ActivityLog.countDocuments(query);

        res.json({
            logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        res.status(500).json({ message: 'Server error fetching activity logs' });
    }
});

module.exports = router;
