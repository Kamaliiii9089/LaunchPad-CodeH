import mongoose from 'mongoose';

export interface IResponseAction {
  stepId: string;
  stepName: string;
  stepType: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  result?: any;
  error?: string;
  retryAttempt: number;
}

export interface IIncidentResponse extends mongoose.Document {
  // Incident details
  incidentId: string; // Reference to the security event
  incidentType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Playbook execution
  playbookId: mongoose.Types.ObjectId;
  playbookName: string;
  playbookVersion: number;
  
  // Execution status
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'awaiting_approval';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  
  // Actions taken
  actions: IResponseAction[];
  currentStep?: string;
  
  // Approval
  requiresApproval: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedBy?: mongoose.Types.ObjectId;
  approvalTime?: Date;
  approvalNotes?: string;
  
  // Trigger information
  triggeredBy: 'auto' | 'manual' | 'scheduled';
  triggeredByUser?: mongoose.Types.ObjectId;
  triggerReason?: string;
  
  // Results and impact
  threatsBlocked: number;
  systemsQuarantined: number;
  ipsBlocked: number;
  notificationsSent: number;
  ticketsCreated: number;
  
  // Evidence and artifacts
  evidenceCollected: {
    type: string;
    location: string;
    size?: number;
    collectedAt: Date;
  }[];
  
  // Outcome assessment
  effectiveness?: 'effective' | 'partially_effective' | 'ineffective';
  impactScore?: number; // 0-100
  notes?: string;
  
  // Error handling
  errorLog: {
    step: string;
    error: string;
    timestamp: Date;
  }[];
  
  createdAt: Date;
  updatedAt: Date;
}

const ResponseActionSchema = new mongoose.Schema({
  stepId: { type: String, required: true },
  stepName: { type: String, required: true },
  stepType: { type: String, required: true },
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'running', 'success', 'failed', 'skipped'],
    default: 'pending'
  },
  startTime: Date,
  endTime: Date,
  duration: Number,
  result: mongoose.Schema.Types.Mixed,
  error: String,
  retryAttempt: { type: Number, default: 0 },
});

const IncidentResponseSchema = new mongoose.Schema({
  incidentId: { type: String, required: true },
  incidentType: { type: String, required: true },
  severity: { 
    type: String, 
    required: true,
    enum: ['low', 'medium', 'high', 'critical']
  },
  
  playbookId: { type: mongoose.Schema.Types.ObjectId, ref: 'IncidentPlaybook', required: true },
  playbookName: { type: String, required: true },
  playbookVersion: { type: Number, default: 1 },
  
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled', 'awaiting_approval'],
    default: 'pending'
  },
  startTime: Date,
  endTime: Date,
  duration: Number,
  
  actions: [ResponseActionSchema],
  currentStep: String,
  
  requiresApproval: { type: Boolean, default: false },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'] },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvalTime: Date,
  approvalNotes: String,
  
  triggeredBy: { 
    type: String, 
    required: true,
    enum: ['auto', 'manual', 'scheduled']
  },
  triggeredByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  triggerReason: String,
  
  threatsBlocked: { type: Number, default: 0 },
  systemsQuarantined: { type: Number, default: 0 },
  ipsBlocked: { type: Number, default: 0 },
  notificationsSent: { type: Number, default: 0 },
  ticketsCreated: { type: Number, default: 0 },
  
  evidenceCollected: [{
    type: { type: String, required: true },
    location: { type: String, required: true },
    size: Number,
    collectedAt: { type: Date, default: Date.now }
  }],
  
  effectiveness: { type: String, enum: ['effective', 'partially_effective', 'ineffective'] },
  impactScore: { type: Number, min: 0, max: 100 },
  notes: String,
  
  errorLog: [{
    step: String,
    error: String,
    timestamp: { type: Date, default: Date.now }
  }],
}, {
  timestamps: true,
});

// Indexes
IncidentResponseSchema.index({ incidentId: 1 });
IncidentResponseSchema.index({ playbookId: 1 });
IncidentResponseSchema.index({ status: 1, createdAt: -1 });
IncidentResponseSchema.index({ severity: 1, status: 1 });
IncidentResponseSchema.index({ triggeredBy: 1 });

export default mongoose.models.IncidentResponse || mongoose.model<IIncidentResponse>('IncidentResponse', IncidentResponseSchema);
