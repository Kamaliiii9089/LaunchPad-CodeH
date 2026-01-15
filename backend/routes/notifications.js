const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authMiddleware } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

// Protect all routes
router.use(authMiddleware);

/**
 * @route   GET /api/notifications
 * @desc    Get user's notifications (paginated)
 * @access  Private
 */
router.get('/', asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { filter } = req.query; // 'unread', 'all'

    const query = { userId: req.user._id };
    if (filter === 'unread') {
        query.status = 'unread';
    }

    const [notifications, total, unreadCount] = await Promise.all([
        Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Notification.countDocuments(query),
        Notification.countDocuments({ userId: req.user._id, status: 'unread' })
    ]);

    res.json({
        notifications,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        },
        unreadCount
    });
}));

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Private
 */
router.patch('/:id/read', asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id },
        { status: 'read' },
        { new: true }
    );

    if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(notification);
}));

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.patch('/read-all', asyncHandler(async (req, res) => {
    const result = await Notification.updateMany(
        { userId: req.user._id, status: 'unread' },
        { status: 'read' }
    );

    res.json({ message: 'All notifications marked as read', modifiedCount: result.modifiedCount });
}));

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndDelete({
        _id: req.params.id,
        userId: req.user._id
    });

    if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
}));

module.exports = router;
