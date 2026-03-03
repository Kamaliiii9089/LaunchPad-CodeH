import mongoose, { Document, Schema } from 'mongoose';

export interface IComplianceAuditLog extends Document {
  // Event Information
  eventType: 'assessment' | 'control_test' | 'requirement_update' | 'evidence_upload' | 
             'gap_identified' | 'remediation' | 'report_generated' | 'access' | 
             'data_modification' | 'policy_violation' | 'exception_granted' | 'certification';
  
  action: string; // e.g., "Assessed GDPR compliance", "Uploaded evidence for HIPAA-164.308"
  description: string;
  
  // Context
  frameworkId?: mongoose.Types.ObjectId;
  requirementId?: mongoose.Types.ObjectId;
  controlId?: mongoose.Types.ObjectId;
  
  // Actor Information
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  userRole: string;
  ipAddress: string;
  userAgent: string;
  
  // Resource Details
  resourceType?: 'framework' | 'requirement' | 'control' | 'audit_log' | 'report' | 'evidence';
  resourceId?: string;
  
  // Changes
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  
  // Compliance Impact
  complianceImpact: {
    affected: boolean;
    impactLevel?: 'critical' | 'high' | 'medium' | 'low';
    frameworksAffected?: string[];
    requirementsAffected?: string[];
  };
  
  // Status & Result
  status: 'success' | 'failure' | 'partial' | 'pending';
  result?: any;
  errorMessage?: string;
  
  // Evidence & Metadata
  evidence?: {
    type: string;
    url: string;
    hash?: string;
  }[];
  
  // Audit Trail Integrity
  previousLogId?: mongoose.Types.ObjectId;
  logHash?: string; // Hash of this log entry for integrity
  verified: boolean;
  
  // Retention
  retentionPeriod: number; // in days
  expiresAt?: Date;
  
  // Tags & Classification
  tags: string[];
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  
  // Metadata
  timestamp: Date;
  createdAt: Date;
}

const ComplianceAuditLogSchema = new Schema<IComplianceAuditLog>({
  eventType: {
    type: String,
    enum: ['assessment', 'control_test', 'requirement_update', 'evidence_upload', 
           'gap_identified', 'remediation', 'report_generated', 'access', 
           'data_modification', 'policy_violation', 'exception_granted', 'certification'],
    required: true,
  },
  
  action: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  
  frameworkId: {
    type: Schema.Types.ObjectId,
    ref: 'ComplianceFramework',
  },
  requirementId: {
    type: Schema.Types.ObjectId,
    ref: 'ComplianceRequirement',
  },
  controlId: {
    type: Schema.Types.ObjectId,
    ref: 'ComplianceControl',
  },
  
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  userRole: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
  
  resourceType: {
    type: String,
    enum: ['framework', 'requirement', 'control', 'audit_log', 'report', 'evidence'],
  },
  resourceId: String,
  
  changes: [{
    field: String,
    oldValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed,
  }],
  
  complianceImpact: {
    affected: {
      type: Boolean,
      default: false,
    },
    impactLevel: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
    },
    frameworksAffected: [String],
    requirementsAffected: [String],
  },
  
  status: {
    type: String,
    enum: ['success', 'failure', 'partial', 'pending'],
    default: 'success',
  },
  result: Schema.Types.Mixed,
  errorMessage: String,
  
  evidence: [{
    type: String,
    url: String,
    hash: String,
  }],
  
  previousLogId: {
    type: Schema.Types.ObjectId,
    ref: 'ComplianceAuditLog',
  },
  logHash: String,
  verified: {
    type: Boolean,
    default: false,
  },
  
  retentionPeriod: {
    type: Number,
    default: 2555, // 7 years in days (common for HIPAA, SOX)
  },
  expiresAt: Date,
  
  tags: [String],
  sensitivity: {
    type: String,
    enum: ['public', 'internal', 'confidential', 'restricted'],
    default: 'internal',
  },
  
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: { createdAt: true, updatedAt: false }, // Audit logs should not be updated
});

// Indexes
ComplianceAuditLogSchema.index({ eventType: 1, timestamp: -1 });
ComplianceAuditLogSchema.index({ userId: 1, timestamp: -1 });
ComplianceAuditLogSchema.index({ frameworkId: 1, timestamp: -1 });
ComplianceAuditLogSchema.index({ requirementId: 1, timestamp: -1 });
ComplianceAuditLogSchema.index({ controlId: 1, timestamp: -1 });
ComplianceAuditLogSchema.index({ 'complianceImpact.affected': 1, 'complianceImpact.impactLevel': 1 });
ComplianceAuditLogSchema.index({ tags: 1 });
ComplianceAuditLogSchema.index({ expiresAt: 1 }); // For TTL cleanup

// Prevent modifications to audit logs
ComplianceAuditLogSchema.pre('save', function(next) {
  if (!this.isNew) {
    throw new Error('Audit logs cannot be modified after creation');
  }
  
  // Calculate expiration date
  if (!this.expiresAt) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + this.retentionPeriod);
    this.expiresAt = expirationDate;
  }
  
  next();
});

export default mongoose.models.ComplianceAuditLog || mongoose.model<IComplianceAuditLog>('ComplianceAuditLog', ComplianceAuditLogSchema);
