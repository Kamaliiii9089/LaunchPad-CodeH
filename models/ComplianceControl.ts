import mongoose, { Document, Schema } from 'mongoose';

export interface IComplianceControl extends Document {
  // Control Identification
  controlId: string; // e.g., "AC-001", "ENC-002"
  name: string;
  description: string;
  category: 'access_control' | 'encryption' | 'audit_logging' | 'network_security' | 
            'data_protection' | 'incident_response' | 'backup_recovery' | 'physical_security' |
            'authentication' | 'monitoring' | 'training' | 'documentation';
  
  // Framework Mapping
  frameworks: {
    frameworkId: mongoose.Types.ObjectId;
    requirementIds: mongoose.Types.ObjectId[];
    mappedRequirements: string[]; // e.g., ["GDPR-Art-32", "HIPAA-164.308"]
  }[];
  
  // Control Details
  type: 'preventive' | 'detective' | 'corrective' | 'compensating';
  automationLevel: 'manual' | 'semi-automated' | 'fully-automated';
  implementationType: 'technical' | 'administrative' | 'physical';
  
  // Implementation Status
  status: 'implemented' | 'partial' | 'planned' | 'not_implemented' | 'not_applicable';
  implementationDate?: Date;
  implementationPercentage: number; // 0-100
  
  // Effectiveness
  effectiveness: 'effective' | 'partially_effective' | 'ineffective' | 'not_tested';
  effectivenessScore: number; // 0-100
  lastTestDate?: Date;
  nextTestDue?: Date;
  testFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  
  // Testing & Validation
  testingProcedure: string;
  testResults: {
    date: Date;
    tester: mongoose.Types.ObjectId;
    result: 'passed' | 'failed' | 'partial';
    findings: string;
    evidence: string[];
    recommendations: string[];
  }[];
  
  // Technical Implementation
  technicalDetails: {
    system: string;
    component: string;
    configuration: any;
    scripts: string[];
    dependencies: string[];
  };
  
  // Monitoring
  isMonitored: boolean;
  monitoringMethod?: 'automated_scan' | 'manual_review' | 'continuous_monitoring' | 'log_analysis';
  monitoringFrequency?: string;
  alertsEnabled: boolean;
  
  // Documentation
  documentation: {
    procedureDocument?: string;
    trainingMaterial?: string;
    evidenceLocations: string[];
    lastReviewDate?: Date;
    reviewer?: mongoose.Types.ObjectId;
  };
  
  // Responsibility
  owner: mongoose.Types.ObjectId;
  implementer: mongoose.Types.ObjectId;
  approver?: mongoose.Types.ObjectId;
  
  // Risk & Gaps
  identifiedGaps: {
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    identifiedDate: Date;
    remediationPlan?: string;
    targetDate?: Date;
    status: 'open' | 'in_progress' | 'resolved' | 'accepted';
  }[];
  
  // Cost & Resources
  implementationCost?: number;
  maintenanceCost?: number;
  resourcesRequired: string[];
  
  // Audit Trail
  auditHistory: {
    date: Date;
    auditor: mongoose.Types.ObjectId;
    finding: string;
    status: 'compliant' | 'non_compliant' | 'needs_improvement';
    evidence: string[];
    followUpRequired: boolean;
  }[];
  
  // Dependencies
  dependencies: mongoose.Types.ObjectId[]; // Other controls this depends on
  relatedControls: mongoose.Types.ObjectId[];
  
  // Metadata
  tags: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  notes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ComplianceControlSchema = new Schema<IComplianceControl>({
  controlId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['access_control', 'encryption', 'audit_logging', 'network_security', 
           'data_protection', 'incident_response', 'backup_recovery', 'physical_security',
           'authentication', 'monitoring', 'training', 'documentation'],
    required: true,
  },
  
  frameworks: [{
    frameworkId: {
      type: Schema.Types.ObjectId,
      ref: 'ComplianceFramework',
    },
    requirementIds: [{
      type: Schema.Types.ObjectId,
      ref: 'ComplianceRequirement',
    }],
    mappedRequirements: [String],
  }],
  
  type: {
    type: String,
    enum: ['preventive', 'detective', 'corrective', 'compensating'],
    required: true,
  },
  automationLevel: {
    type: String,
    enum: ['manual', 'semi-automated', 'fully-automated'],
    default: 'manual',
  },
  implementationType: {
    type: String,
    enum: ['technical', 'administrative', 'physical'],
    required: true,
  },
  
  status: {
    type: String,
    enum: ['implemented', 'partial', 'planned', 'not_implemented', 'not_applicable'],
    default: 'planned',
  },
  implementationDate: Date,
  implementationPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  
  effectiveness: {
    type: String,
    enum: ['effective', 'partially_effective', 'ineffective', 'not_tested'],
    default: 'not_tested',
  },
  effectivenessScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  lastTestDate: Date,
  nextTestDue: Date,
  testFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual'],
    default: 'quarterly',
  },
  
  testingProcedure: String,
  testResults: [{
    date: Date,
    tester: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    result: {
      type: String,
      enum: ['passed', 'failed', 'partial'],
    },
    findings: String,
    evidence: [String],
    recommendations: [String],
  }],
  
  technicalDetails: {
    system: String,
    component: String,
    configuration: Schema.Types.Mixed,
    scripts: [String],
    dependencies: [String],
  },
  
  isMonitored: {
    type: Boolean,
    default: false,
  },
  monitoringMethod: {
    type: String,
    enum: ['automated_scan', 'manual_review', 'continuous_monitoring', 'log_analysis'],
  },
  monitoringFrequency: String,
  alertsEnabled: {
    type: Boolean,
    default: false,
  },
  
  documentation: {
    procedureDocument: String,
    trainingMaterial: String,
    evidenceLocations: [String],
    lastReviewDate: Date,
    reviewer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  implementer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  approver: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  
  identifiedGaps: [{
    description: String,
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
    },
    identifiedDate: Date,
    remediationPlan: String,
    targetDate: Date,
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'accepted'],
      default: 'open',
    },
  }],
  
  implementationCost: Number,
  maintenanceCost: Number,
  resourcesRequired: [String],
  
  auditHistory: [{
    date: Date,
    auditor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    finding: String,
    status: {
      type: String,
      enum: ['compliant', 'non_compliant', 'needs_improvement'],
    },
    evidence: [String],
    followUpRequired: {
      type: Boolean,
      default: false,
    },
  }],
  
  dependencies: [{
    type: Schema.Types.ObjectId,
    ref: 'ComplianceControl',
  }],
  relatedControls: [{
    type: Schema.Types.ObjectId,
    ref: 'ComplianceControl',
  }],
  
  tags: [String],
  priority: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium',
  },
  notes: String,
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
ComplianceControlSchema.index({ controlId: 1 });
ComplianceControlSchema.index({ category: 1, status: 1 });
ComplianceControlSchema.index({ 'frameworks.frameworkId': 1 });
ComplianceControlSchema.index({ effectiveness: 1, effectivenessScore: -1 });
ComplianceControlSchema.index({ priority: 1, status: 1 });
ComplianceControlSchema.index({ tags: 1 });

export default mongoose.models.ComplianceControl || mongoose.model<IComplianceControl>('ComplianceControl', ComplianceControlSchema);
