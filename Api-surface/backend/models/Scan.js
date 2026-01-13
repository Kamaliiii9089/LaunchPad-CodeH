import mongoose from 'mongoose';

const vulnerabilitySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'no_authentication',
      'weak_authentication', 
      'insecure_protocol',
      'sql_injection',
      'xss_injection',
      'outdated_version',
      'exposed_sensitive_data',
      'cors_misconfiguration',
      'rate_limiting_missing',
      'ssl_issues',
      'information_disclosure',
      'other'
    ]
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical']
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  recommendation: {
    type: String,
    required: true
  },
  cweId: String,
  cvssScore: Number,
  evidence: {
    request: String,
    response: String,
    parameter: String,
    location: String
  }
});

const scanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  domainId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Domain',
    required: true
  },
  scanType: {
    type: String,
    enum: ['discovery', 'vulnerability', 'full', 'monitoring'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  results: {
    discoveredSubdomains: {
      type: Number,
      default: 0
    },
    discoveredEndpoints: {
      type: Number,
      default: 0
    },
    vulnerabilitiesFound: {
      type: Number,
      default: 0
    },
    criticalVulnerabilities: {
      type: Number,
      default: 0
    },
    highVulnerabilities: {
      type: Number,
      default: 0
    },
    mediumVulnerabilities: {
      type: Number,
      default: 0
    },
    lowVulnerabilities: {
      type: Number,
      default: 0
    }
  },
  vulnerabilities: [vulnerabilitySchema],
  discoveredData: {
    subdomains: [{
      subdomain: String,
      ipAddress: String,
      ports: [Number],
      technologies: [String],
      shodanData: Object
    }],
    endpoints: [{
      url: String,
      method: String,
      responseCode: Number,
      responseTime: Number,
      contentType: String,
      isPublic: Boolean,
      requiresAuth: Boolean,
      parameters: [String],
      headers: Object
    }]
  },
  aiAnalysis: {
    enabled: {
      type: Boolean,
      default: false
    },
    summary: String,
    riskScore: {
      type: Number,
      min: 0,
      max: 10
    },
    topRecommendations: [String],
    executiveSummary: String,
    technicalDetails: String,
    generatedAt: Date
  },
  tools: {
    sublist3r: {
      used: Boolean,
      version: String,
      duration: Number,
      results: Number
    },
    amass: {
      used: Boolean,
      version: String,
      duration: Number,
      results: Number
    },
    shodan: {
      used: Boolean,
      queriesUsed: Number,
      results: Number
    },
    owaspZap: {
      used: Boolean,
      version: String,
      duration: Number,
      alertsGenerated: Number
    }
  },
  metadata: {
    startedAt: Date,
    completedAt: Date,
    duration: Number,
    triggeredBy: {
      type: String,
      enum: ['manual', 'scheduled', 'monitoring', 'api'],
      default: 'manual'
    },
    userAgent: String,
    ipAddress: String
  },
  errors: [{
    message: String,
    tool: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
scanSchema.index({ userId: 1, createdAt: -1 });
scanSchema.index({ domainId: 1, createdAt: -1 });
scanSchema.index({ status: 1 });
scanSchema.index({ scanType: 1 });
scanSchema.index({ 'vulnerabilities.severity': 1 });

// Update timestamp on save
scanSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate vulnerability counts
  if (this.vulnerabilities && this.vulnerabilities.length > 0) {
    this.results.vulnerabilitiesFound = this.vulnerabilities.length;
    this.results.criticalVulnerabilities = this.vulnerabilities.filter(v => v.severity === 'critical').length;
    this.results.highVulnerabilities = this.vulnerabilities.filter(v => v.severity === 'high').length;
    this.results.mediumVulnerabilities = this.vulnerabilities.filter(v => v.severity === 'medium').length;
    this.results.lowVulnerabilities = this.vulnerabilities.filter(v => v.severity === 'low').length;
  }
  
  next();
});

// Method to calculate risk score
scanSchema.methods.calculateRiskScore = function() {
  const weights = { critical: 4, high: 3, medium: 2, low: 1 };
  const total = this.results.criticalVulnerabilities * weights.critical +
                this.results.highVulnerabilities * weights.high +
                this.results.mediumVulnerabilities * weights.medium +
                this.results.lowVulnerabilities * weights.low;
  
  // Normalize to 0-10 scale
  const maxPossible = this.results.vulnerabilitiesFound * weights.critical;
  return maxPossible > 0 ? Math.min(10, (total / maxPossible) * 10) : 0;
};

// Method to get scan duration
scanSchema.methods.getDuration = function() {
  if (this.metadata.startedAt && this.metadata.completedAt) {
    return Math.round((this.metadata.completedAt - this.metadata.startedAt) / 1000); // in seconds
  }
  return null;
};

// Method to mark scan as completed
scanSchema.methods.markCompleted = function() {
  this.status = 'completed';
  this.progress = 100;
  this.metadata.completedAt = new Date();
  this.metadata.duration = this.getDuration();
};

export default mongoose.model('Scan', scanSchema);
