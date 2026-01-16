const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const reportService = require('../services/reportService');

/**
 * @route   GET /api/reports/download
 * @desc    Generate and download Security PDF Report
 * @access  Private
 */
router.get('/download', authMiddleware, async (req, res) => {
    try {
        const subscriptions = await Subscription.find({ userId: req.user._id });

        // Ensure user object has necessary fields for report
        const data = {
            user: {
                name: req.user.name,
                email: req.user.email,
                is2FAEnabled: req.user.is2FAEnabled, // Populated by middleware (User model default select is true)
                securityScore: req.user.securityScore
            },
            subscriptions
        };

        const filename = `SecurityReport_${req.user.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;

        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');

        const doc = reportService.generateReport(data);
        doc.pipe(res);

    } catch (err) {
        console.error('Report Generation Error:', err);
        res.status(500).send('Error producing report');
    }
});

module.exports = router;
