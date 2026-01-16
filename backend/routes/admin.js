const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Email = require('../models/Email');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const mongoose = require('mongoose');

// Protect all admin routes with both auth and admin checks
router.use(authMiddleware, adminMiddleware);

/**
 * @route   GET /api/admin/stats
 * @desc    Get global application statistics for dashboard
 * @access  Admin
 */
router.get('/stats', asyncHandler(async (req, res) => {
    // Parallel execution for performance
    const [
        totalUsers,
        totalSubscriptions,
        totalEmailsScanned,
        recentUsers,
        activeUsers24h
    ] = await Promise.all([
        User.countDocuments(),
        Subscription.countDocuments(),
        Email.countDocuments(),
        User.find().sort({ createdAt: -1 }).limit(5).select('name email createdAt role picture'),
        User.countDocuments({ updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
    ]);

    // Aggregate subscription costs
    const costAggregation = await Subscription.aggregate([
        {
            $group: {
                _id: null,
                totalMonthly: { $sum: '$price' },
                avgPrice: { $avg: '$price' }
            }
        }
    ]);

    const financials = costAggregation.length > 0 ? costAggregation[0] : { totalMonthly: 0, avgPrice: 0 };

    // Mock data for graphs (User Growth - last 6 months)
    // In a real production app, you'd aggregate this from timestamps
    const chartData = [
        { name: 'Jan', users: 400, breaches: 240 },
        { name: 'Feb', users: 600, breaches: 139 },
        { name: 'Mar', users: 1200, breaches: 980 },
        { name: 'Apr', users: 1800, breaches: 390 },
        { name: 'May', users: 2400, breaches: 480 },
        { name: 'Jun', users: totalUsers, breaches: 380 },
    ];

    res.json({
        overview: {
            totalUsers,
            activeUsers: activeUsers24h,
            totalSubscriptions,
            totalEmailsScanned,
            monthlyRevenue: financials.totalMonthly // Hypothetical revenue if we took a cut
        },
        financials,
        recentUsers,
        chartData
    });
}));

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination and search
 * @access  Admin
 */
router.get('/users', asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
        query = {
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        };
    }

    const [users, total] = await Promise.all([
        User.find(query)
            .select('-password -__v')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        User.countDocuments(query)
    ]);

    res.json({
        users,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
}));

/**
 * @route   PATCH /api/admin/users/:id/role
 * @desc    Promote or demote a user
 * @access  Admin
 */
router.patch('/users/:id/role', asyncHandler(async (req, res) => {
    const { role } = req.body;
    const { id } = req.params;

    if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role specified' });
    }

    // Prevent self-demotion if you are the only admin (optional safety check, simplified here)
    if (req.user._id.toString() === id && role === 'user') {
        return res.status(400).json({ message: 'You cannot demote yourself while logged in.' });
    }

    const user = await User.findByIdAndUpdate(
        id,
        { role },
        { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    res.json({
        message: `User ${user.email} role updated to ${role}`,
        user
    });
}));

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete a user (Admin override)
 * @access  Admin
 */
router.delete('/users/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (req.user._id.toString() === id) {
        return res.status(400).json({ message: 'You cannot delete your own admin account.' });
    }

    const user = await User.findById(id);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    // Cascade delete logic (similar to auth/revoke)
    await Promise.all([
        Subscription.deleteMany({ userId: id }),
        Email.deleteMany({ userId: id }),
        User.deleteOne({ _id: id })
    ]);

    res.json({ message: 'User and all associated data deleted successfully' });
}));

module.exports = router;
