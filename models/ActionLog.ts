import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IActionLog extends Document {
  // Reference
  ruleId?: mongoose.Types.ObjectId;
  workflowId?: mongoose.Types.ObjectId;
  executionId: string; // Unique ID for this execution chain
  stepId?: string; // For workflow steps
  
  // Action details
  actionType: string;
  actionConfig: Map<string, any>;
  
  // Trigger context
  triggeredBy: 'rule' | 'workflow' | 'manual' | 'scheduled';
  triggerUserId?: mongoose.Types.ObjectId;
  triggerEvent?: {
    eventId: string;
    eventType: string;
    severity: string;
  };
  
  // Execution
  status: 'pending' | 'running' | 'success' | 'failure' | 'cancelled' | 'awaiting_approval';
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // in milliseconds
  
  // Results
  result?: Map<string, any>;
  error?: string;
  stackTrace?: string;
  
  // Retry tracking
  attemptNumber: number;
  maxAttempts: number;
  
  // Approval
  approvalRequestId?: mongoose.Types.ObjectId;
  
  // Metadata
  metadata: Map<string, any>;
}

const ActionLogSchema: Schema = new Schema({
  ruleId: { type: Schema.Types.ObjectId, ref: 'AutomationRule' },
  workflowId: { type: Schema.Types.ObjectId, ref: 'Workflow' },
  executionId: { type: String, required: true, index: true },
  stepId: String,
  
  actionType: { type: String, required: true },
  actionConfig: { type: Map, of: Schema.Types.Mixed },
  
  triggeredBy: {
    type: String,
    enum: ['rule', 'workflow', 'manual', 'scheduled'],
    required: true
  },
  triggerUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  triggerEvent: {
    eventId: String,
    eventType: String,
    severity: String
  },
  
  status: {
    type: String,
    enum: ['pending', 'running', 'success', 'failure', 'cancelled', 'awaiting_approval'],
    default: 'pending'
  },
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
  duration: Number,
  
  result: { type: Map, of: Schema.Types.Mixed },
  error: String,
  stackTrace: String,
  
  attemptNumber: { type: Number, default: 1 },
  maxAttempts: { type: Number, default: 3 },
  
  approvalRequestId: { type: Schema.Types.ObjectId, ref: 'ApprovalRequest' },
  
  metadata: { type: Map, of: Schema.Types.Mixed }
});

// Indexes
ActionLogSchema.index({ executionId: 1, startedAt: -1 });
ActionLogSchema.index({ ruleId: 1, startedAt: -1 });
ActionLogSchema.index({ workflowId: 1, startedAt: -1 });
ActionLogSchema.index({ status: 1, startedAt: -1 });
ActionLogSchema.index({ triggerUserId: 1 });
ActionLogSchema.index({ actionType: 1 });

const ActionLog: Model<IActionLog> = 
  mongoose.models.ActionLog || mongoose.model<IActionLog>('ActionLog', ActionLogSchema);

export default ActionLog;
