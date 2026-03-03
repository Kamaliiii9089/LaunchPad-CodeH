import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWorkflow extends Document {
  name: string;
  description: string;
  version: number;
  status: 'draft' | 'active' | 'deprecated';
  tags: string[];
  
  // Workflow definition
  steps: {
    id: string;
    name: string;
    type: 'action' | 'condition' | 'parallel' | 'delay';
    
    // For action steps
    actionType?: 'block_ip' | 'notify' | 'create_investigation' | 'update_status' | 'execute_script' | 'api_call' | 'quarantine' | 'email';
    actionConfig?: Map<string, any>;
    requiresApproval?: boolean;
    
    // For condition steps
    condition?: string; // JavaScript expression
    
    // For parallel steps
    parallelSteps?: string[]; // Array of step IDs to execute in parallel
    
    // For delay steps
    delayMs?: number;
    
    // Navigation
    nextStep?: string;
    onSuccess?: string;
    onFailure?: string;
    conditionalBranches?: {
      condition: string;
      nextStep: string;
    }[];
    
    // Execution settings
    timeout?: number;
    retryOnFailure?: boolean;
    maxRetries?: number;
  }[];
  
  // Variables that can be used in workflow
  variables: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object';
    defaultValue?: any;
    description?: string;
  }[];
  
  // Metadata
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageExecutionTime: number; // in milliseconds
}

const WorkflowSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  version: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ['draft', 'active', 'deprecated'],
    default: 'draft'
  },
  tags: [{ type: String }],
  
  steps: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['action', 'condition', 'parallel', 'delay'],
      required: true
    },
    
    actionType: String,
    actionConfig: { type: Map, of: Schema.Types.Mixed },
    requiresApproval: { type: Boolean, default: false },
    
    condition: String,
    
    parallelSteps: [String],
    
    delayMs: Number,
    
    nextStep: String,
    onSuccess: String,
    onFailure: String,
    conditionalBranches: [{
      condition: String,
      nextStep: String
    }],
    
    timeout: { type: Number, default: 30000 },
    retryOnFailure: { type: Boolean, default: true },
    maxRetries: { type: Number, default: 3 }
  }],
  
  variables: [{
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['string', 'number', 'boolean', 'object'],
      required: true
    },
    defaultValue: Schema.Types.Mixed,
    description: String
  }],
  
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  executionCount: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  averageExecutionTime: { type: Number, default: 0 }
});

// Indexes
WorkflowSchema.index({ status: 1 });
WorkflowSchema.index({ createdBy: 1 });
WorkflowSchema.index({ tags: 1 });

const Workflow: Model<IWorkflow> = 
  mongoose.models.Workflow || mongoose.model<IWorkflow>('Workflow', WorkflowSchema);

export default Workflow;
