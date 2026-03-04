import mongoose from 'mongoose';

const IOCSchema = new mongoose.Schema({
  value: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['ip', 'domain', 'url', 'hash', 'email', 'file', 'registry_key', 'mutex'],
  },
  firstSeen: {
    type: Date,
    default: Date.now,
    index: true,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  occurrences: {
    type: Number,
    default: 1,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 50,
  },
  tags: {
    type: [String],
    default: [],
  },
  sources: {
    type: [String],
    default: [],
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'whitelisted', 'false_positive'],
    default: 'active',
  },
});

const VirusTotalEnrichmentSchema = new mongoose.Schema({
  sha256: String,
  md5: String,
  sha1: String,
  detectionRatio: String,
  positives: Number,
  total: Number,
  scanDate: Date,
  permalink: String,
  vendors: [{
    name: String,
    detected: Boolean,
    result: String,
  }],
  fileType: String,
  fileSize: Number,
  tags: [String],
});

const AbuseIPDBEnrichmentSchema = new mongoose.Schema({
  ipAddress: String,
  abuseConfidenceScore: Number,
  usageType: String,
  isp: String,
  domain: String,
  countryCode: String,
  countryName: String,
  isWhitelisted: Boolean,
  totalReports: Number,
  numDistinctUsers: Number,
  lastReportedAt: Date,
  reports: [{
    reportedAt: Date,
    comment: String,
    categories: [Number],
    reporterId: Number,
  }],
});

const MITREAttackSchema = new mongoose.Schema({
  techniqueId: {
    type: String,
    required: true,
    index: true,
  },
  techniqueName: {
    type: String,
    required: true,
  },
  tactic: {
    type: String,
    required: true,
  },
  description: String,
  platforms: [String],
  dataSources: [String],
  detectionMethods: [String],
  mitigations: [{
    id: String,
    name: String,
    description: String,
  }],
  references: [{
    source: String,
    url: String,
  }],
  subtechniques: [{
    id: String,
    name: String,
  }],
  matched: {
    type: Boolean,
    default: false,
  },
  matchedEvents: [{
    eventId: String,
    timestamp: Date,
    confidence: Number,
  }],
});

const ThreatIntelligenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  ioc: IOCSchema,
  enrichments: {
    virusTotal: VirusTotalEnrichmentSchema,
    abuseIPDB: AbuseIPDBEnrichmentSchema,
    mitre: [MITREAttackSchema],
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  threatCategory: {
    type: String,
    enum: ['malware', 'phishing', 'ransomware', 'botnet', 'c2', 'exploit', 'ddos', 'spam', 'suspicious', 'unknown'],
    default: 'unknown',
  },
  actionTaken: {
    type: String,
    enum: ['none', 'blocked', 'quarantined', 'alerted', 'investigated'],
    default: 'none',
  },
  notes: {
    type: String,
    default: '',
  },
  enrichedAt: {
    type: Date,
  },
  expiresAt: {
    type: Date,
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Indexes for performance
ThreatIntelligenceSchema.index({ 'ioc.value': 1, 'ioc.type': 1 });
ThreatIntelligenceSchema.index({ userId: 1, 'ioc.status': 1 });
ThreatIntelligenceSchema.index({ riskScore: -1 });
ThreatIntelligenceSchema.index({ createdAt: -1 });
ThreatIntelligenceSchema.index({ 'enrichments.mitre.techniqueId': 1 });

const ThreatFeedSchema = new mongoose.Schema({
  feedName: {
    type: String,
    required: true,
  },
  feedType: {
    type: String,
    enum: ['virustotal', 'abuseipdb', 'mitre', 'custom'],
    required: true,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  apiKey: {
    type: String,
    required: false,
  },
  updateFrequency: {
    type: Number, // in minutes
    default: 60,
  },
  lastUpdate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['active', 'error', 'disabled'],
    default: 'active',
  },
  statistics: {
    totalQueries: {
      type: Number,
      default: 0,
    },
    successfulQueries: {
      type: Number,
      default: 0,
    },
    failedQueries: {
      type: Number,
      default: 0,
    },
    lastError: String,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

ThreatFeedSchema.index({ userId: 1, feedType: 1 });

export const ThreatIntelligence = mongoose.models.ThreatIntelligence || mongoose.model('ThreatIntelligence', ThreatIntelligenceSchema);
export const ThreatFeed = mongoose.models.ThreatFeed || mongoose.model('ThreatFeed', ThreatFeedSchema);
