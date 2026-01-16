const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    action: {
        type: String, // e.g., 'LOGIN', 'LOGOUT', 'SCAN_STARTED', 'SCAN_COMPLETED', 'REVOKE_ACCESS'
        required: true,
        uppercase: true
    },
    details: {
        type: String, // Human readable description
        default: ''
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed, // Flexible object for extra data (e.g., number of emails scanned)
        default: {}
    },
    ipAddress: {
        type: String,
        default: '0.0.0.0'
    },
    userAgent: {
        type: String,
        default: 'Unknown'
    },
    severity: {
        type: String,
        enum: ['info', 'warning', 'danger', 'success'],
        default: 'info'
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: -1 // Descending index for timeline queries
    }
}, {
    timestamps: true // Adds createdAt/updatedAt (createdAt is redundant but good for standard)
});

// Auto-delete logs older than 1 year (optional, good for compliance)
activityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
