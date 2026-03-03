// Push Subscription Model
// Stores push notification subscriptions for users

import mongoose from 'mongoose';

const PushSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  endpoint: {
    type: String,
    required: true,
    trim: true,
  },
  keys: {
    p256dh: {
      type: String,
      required: true,
    },
    auth: {
      type: String,
      required: true,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  deviceInfo: {
    userAgent: String,
    browser: String,
    os: String,
    deviceType: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  lastUsed: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes for performance
PushSubscriptionSchema.index({ userId: 1, isActive: 1 });
PushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });
PushSubscriptionSchema.index({ createdAt: 1 });

// Update lastUsed timestamp on save
PushSubscriptionSchema.pre('save', function(next) {
  if (this.isModified('isActive') && this.isActive) {
    this.lastUsed = new Date();
  }
  next();
});

const PushSubscription = mongoose.models.PushSubscription || mongoose.model('PushSubscription', PushSubscriptionSchema);

export default PushSubscription;
