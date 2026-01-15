const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serviceName: {
    type: String,
    required: true,
    trim: true
  },
  serviceEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  domain: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['subscription', 'newsletter', 'verification', 'login', 'signup', 'billing', 'other'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'revoked', 'unknown'],
    default: 'active'
  },
  firstDetected: {
    type: Date,
    default: Date.now
  },
  lastEmailReceived: {
    type: Date
  },
  emailCount: {
    type: Number,
    default: 1
  },
  revokeUrl: {
    type: String,
    default: ''
  },
  unsubscribeUrl: {
    type: String,
    default: ''
  },
  logoUrl: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  metadata: {
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    },
    extractedFrom: {
      messageId: String,
      subject: String,
      snippet: String
    },
    aiAnalysis: {
      sentiment: String,
      keywords: [String],
      classification: String
    }
  },
  securityAnalysis: {
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    isPhishing: {
      type: Boolean,
      default: false
    },
    phishingIndicators: [{
      type: String // e.g., "Urgent Language", "Domain Mismatch", "Suspicious Link"
    }],
    safeBrowsingStatus: {
      type: String,
      default: 'unknown' // 'safe', 'unsafe', 'unknown'
    },
    lastAnalyzed: {
      type: Date,
      default: null
    }
  },
  breachStatus: {
    isBreached: {
      type: Boolean,
      default: false
    },
    breachName: {
      type: String,
      default: ''
    },
    breachDate: {
      type: Date,
      default: null
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    },
    dataClasses: [{
      type: String
    }],
    description: {
      type: String,
      default: ''
    },
    lastChecked: {
      type: Date,
      default: null
    },
    actionsTaken: [{
      action: {
        type: String,
        required: true
      },
      notes: {
        type: String,
        default: ''
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  },
  financials: {
    cost: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    period: { type: String, enum: ['monthly', 'yearly', 'one-time', 'unknown'], default: 'unknown' },
    renewalDate: { type: Date },
    lastPaymentDate: { type: Date },
    confidence: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
subscriptionSchema.index({ userId: 1, serviceName: 1 });
subscriptionSchema.index({ domain: 1 });
subscriptionSchema.index({ category: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ lastEmailReceived: -1 });

// Method to check if subscription is stale
subscriptionSchema.methods.isStale = function () {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return this.lastEmailReceived < thirtyDaysAgo;
};

// Method to format service name
subscriptionSchema.methods.getFormattedServiceName = function () {
  return this.serviceName.charAt(0).toUpperCase() + this.serviceName.slice(1);
};

// Static method to find subscriptions by domain
subscriptionSchema.statics.findByDomain = function (domain) {
  return this.find({ domain: domain.toLowerCase() });
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
