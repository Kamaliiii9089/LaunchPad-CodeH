import mongoose from 'mongoose';

const domainSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  domain: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  displayName: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'scanning', 'error'],
    default: 'active'
  },
  subdomains: [{
    subdomain: {
      type: String,
      required: true
    },
    ipAddress: String,
    ports: [Number],
    technologies: [String],
    lastSeen: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  endpoints: [{
    url: {
      type: String,
      required: true
    },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
      default: 'GET'
    },
    subdomain: String,
    path: String,
    parameters: [String],
    headers: Object,
    responseCode: Number,
    responseTime: Number,
    contentType: String,
    isPublic: {
      type: Boolean,
      default: true
    },
    requiresAuth: {
      type: Boolean,
      default: false
    },
    lastChecked: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  monitoringSettings: {
    enabled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    alertThreshold: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    lastMonitoringRun: Date,
    nextMonitoringRun: Date
  },
  statistics: {
    totalSubdomains: {
      type: Number,
      default: 0
    },
    totalEndpoints: {
      type: Number,
      default: 0
    },
    publicEndpoints: {
      type: Number,
      default: 0
    },
    lastScanDate: Date,
    totalScans: {
      type: Number,
      default: 0
    }
  },
  tags: [String],
  notes: String,
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
domainSchema.index({ userId: 1, domain: 1 }, { unique: true });
domainSchema.index({ 'subdomains.subdomain': 1 });
domainSchema.index({ 'endpoints.url': 1 });
domainSchema.index({ status: 1 });
domainSchema.index({ createdAt: -1 });

// Update statistics before saving
domainSchema.pre('save', function(next) {
  this.statistics.totalSubdomains = this.subdomains.filter(s => s.isActive).length;
  this.statistics.totalEndpoints = this.endpoints.filter(e => e.isActive).length;
  this.statistics.publicEndpoints = this.endpoints.filter(e => e.isActive && e.isPublic).length;
  this.updatedAt = new Date();
  next();
});

// Method to add subdomain
domainSchema.methods.addSubdomain = function(subdomainData) {
  const existing = this.subdomains.find(s => s.subdomain === subdomainData.subdomain);
  if (!existing) {
    this.subdomains.push(subdomainData);
  } else {
    // Update existing subdomain data
    Object.assign(existing, subdomainData);
    existing.lastSeen = new Date();
  }
};

// Method to add endpoint
domainSchema.methods.addEndpoint = function(endpointData) {
  const existing = this.endpoints.find(e => e.url === endpointData.url && e.method === endpointData.method);
  if (!existing) {
    this.endpoints.push(endpointData);
  } else {
    // Update existing endpoint data
    Object.assign(existing, endpointData);
    existing.lastChecked = new Date();
  }
};

// Method to get active endpoints
domainSchema.methods.getActiveEndpoints = function() {
  return this.endpoints.filter(endpoint => endpoint.isActive);
};

// Method to get zombie endpoints (not seen in last scan)
domainSchema.methods.getZombieEndpoints = function(daysSinceLastSeen = 30) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - daysSinceLastSeen);
  
  return this.endpoints.filter(endpoint => 
    endpoint.isActive && 
    endpoint.lastChecked < threshold
  );
};

export default mongoose.model('Domain', domainSchema);
