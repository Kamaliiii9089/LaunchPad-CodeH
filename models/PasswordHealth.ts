/**
 * PasswordHealth – Mongoose model
 *
 * Stores password security metadata per user.
 * IMPORTANT: Actual password values are NEVER stored here.
 * Only cryptographic hashes (SHA-1 prefix for HIBP, SHA-256 for reuse detection)
 * and computed risk metrics are persisted.
 */

import mongoose, { Document, Schema } from 'mongoose';

export type PasswordStrength = 'very_weak' | 'weak' | 'fair' | 'strong' | 'very_strong';
export type PasswordRisk = 'critical' | 'high' | 'medium' | 'low' | 'none';

export interface IPasswordHealthRecord extends Document {
  /** References the User._id */
  userId: string;

  /** User email – denormalised for fast reporting queries */
  email: string;

  // ── Strength metrics (computed without storing the password) ──────────────

  /** Computed strength label */
  strength: PasswordStrength;

  /** Numeric strength score 0-100 */
  strengthScore: number;

  /** Password character length */
  passwordLength: number;

  /** True if password contains uppercase letters */
  hasUppercase: boolean;

  /** True if password contains lowercase letters */
  hasLowercase: boolean;

  /** True if password contains numeric digits */
  hasNumbers: boolean;

  /** True if password contains special/symbol characters */
  hasSpecialChars: boolean;

  /** True if the password matches a known weak/common pattern */
  isCommonPattern: boolean;

  /** True if the password matches a dictionary / common password */
  isDictionaryWord: boolean;

  // ── Breach detection ──────────────────────────────────────────────────────

  /**
   * Whether the SHA-1 hash prefix was found in HIBP.
   * null = not yet checked.
   */
  isBreached: boolean | null;

  /**
   * Approximate number of times this password appeared in known data breaches
   * (from HIBP k-anonymity API). 0 = not found.
   */
  breachCount: number;

  /** When the HIBP check was last performed */
  lastBreachCheck?: Date;

  // ── Reuse detection ───────────────────────────────────────────────────────

  /**
   * SHA-256 hash of the password used *only* for cross-account reuse
   * comparison.  Never used to recover the password.
   */
  passwordHashForReuse: string;

  /**
   * SHA-1 hash prefix (first 5 chars) used for HIBP k-anonymity queries.
   */
  hibpPrefix: string;

  /** True if this password hash is shared by more than one user account */
  isReused: boolean;

  /** Number of accounts sharing this exact password hash */
  reuseCount: number;

  // ── Risk summary ─────────────────────────────────────────────────────────

  /** Overall risk level for this account's password */
  overallRisk: PasswordRisk;

  /** Numeric overall risk score 0-100 */
  overallRiskScore: number;

  /** List of specific issues detected */
  issues: string[];

  /** Recommendations to improve password security */
  recommendations: string[];

  // ── Audit timestamps ──────────────────────────────────────────────────────

  /** When this health record was first created */
  createdAt: Date;

  /** When this health record was last updated (password change / re-scan) */
  updatedAt: Date;

  /** When the most recent scan was run for this user */
  lastScannedAt: Date;

  /** How many days since the password was last changed */
  daysSincePasswordChange: number | null;
}

const PasswordHealthSchema = new Schema<IPasswordHealthRecord>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },

    // Strength
    strength: {
      type: String,
      enum: ['very_weak', 'weak', 'fair', 'strong', 'very_strong'],
      default: 'fair',
    },
    strengthScore: { type: Number, default: 0, min: 0, max: 100 },
    passwordLength: { type: Number, default: 0 },
    hasUppercase: { type: Boolean, default: false },
    hasLowercase: { type: Boolean, default: false },
    hasNumbers: { type: Boolean, default: false },
    hasSpecialChars: { type: Boolean, default: false },
    isCommonPattern: { type: Boolean, default: false },
    isDictionaryWord: { type: Boolean, default: false },

    // Breach
    isBreached: { type: Boolean, default: null },
    breachCount: { type: Number, default: 0 },
    lastBreachCheck: { type: Date },

    // Reuse
    passwordHashForReuse: {
      type: String,
      required: true,
      index: true, // Indexed so we can find all users with the same hash
    },
    hibpPrefix: { type: String, required: true },
    isReused: { type: Boolean, default: false },
    reuseCount: { type: Number, default: 1, min: 1 },

    // Risk summary
    overallRisk: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low', 'none'],
      default: 'medium',
      index: true,
    },
    overallRiskScore: { type: Number, default: 0, min: 0, max: 100 },
    issues: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },

    // Timestamps
    lastScannedAt: { type: Date, default: () => new Date() },
    daysSincePasswordChange: { type: Number, default: null },
  },
  {
    timestamps: true,
  },
);

// Compound index for efficient dashboard queries
PasswordHealthSchema.index({ overallRisk: 1, updatedAt: -1 });
PasswordHealthSchema.index({ isBreached: 1 });
PasswordHealthSchema.index({ isReused: 1 });

const PasswordHealth =
  mongoose.models.PasswordHealth ||
  mongoose.model<IPasswordHealthRecord>('PasswordHealth', PasswordHealthSchema);

export default PasswordHealth;
