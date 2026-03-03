import mongoose, { Document, Schema } from 'mongoose';

export interface IComplianceRequirement extends Document {
  frameworkId: mongoose.Types.ObjectId;
  
  // Requirement Identification
  requirementId: string; // e.g., "GDPR-Art-32", "HIPAA-164.308"
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  
  // Requirement Details
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: 'technical' | 'administrative' | 'physical' | 'procedural';
  mandatory: boolean;
  
  // Implementation
  implementationGuide: string;
  evidenceRequired: string[];
  testingProcedures: string[];
  
  // Status Tracking
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable' | 'in_progress';
  compliancePercentage: number; // 0-100
  
  // Control Mapping
  controls: mongoose.Types.ObjectId[];
  controlCount: number;
  implementedControlCount: number;
  
  // Assessment
  lastAssessmentDate?: Date;
  nextAssessmentDue?: Date;
  assessmentFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  assessor?: mongoose.Types.ObjectId;
  
  // Evidence & Documentation
  evidence: {
    type: 'document' | 'screenshot' | 'log' | 'certificate' | 'policy' | 'procedure';
    name: string;
    url: string;
    uploadedBy: mongoose.Types.ObjectId;
    uploadedAt: Date;
    verified: boolean;
  }[];
  
  // Risk & Impact
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  impactOfNonCompliance: string;
  potentialPenalty?: string;
  
  // Remediation
  remediationPlan?: {
    description: string;
    steps: string[];
    assignedTo: mongoose.Types.ObjectId;
    dueDate: Date;
    status: 'pending' | 'in_progress' | 'completed' | 'blocked';
    completedAt?: Date;
  };
  
  // Dependencies
  dependencies: mongoose.Types.ObjectId[]; // Other requirements that must be met first
  relatedRequirements: mongoose.Types.ObjectId[];
  
  // Audit Trail
  complianceHistory: {
    date: Date;
    status: string;
    score: number;
    assessor: mongoose.Types.ObjectId;
    findings: string;
    recommendations: string[];
  }[];
  
  // Metadata
  owner: mongoose.Types.ObjectId;
  assignedTo: mongoose.Types.ObjectId[];
  tags: string[];
  notes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ComplianceRequirementSchema = new Schema<IComplianceRequirement>({
  frameworkId: {
    type: Schema.Types.ObjectId,
    ref: 'ComplianceFramework',
    required: true,
  },
  
  requirementId: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  subcategory: String,
  
  priority: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium',
  },
  type: {
    type: String,
    enum: ['technical', 'administrative', 'physical', 'procedural'],
    required: true,
  },
  mandatory: {
    type: Boolean,
    default: true,
  },
  
  implementationGuide: String,
  evidenceRequired: [String],
  testingProcedures: [String],
  
  status: {
    type: String,
    enum: ['compliant', 'partial', 'non_compliant', 'not_applicable', 'in_progress'],
    default: 'in_progress',
  },
  compliancePercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  
  controls: [{
    type: Schema.Types.ObjectId,
    ref: 'ComplianceControl',
  }],
  controlCount: {
    type: Number,
    default: 0,
  },
  implementedControlCount: {
    type: Number,
    default: 0,
  },
  
  lastAssessmentDate: Date,
  nextAssessmentDue: Date,
  assessmentFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual'],
    default: 'quarterly',
  },
  assessor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  
  evidence: [{
    type: {
      type: String,
      enum: ['document', 'screenshot', 'log', 'certificate', 'policy', 'procedure'],
    },
    name: String,
    url: String,
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    uploadedAt: Date,
    verified: {
      type: Boolean,
      default: false,
    },
  }],
  
  riskLevel: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium',
  },
  impactOfNonCompliance: String,
  potentialPenalty: String,
  
  remediationPlan: {
    description: String,
    steps: [String],
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    dueDate: Date,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'blocked'],
      default: 'pending',
    },
    completedAt: Date,
  },
  
  dependencies: [{
    type: Schema.Types.ObjectId,
    ref: 'ComplianceRequirement',
  }],
  relatedRequirements: [{
    type: Schema.Types.ObjectId,
    ref: 'ComplianceRequirement',
  }],
  
  complianceHistory: [{
    date: Date,
    status: String,
    score: Number,
    assessor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    findings: String,
    recommendations: [String],
  }],
  
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assignedTo: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  tags: [String],
  notes: String,
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
ComplianceRequirementSchema.index({ frameworkId: 1, status: 1 });
ComplianceRequirementSchema.index({ requirementId: 1 });
ComplianceRequirementSchema.index({ priority: 1, status: 1 });
ComplianceRequirementSchema.index({ category: 1, subcategory: 1 });
ComplianceRequirementSchema.index({ compliancePercentage: -1 });
ComplianceRequirementSchema.index({ tags: 1 });

export default mongoose.models.ComplianceRequirement || mongoose.model<IComplianceRequirement>('ComplianceRequirement', ComplianceRequirementSchema);
