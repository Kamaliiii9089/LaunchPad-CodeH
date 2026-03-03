import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IApprovalRequest extends Document {
  type: 'rule_execution' | 'workflow_step' | 'action';
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // What needs approval
  ruleId?: mongoose.Types.ObjectId;
  workflowId?: mongoose.Types.ObjectId;
  actionType: string;
  actionConfig: Map<string, any>;
  
  // Context
  triggerEvent?: {
    eventId: string;
    eventType: string;
    severity: string;
    description: string;
  };
  
  reason: string;
  impact: string;
  reversible: boolean;
  
  // Approval details
  requestedBy: mongoose.Types.ObjectId;
  requestedAt: Date;
  approvers: mongoose.Types.ObjectId[];
  
  // Resolution
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewNotes?: string;
  
  // Expiration
  expiresAt: Date;
  
  // Execution tracking
  executedAt?: Date;
  executionStatus?: 'success' | 'failure';
  executionError?: string;
  executionResult?: Map<string, any>;
}

const ApprovalRequestSchema: Schema = new Schema({
  type: {
    type: String,
    enum: ['rule_execution', 'workflow_step', 'action'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'expired'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  ruleId: { type: Schema.Types.ObjectId, ref: 'AutomationRule' },
  workflowId: { type: Schema.Types.ObjectId, ref: 'Workflow' },
  actionType: { type: String, required: true },
  actionConfig: { type: Map, of: Schema.Types.Mixed },
  
  triggerEvent: {
    eventId: String,
    eventType: String,
    severity: String,
    description: String
  },
  
  reason: { type: String, required: true },
  impact: { type: String, required: true },
  reversible: { type: Boolean, default: false },
  
  requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  requestedAt: { type: Date, default: Date.now },
  approvers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  reviewNotes: String,
  
  expiresAt: { type: Date, required: true },
  
  executedAt: Date,
  executionStatus: String,
  executionError: String,
  executionResult: { type: Map, of: Schema.Types.Mixed }
});

// Indexes
ApprovalRequestSchema.index({ status: 1, priority: -1 });
ApprovalRequestSchema.index({ requestedBy: 1 });
ApprovalRequestSchema.index({ approvers: 1, status: 1 });
ApprovalRequestSchema.index({ expiresAt: 1 });
ApprovalRequestSchema.index({ ruleId: 1 });
ApprovalRequestSchema.index({ workflowId: 1 });

const ApprovalRequest: Model<IApprovalRequest> = 
  mongoose.models.ApprovalRequest || mongoose.model<IApprovalRequest>('ApprovalRequest', ApprovalRequestSchema);

export default ApprovalRequest;
