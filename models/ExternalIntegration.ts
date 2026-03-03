import mongoose from 'mongoose';

export interface IExternalIntegration extends mongoose.Document {
  name: string;
  type: 'siem' | 'edr' | 'soar' | 'ticketing' | 'notification' | 'threat_intel' | 'firewall';
  provider: string; // e.g., 'Splunk', 'QRadar', 'CrowdStrike', 'Carbon Black', 'Jira', 'Slack'
  
  // Connection details
  enabled: boolean;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  
  // Configuration
  config: {
    baseUrl?: string;
    apiKey?: string;
    apiSecret?: string;
    username?: string;
    password?: string;
    token?: string;
    webhookUrl?: string;
    timeout?: number;
    retryAttempts?: number;
    [key: string]: any;
  };
  
  // Capabilities
  capabilities: {
    canReceiveAlerts?: boolean;
    canSendAlerts?: boolean;
    canExecuteActions?: boolean;
    canQueryData?: boolean;
    supportedActions?: string[]; // ['block_ip', 'isolate_host', 'create_ticket']
  };
  
  // Usage statistics
  lastSync?: Date;
  lastError?: string;
  alertsSent: number;
  alertsReceived: number;
  actionsExecuted: number;
  
  // Rate limiting
  rateLimitPerMinute?: number;
  rateLimitPerHour?: number;
  
  // Health check
  healthCheckUrl?: string;
  healthCheckInterval?: number; // minutes
  lastHealthCheck?: Date;
  healthStatus?: 'healthy' | 'degraded' | 'down';
  
  // Security
  encryptCredentials: boolean;
  useTLS: boolean;
  verifySSL: boolean;
  
  // Metadata
  createdBy: mongoose.Types.ObjectId;
  tags: string[];
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const ExternalIntegrationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['siem', 'edr', 'soar', 'ticketing', 'notification', 'threat_intel', 'firewall']
  },
  provider: { type: String, required: true },
  
  enabled: { type: Boolean, default: true },
  status: { 
    type: String, 
    required: true,
    enum: ['connected', 'disconnected', 'error', 'pending'],
    default: 'pending'
  },
  
  config: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    default: {}
  },
  
  capabilities: {
    canReceiveAlerts: { type: Boolean, default: false },
    canSendAlerts: { type: Boolean, default: false },
    canExecuteActions: { type: Boolean, default: false },
    canQueryData: { type: Boolean, default: false },
    supportedActions: [{ type: String }]
  },
  
  lastSync: Date,
  lastError: String,
  alertsSent: { type: Number, default: 0 },
  alertsReceived: { type: Number, default: 0 },
  actionsExecuted: { type: Number, default: 0 },
  
  rateLimitPerMinute: Number,
  rateLimitPerHour: Number,
  
  healthCheckUrl: String,
  healthCheckInterval: { type: Number, default: 5 },
  lastHealthCheck: Date,
  healthStatus: { type: String, enum: ['healthy', 'degraded', 'down'] },
  
  encryptCredentials: { type: Boolean, default: true },
  useTLS: { type: Boolean, default: true },
  verifySSL: { type: Boolean, default: true },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tags: [{ type: String }],
  notes: String,
}, {
  timestamps: true,
});

// Indexes
ExternalIntegrationSchema.index({ type: 1, enabled: 1 });
ExternalIntegrationSchema.index({ status: 1 });
ExternalIntegrationSchema.index({ provider: 1 });

export default mongoose.models.ExternalIntegration || mongoose.model<IExternalIntegration>('ExternalIntegration', ExternalIntegrationSchema);
