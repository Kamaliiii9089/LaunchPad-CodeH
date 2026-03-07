/**
 * GeofencingConfig – Mongoose model
 *
 * Stores the single active geofencing configuration document.
 * The engine always queries { isActive: true } to find the live config.
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IGeofencingConfig extends Document {
  /** Master on/off switch */
  enabled: boolean;

  /**
   * Restrictive mode – if true, logins from countries/continents NOT in the
   * allowlist are hard-blocked rather than just challenged.
   */
  restrictiveMode: boolean;

  /**
   * Block all known proxy / VPN / hosting IPs regardless of country.
   * Uses ip-api.com "proxy" and "hosting" flags.
   */
  blockProxies: boolean;

  /** ISO 3166-1 alpha-2 country codes that are allowed to log in (empty = all) */
  allowedCountries: string[];

  /** ISO 3166-1 alpha-2 country codes that are explicitly blocked */
  blockedCountries: string[];

  /**
   * Continent codes that are allowed (AF, AN, AS, EU, NA, OC, SA).
   * Empty = all continents allowed.
   */
  allowedContinents: string[];

  /** Individual IPs / CIDR ranges that bypass all checks (trusted offices, etc.) */
  whitelistedIPs: string[];

  /** Individual IPs / CIDR ranges that are always hard-blocked */
  blacklistedIPs: string[];

  /**
   * Risk score ≥ this value → hard block.
   * Default: 70
   */
  blockThreshold: number;

  /**
   * Risk score ≥ this value (but < blockThreshold) → challenge.
   * Default: 40
   */
  challengeThreshold: number;

  /**
   * Type of challenge to present when verdict is CHALLENGED.
   * EMAIL_OTP  – send a one-time code to the user's registered email
   * TOTP       – require the TOTP authenticator code (same as 2FA)
   * ADMIN_APPROVAL – queue the login for manual admin approval
   */
  challengeType: 'EMAIL_OTP' | 'TOTP' | 'ADMIN_APPROVAL';

  /**
   * UTC hour (0-23) at which the allowed login window starts.
   * Leave both null to disable time-window enforcement.
   */
  allowedStartHour?: number;

  /**
   * UTC hour (0-23) at which the allowed login window ends.
   * Supports overnight ranges (e.g. start=22, end=6).
   */
  allowedEndHour?: number;

  /** Exactly one "global" config document should have this true */
  isActive: boolean;

  /** Free-text note for auditing / tracking why the config was changed */
  lastModifiedNote?: string;

  /** ID of the admin user who last saved this config */
  lastModifiedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

const GeofencingConfigSchema = new Schema<IGeofencingConfig>(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
    restrictiveMode: {
      type: Boolean,
      default: false,
    },
    blockProxies: {
      type: Boolean,
      default: false,
    },
    allowedCountries: {
      type: [String],
      default: [],
    },
    blockedCountries: {
      type: [String],
      default: [],
    },
    allowedContinents: {
      type: [String],
      default: [],
    },
    whitelistedIPs: {
      type: [String],
      default: [],
    },
    blacklistedIPs: {
      type: [String],
      default: [],
    },
    blockThreshold: {
      type: Number,
      default: 70,
      min: 1,
      max: 100,
    },
    challengeThreshold: {
      type: Number,
      default: 40,
      min: 1,
      max: 100,
    },
    challengeType: {
      type: String,
      enum: ['EMAIL_OTP', 'TOTP', 'ADMIN_APPROVAL'],
      default: 'EMAIL_OTP',
    },
    allowedStartHour: {
      type: Number,
      min: 0,
      max: 23,
    },
    allowedEndHour: {
      type: Number,
      min: 0,
      max: 23,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastModifiedNote: {
      type: String,
      maxlength: 500,
    },
    lastModifiedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

// Sparse unique index – at most one document with isActive = true
GeofencingConfigSchema.index({ isActive: 1 }, { sparse: true });

const GeofencingConfig =
  mongoose.models.GeofencingConfig ||
  mongoose.model<IGeofencingConfig>('GeofencingConfig', GeofencingConfigSchema);

export default GeofencingConfig;
