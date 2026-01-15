const ActivityLog = require('../models/ActivityLog');

/**
 * Log user activity
 * @param {string} userId - User ID
 * @param {string} action - Action code (e.g., 'LOGIN', 'SCAN_Start')
 * @param {string} details - Human readable string
 * @param {Object} req - Express request object (optional, for IP/UserAgent)
 * @param {string} severity - 'info', 'warning', 'danger', 'success'
 * @param {Object} metadata - Additional data
 */
const logActivity = async (userId, action, details, req = null, severity = 'info', metadata = {}) => {
    try {
        let ipAddress = '0.0.0.0';
        let userAgent = 'Unknown';

        if (req) {
            ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0';
            userAgent = req.headers['user-agent'] || 'Unknown';
        }

        // Sanitize metadata to avoid huge logs
        const safeMetadata = JSON.parse(JSON.stringify(metadata));

        const log = new ActivityLog({
            userId,
            action,
            details,
            ipAddress,
            userAgent,
            severity,
            metadata: safeMetadata
        });

        await log.save();
        // console.log(`📝 Activity Logged: [${action}] ${details}`);
    } catch (error) {
        console.error('Failed to log activity:', error.message);
        // Don't throw error to avoid disrupting the main flow
    }
};

module.exports = {
    logActivity
};
