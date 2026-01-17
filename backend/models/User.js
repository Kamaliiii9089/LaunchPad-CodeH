const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 * -----------
 * This schema stores user information securely.
 * Passwords are NEVER stored in plain text.
 * bcrypt hashing is enforced before saving the user.
 */
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },

    /**
     * Password Field
     * --------------
     * - NOT returned in queries by default
     * - Always stored as a hashed value
     */
    password: {
      type: String,
      required: false, // optional because Google OAuth users may not have password
      minlength: 8,
      select: false, // IMPORTANT: hide password in queries
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true, // allows users without googleId
    },

    picture: {
      type: String,
      default: '',
    },

    refreshToken: {
      type: String,
      default: '',
      select: false, // sensitive token
    },

    accessToken: {
      type: String,
      default: '',
      select: false, // sensitive token
    },

    tokenExpiry: {
      type: Date,
    },

    lastEmailScan: {
      type: Date,
      default: null,
    },

    lastBreachCheck: {
      type: Date,
      default: null,
    },

    securityScore: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },

    subscriptions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription',
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },

    /**
     * Account Lockout Fields
     * ---------------------
     * Prevent brute-force login attempts
     */
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    preferences: {
      scanFrequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'manual'],
        default: 'weekly',
      },
      theme: {
        type: String,
        enum: ['breach-dark', 'security-blue', 'high-contrast'],
        default: 'breach-dark',
      },
      language: {
        type: String,
        enum: ['en', 'es', 'hi'],
        default: 'en',
      },
      emailCategories: [
        {
          type: String,
          enum: [
            'subscription',
            'newsletter',
            'verification',
            'login',
            'signup',
            'billing',
          ],
        },
      ],
      notifications: {
        type: Boolean,
        default: true,
      },
      customTheme: {
        primaryColor: { type: String, default: '#667eea' },
        secondaryColor: { type: String, default: '#764ba2' },
        backgroundColor: { type: String, default: '#f8fafc' },
        textColor: { type: String, default: '#2d3748' },
        sidebarColor: { type: String, default: '#ffffff' }
      },
      whitelist: [{ type: String }],
      blacklist: [{ type: String }],
    },
  },
  {
    timestamps: true,
  }
);

/* ======================================================
   Indexes (Performance Optimization)
====================================================== */
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });

/* ======================================================
   Pre-save Hook: Password Hashing
====================================================== */
/**
 * This middleware runs BEFORE saving a user.
 * If password is modified:
 *  - Hash it using bcrypt
 *  - Replace plain password with hashed password
 */
userSchema.pre('save', async function (next) {
  // Only hash password if it was modified or is new
  if (!this.isModified('password')) return next();

  try {
    // Generate salt (cost factor = 12 → secure & recommended)
    const salt = await bcrypt.genSalt(12);

    // Hash the password
    this.password = await bcrypt.hash(this.password, salt);

    next();
  } catch (error) {
    next(error);
  }
});

/* ======================================================
   Instance Methods
====================================================== */

/**
 * Compare entered password with hashed password
 * Used during login
 */
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Check if access token is expired
 */
userSchema.methods.isTokenExpired = function () {
  return this.tokenExpiry && this.tokenExpiry < new Date();
};

/**
 * Get user's full name
 */
userSchema.methods.getFullName = function () {
  return this.name;
};

/* ======================================================
   Export Model
====================================================== */
module.exports = mongoose.model('User', userSchema);
