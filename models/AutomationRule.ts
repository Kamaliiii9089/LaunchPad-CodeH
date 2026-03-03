import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITriggerCondition {
  type: 'event' | 'threshold' | 'time' | 'manual';
  eventType?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  field?: string;
  operator?: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'regex';
  value?: string | number;
  threshold?: number;
  timePattern?: string; // cron expression
}

export interface IAction {
  id: string;
  type: 'block_ip' | 'notify' | 'create_investigation' | 'update_status' | 'execute_script' | 'api_call' | 'quarantine' | 'email';
  config: {
    [key: string]: any;
  };
  requiresApproval: boolean;
  retryOnFailure: boolean;
  maxRetries?: number;
  timeout?: number;
}

export interface IWorkflowStep {
  id: string;
  name: string;
  action: IAction;
  nextStep?: string; // Next step ID
  conditionalBranches?: {
    condition: string; // JavaScript expression
    nextStep: string;
  }[];
  onError?: string; // Error handler step ID
}

export interface IAutomationRule extends Document {
  name: string;
  description: string;
  enabled: boolean;
  priority: number; // Higher number = higher priority
  tags: string[];
  
  // Trigger
  trigger: ITriggerCondition;
  
  // Conditions (AND logic)
  conditions: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'regex';
    value: any;
  }[];
  
  // Actions (can be simple or workflow)
  actionType: 'simple' | 'workflow';
  actions: IAction[]; // For simple rules
  workflowId?: mongoose.Types.ObjectId; // For workflow-based rules
  
  // Execution settings
  throttle?: {
    enabled: boolean;
    maxExecutions: number;
    timeWindow: number; // in seconds
  };
  
  // Metadata
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  executionCount: number;
  successCount: number;
  failureCount: number;
  
  // Approval
  requiresGlobalApproval: boolean;
  approvers?: mongoose.Types.ObjectId[];
}

const AutomationRuleSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  priority: { type: Number, default: 0 },
  tags: [{ type: String }],
  
  trigger: {
    type: {
      type: String,
      enum: ['event', 'threshold', 'time', 'manual'],
      required: true
    },
    eventType: String,
    severity: String,
    field: String,
    operator: String,
    value: Schema.Types.Mixed,
    threshold: Number,
    timePattern: String,
  },
  
  conditions: [{
    field: { type: String, required: true },
    operator: { type: String, required: true },
    value: Schema.Types.Mixed
  }],
  
  actionType: {
    type: String,
    enum: ['simple', 'workflow'],
    default: 'simple'
  },
  
  actions: [{
    id: { type: String, required: true },
    type: { type: String, required: true },
    config: { type: Map, of: Schema.Types.Mixed },
    requiresApproval: { type: Boolean, default: false },
    retryOnFailure: { type: Boolean, default: true },
    maxRetries: { type: Number, default: 3 },
    timeout: { type: Number, default: 30000 }
  }],
  
  workflowId: { type: Schema.Types.ObjectId, ref: 'Workflow' },
  
  throttle: {
    enabled: { type: Boolean, default: false },
    maxExecutions: { type: Number, default: 10 },
    timeWindow: { type: Number, default: 3600 }
  },
  
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastExecutedAt: Date,
  executionCount: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  
  requiresGlobalApproval: { type: Boolean, default: false },
  approvers: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

// Indexes
AutomationRuleSchema.index({ enabled: 1, priority: -1 });
AutomationRuleSchema.index({ createdBy: 1 });
AutomationRuleSchema.index({ tags: 1 });
AutomationRuleSchema.index({ 'trigger.type': 1, 'trigger.eventType': 1 });

const AutomationRule: Model<IAutomationRule> = 
  mongoose.models.AutomationRule || mongoose.model<IAutomationRule>('AutomationRule', AutomationRuleSchema);

export default AutomationRule;
