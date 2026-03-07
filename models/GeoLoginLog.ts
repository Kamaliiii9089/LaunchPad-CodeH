/**
 * GeoLoginLog – Mongoose model
 *
 * Immutable audit log of every login attempt that passed through the
 * geofencing engine, regardless of the verdict.
 *
 * The collection is intentionally append-only.  The engine will never
 * update an existing document; a TTL index handles automatic expiry.
 */

import mongoose, { Document, Schema } from 'mongoose';

export type GeoVerdict = 'ALLOWED' | 'CHALLENGED' | 'BLOCKED';

export interface IGeoLoginLog extends Document {
  /** MongoDB user _id, if the user was identified before the check */
  userId?: string;

  /** Email address supplied at login time */
  email?: string;

  /** Raw originating IP address */
  ip: string;

  /** Engine verdict */
  verdict: GeoVerdict;

  // ---- Location fields (flattened from GeoLocation) ----
  country: string;
  countryCode: string;
  continent: string;
  continentCode: string;
  city: string;
  region: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;

  /** True if ip-api reported the IP as a proxy / VPN / Tor exit node */
  isProxy: boolean;

  /** True if ip-api reported the IP as a hosting / data-centre IP */
  isHosting: boolean;

  /** True when the geolocation API was unreachable */
  lookupFailed: boolean;

  /** Human-readable explanation of the verdict */
  reason: string;

  /** 0–100 risk score at the time of the decision */
  riskScore: number;

  /** Browser User-Agent string */
  userAgent?: string;

  /**
   * Informational flags set by the engine.
   * Examples: PROXY_DETECTED, COUNTRY_BLOCKED, OUTSIDE_TIME_WINDOW
   */
  flags: string[];

  /**
   * For CHALLENGED verdicts – the type of challenge that was issued.
   */
  challengeType?: string;

  /** When this event was recorded */
  timestamp: Date;
}

const GeoLoginLogSchema = new Schema<IGeoLoginLog>(
  {
    userId: { type: String, index: true },
    email: { type: String, index: true, lowercase: true },
    ip: { type: String, required: true, index: true },
    verdict: {
      type: String,
      enum: ['ALLOWED', 'CHALLENGED', 'BLOCKED'],
      required: true,
      index: true,
    },
    country: { type: String, default: 'Unknown' },
    countryCode: { type: String, default: 'XX', uppercase: true, index: true },
    continent: { type: String, default: 'Unknown' },
    continentCode: { type: String, default: 'XX', uppercase: true },
    city: { type: String, default: '' },
    region: { type: String, default: '' },
    lat: { type: Number },
    lon: { type: Number },
    timezone: { type: String },
    isp: { type: String },
    isProxy: { type: Boolean, default: false, index: true },
    isHosting: { type: Boolean, default: false },
    lookupFailed: { type: Boolean, default: false },
    reason: { type: String, required: true },
    riskScore: { type: Number, required: true, min: 0, max: 100 },
    userAgent: { type: String },
    flags: { type: [String], default: [] },
    challengeType: { type: String },
    timestamp: { type: Date, default: () => new Date(), index: true },
  },
  {
    // No mutation needed; disable versioning overhead
    versionKey: false,
    // Automatically drop documents older than 180 days (TTL index)
    // Set expireAfterSeconds to 0 and let MongoDB use the `timestamp` field
  },
);

// Compound index for dashboard queries (most common: sort by timestamp, filter by verdict)
GeoLoginLogSchema.index({ verdict: 1, timestamp: -1 });
GeoLoginLogSchema.index({ countryCode: 1, timestamp: -1 });
GeoLoginLogSchema.index({ isProxy: 1, timestamp: -1 });

// TTL – auto-expire log entries after 180 days
GeoLoginLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

const GeoLoginLog =
  mongoose.models.GeoLoginLog ||
  mongoose.model<IGeoLoginLog>('GeoLoginLog', GeoLoginLogSchema);

export default GeoLoginLog;
