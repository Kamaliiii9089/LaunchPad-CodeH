const mongoose = require('mongoose');

/**
 * FalsePositive Model
 * 
 * Stores user feedback on incorrectly flagged emails and security alerts.
 * This data helps improve detection accuracy and reduces future false positives.
 */
const falsePositiveSchema = new mongoose.Schema({
  // User who reported the false positive
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Type of false positive
  reportType: {
    type: String,
    enum: ['phishing', 'breach', 'suspicious_email', 'malicious_url', 'other'],
    required: true,
    index: true
  },

  // Reference to the original flagged item
  referenceId: {
    type: String,
    required: true,
    index: true,
    description: 'Email ID, message ID, or other identifier of the flagged item'
  },

  // Original detection details
  originalDetection: {
    riskScore: {
      type: Number,
      min: 0,
      max: 100
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    indicators: [{
      type: String
    }],
    detectionMethod: {
      type: String,
      description: 'e.g., "Safe Browsing API", "Heuristic Analysis", "Brand Impersonation"'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },

  // Email-specific data (if applicable)
  emailData: {
    from: {
      email: String,
      name: String
    },
    subject: String,
    snippet: String,
    messageId: String,
    links: [String]
  },

  // User's feedback
  userFeedback: {
    reason: {
      type: String,
      enum: [
        'legitimate_sender',
        'known_service',
        'expected_email',
        'incorrect_analysis',
        'trusted_domain',
        'false_urgency_detection',
        'other'
      ],
      required: true
    },
    comment: {
      type: String,
      maxlength: 1000,
      trim: true
    },
    confidence: {
      type: String,
      enum: ['certain', 'likely', 'unsure'],
      default: 'certain'
    }
  },

  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'accepted', 'rejected', 'needs_more_info'],
    default: 'pending',
    index: true
  },

  // Review information (admin/system)
  review: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    decision: {
      type: String,
      enum: ['confirmed_false_positive', 'correct_detection', 'inconclusive']
    },
    notes: String,
    actionTaken: {
      type: String,
      description: 'e.g., "Updated whitelist", "Adjusted threshold", "Updated rules"'
    }
  },

  // Impact tracking
  impact: {
    affectedUsers: {
      type: Number,
      default: 1,
      description: 'Number of users who reported the same false positive'
    },
    similarReports: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FalsePositive'
    }],
    preventedFutureFlags: {
      type: Number,
      default: 0,
      description: 'Count of similar items not flagged due to this report'
    }
  },

  // Metadata
  metadata: {
    userAgent: String,
    ipAddress: String,
    reportSource: {
      type: String,
      enum: ['web', 'mobile', 'api', 'extension'],
      default: 'web'
    }
  },

  // Auto-resolution
  autoResolved: {
    type: Boolean,
    default: false,
    description: 'True if automatically resolved by ML model or rules engine'
  },

  resolution: {
    appliedAt: Date,
    appliedBy: {
      type: String,
      enum: ['admin', 'system', 'ml_model']
    },
    changes: {
      type: String,
      description: 'Description of changes made to detection system'
    }
  }

}, {
  timestamps: true
});

// Indexes for efficient queries
falsePositiveSchema.index({ userId: 1, reportType: 1 });
falsePositiveSchema.index({ status: 1, createdAt: -1 });
falsePositiveSchema.index({ 'emailData.from.email': 1 });
falsePositiveSchema.index({ 'originalDetection.riskLevel': 1 });
falsePositiveSchema.index({ createdAt: -1 });

// Compound index for analytics
falsePositiveSchema.index({ reportType: 1, status: 1, createdAt: -1 });

// Virtual for related reports count
falsePositiveSchema.virtual('relatedReportsCount').get(function() {
  return this.impact.similarReports.length;
});

// Instance method to check if report is actionable
falsePositiveSchema.methods.isActionable = function() {
  return this.status === 'pending' || this.status === 'needs_more_info';
};

// Static method to find similar reports
falsePositiveSchema.statics.findSimilar = async function(emailFrom, subject, riskLevel) {
  return this.find({
    'emailData.from.email': emailFrom,
    'emailData.subject': { $regex: new RegExp(subject.substring(0, 30), 'i') },
    'originalDetection.riskLevel': riskLevel,
    status: { $in: ['accepted', 'reviewed'] }
  }).limit(10);
};

// Static method to get false positive statistics
falsePositiveSchema.statics.getStatistics = async function(startDate, endDate) {
  const pipeline = [
    {
      $match: {
        createdAt: {
          $gte: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          $lte: endDate || new Date()
        }
      }
    },
    {
      $group: {
        _id: {
          type: '$reportType',
          status: '$status'
        },
        count: { $sum: 1 },
        avgRiskScore: { $avg: '$originalDetection.riskScore' }
      }
    },
    {
      $sort: { '_id.type': 1, '_id.status': 1 }
    }
  ];

  return this.aggregate(pipeline);
};

// Pre-save hook to validate data
falsePositiveSchema.pre('save', function(next) {
  // Ensure email data is present for email-related reports
  if (['phishing', 'suspicious_email'].includes(this.reportType)) {
    if (!this.emailData || !this.emailData.from) {
      return next(new Error('Email data is required for email-related reports'));
    }
  }
  next();
});

// Post-save hook to update related statistics
falsePositiveSchema.post('save', async function(doc) {
  // Update similar reports if this is accepted
  if (doc.status === 'accepted' && doc.emailData?.from?.email) {
    try {
      await this.constructor.updateMany(
        {
          _id: { $ne: doc._id },
          'emailData.from.email': doc.emailData.from.email,
          status: 'pending'
        },
        {
          $addToSet: { 'impact.similarReports': doc._id }
        }
      );
    } catch (error) {
      console.error('Error updating similar reports:', error);
    }
  }
});

module.exports = mongoose.model('FalsePositive', falsePositiveSchema);
