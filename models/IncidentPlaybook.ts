import mongoose from 'mongoose';

export interface IPlaybookStep {
  id: string;
  type: 'investigate' | 'block_ip' | 'quarantine' | 'notify' | 'escalate' | 'isolate_system' | 'collect_evidence' | 'create_ticket' | 'update_status';
  name: string;
  description: string;
  config: {
    // For block_ip
    duration?: number; // Duration in minutes, 0 for permanent
    blockType?: 'firewall' | 'waf' | 'both';
    
    // For quarantine
    quarantineTarget?: 'file' | 'user' | 'device' | 'network';
    quarantineDuration?: number;
    
    // For notify
    notificationChannels?: string[]; // ['email', 'slack', 'sms', 'webhook']
    recipients?: string[];
    message?: string;
    
    // For escalate
    escalateTo?: string; // User ID or team ID
    priority?: 'low' | 'medium' | 'high' | 'critical';
    
    // For isolate_system
    isolationType?: 'network' | 'full' | 'partial';
    
    // For collect_evidence
    evidenceTypes?: string[]; // ['logs', 'network_traffic', 'memory_dump', 'disk_image']
    
    // For create_ticket
    ticketSystem?: 'jira' | 'servicenow' | 'zendesk' | 'custom';
    ticketDetails?: any;
    
    // Generic config
    timeout?: number;
    retryAttempts?: number;
    [key: string]: any;
  };
  condition?: {
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in';
    value: any;
  };
  nextStep?: string; // ID of next step
  onSuccess?: string; // ID of step to execute on success
  onFailure?: string; // ID of step to execute on failure
}

export interface IIncidentPlaybook extends mongoose.Document {
  name: string;
  description: string;
  threatTypes: string[]; // Types of threats this playbook handles
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  autoTrigger: boolean; // Whether to automatically trigger when threat detected
  steps: IPlaybookStep[];
  
  // Trigger conditions
  triggerConditions: {
    threatType?: string[];
    severity?: string[];
    source?: string[]; // IP addresses or ranges
    target?: string[];
    customConditions?: any;
  };
  
  // SLA and timing
  expectedDuration: number; // Expected execution time in minutes
  slaMinutes: number; // Maximum time allowed
  
  // Approval requirements
  requiresApproval: boolean;
  approvers: mongoose.Types.ObjectId[]; // User IDs who can approve
  
  // Metadata
  createdBy: mongoose.Types.ObjectId;
  tags: string[];
  category: 'malware' | 'intrusion' | 'data_breach' | 'ddos' | 'phishing' | 'insider_threat' | 'other';
  version: number;
  
  // Statistics
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageDuration: number;
  lastExecuted?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const PlaybookStepSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['investigate', 'block_ip', 'quarantine', 'notify', 'escalate', 'isolate_system', 'collect_evidence', 'create_ticket', 'update_status']
  },
  name: { type: String, required: true },
  description: String,
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
  condition: {
    field: String,
    operator: { type: String, enum: ['equals', 'contains', 'greater_than', 'less_than', 'in'] },
    value: mongoose.Schema.Types.Mixed
  },
  nextStep: String,
  onSuccess: String,
  onFailure: String,
});

const IncidentPlaybookSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  threatTypes: [{ type: String }],
  severity: { 
    type: String, 
    required: true,
    enum: ['low', 'medium', 'high', 'critical']
  },
  enabled: { type: Boolean, default: true },
  autoTrigger: { type: Boolean, default: false },
  steps: [PlaybookStepSchema],
  
  triggerConditions: {
    threatType: [String],
    severity: [String],
    source: [String],
    target: [String],
    customConditions: mongoose.Schema.Types.Mixed
  },
  
  expectedDuration: { type: Number, default: 15 },
  slaMinutes: { type: Number, default: 30 },
  
  requiresApproval: { type: Boolean, default: false },
  approvers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tags: [{ type: String }],
  category: { 
    type: String,
    enum: ['malware', 'intrusion', 'data_breach', 'ddos', 'phishing', 'insider_threat', 'other'],
    default: 'other'
  },
  version: { type: Number, default: 1 },
  
  executionCount: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  averageDuration: { type: Number, default: 0 },
  lastExecuted: Date,
}, {
  timestamps: true,
});

// Indexes
IncidentPlaybookSchema.index({ threatTypes: 1, enabled: 1 });
IncidentPlaybookSchema.index({ autoTrigger: 1, enabled: 1 });
IncidentPlaybookSchema.index({ category: 1 });
IncidentPlaybookSchema.index({ tags: 1 });

export default mongoose.models.IncidentPlaybook || mongoose.model<IIncidentPlaybook>('IncidentPlaybook', IncidentPlaybookSchema);
