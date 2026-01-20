const Notification = require('../models/Notification');

/**
 * createNotification
 * Creates a new notification for a user
 * 
 * @param {string} userId - ID of the user
 * @param {string} title - Title of the notification
 * @param {string} message - Body content
 * @param {string} type - 'info' | 'success' | 'warning' | 'danger'
 * @param {string} link - Optional internal link
 * @param {object} metadata - Optional key-value pairs
 */
const createNotification = async (userId, title, message, type = 'info', link = '', metadata = {}) => {
    try {
        const notification = await Notification.create({
            userId,
            title,
            message,
            type,
            link,
            metadata
        });
        return notification;
    } catch (error) {
        console.error('Failed to create notification:', error);
        // Don't throw, just log. Notifications shouldn't break core flows.
        return null;
    }
};

/**
 * notifyAdmins
 * Sends a notification to all admin users (e.g. for system alerts)
 */
const notifyAdmins = async (title, message, type = 'info', link = '') => {
    const User = require('../models/User');
    try {
        const admins = await User.find({ role: 'admin' }).select('_id');
        const notifications = admins.map(admin => ({
            userId: admin._id,
            title,
            message,
            type,
            link
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }
    } catch (error) {
        console.error('Failed to notify admins:', error);
    }
};

module.exports = {
    createNotification,
    notifyAdmins
};
