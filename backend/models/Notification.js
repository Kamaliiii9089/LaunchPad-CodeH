const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ['info', 'success', 'warning', 'danger'],
            default: 'info',
        },
        status: {
            type: String,
            enum: ['unread', 'read'],
            default: 'unread',
        },
        link: {
            type: String, // Optional URL to redirect to (e.g., /breach-check)
            default: '',
        },
        metadata: {
            type: Map,
            of: String, // For storing extra data like scanId, breachCount, etc.
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient querying of unread notifications
notificationSchema.index({ userId: 1, status: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
