import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  organizationName: {
    type: String,
    trim: true,
    default: 'Your Organization'
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  plan: {
    type: String,
    enum: ['free', 'basic', 'premium', 'enterprise'],
    default: 'free'
  },
  planLimits: {
    domainsAllowed: {
      type: Number,
      default: 10  // Increased for development
    },
    scansPerMonth: {
      type: Number,
      default: 50  // Increased for development
    },
    aiAnalysisEnabled: {
      type: Boolean,
      default: true  // Enabled for development
    },
    realTimeMonitoring: {
      type: Boolean,
      default: true  // Enabled for development
    }
  },
  usage: {
    domainsUsed: {
      type: Number,
      default: 0
    },
    scansThisMonth: {
      type: Number,
      default: 0
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    }
  },
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    slack: {
      enabled: {
        type: Boolean,
        default: false
      },
      webhookUrl: String
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Update timestamp on save
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Reset monthly usage
userSchema.methods.resetMonthlyUsage = function() {
  const now = new Date();
  const lastReset = new Date(this.usage.lastResetDate);
  
  if (now.getMonth() !== lastReset.getMonth() || 
      now.getFullYear() !== lastReset.getFullYear()) {
    this.usage.scansThisMonth = 0;
    this.usage.lastResetDate = now;
  }
};

export default mongoose.model('User', userSchema);
