const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messageId: {
    type: String,
    required: true,
    unique: true
  },
  threadId: {
    type: String,
    required: true
  },
  from: {
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    name: String
  },
  subject: {
    type: String,
    required: true
  },
  snippet: {
    type: String,
    required: true
  },
  body: {
    type: String,
    default: ''
  },
  receivedDate: {
    type: Date,
    required: true
  },
  labels: [{
    type: String
  }],
  category: {
    type: String,
    enum: ['subscription', 'newsletter', 'verification', 'login', 'signup', 'billing', 'promotional', 'other'],
    default: 'other'
  },
  processed: {
    type: Boolean,
    default: false
  },
  processingResults: {
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    extractedService: {
      name: String,
      domain: String,
      category: String
    },
    keywords: [String],
    urls: {
      unsubscribe: [String],
      revoke: [String],
      manage: [String]
    },
    aiAnalysis: {
      sentiment: String,
      classification: String,
      keyPhrases: [String]
    },
    financials: {
      cost: Number,
      currency: String,
      period: String,
      renewalDate: Date,
      confidence: Number
    }
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
emailSchema.index({ userId: 1, receivedDate: -1 });
emailSchema.index({ messageId: 1 });
emailSchema.index({ 'from.email': 1 });
emailSchema.index({ category: 1 });
emailSchema.index({ processed: 1 });

// Method to extract domain from email
emailSchema.methods.getDomain = function () {
  return this.from.email.split('@')[1];
};

// Method to check if email needs processing
emailSchema.methods.needsProcessing = function () {
  return !this.processed;
};

// Static method to find unprocessed emails
emailSchema.statics.findUnprocessed = function (userId, limit = 50) {
  return this.find({ userId, processed: false })
    .sort({ receivedDate: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Email', emailSchema);
