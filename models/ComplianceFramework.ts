import mongoose, { Document, Schema } from 'mongoose';

export interface IComplianceFramework extends Document {
  name: string;
  code: 'GDPR' | 'HIPAA' | 'PCI_DSS' | 'SOC2' | 'ISO27001' | 'CCPA' | 'NIST';
  description: string;
  version: string;
  effectiveDate: Date;
  jurisdiction: string[];
  category: 'privacy' | 'healthcare' | 'financial' | 'security' | 'general';
  
  // Framework Details
  requirements: {
    total: number;
    categories: string[];
  };
  
  // Status
  status: 'active' | 'archived' | 'pending';
  applicability: {
    industryTypes: string[];
    organizationSizes: string[];
    dataTypes: string[];
  };
  
  // Compliance Tracking
  overallComplianceScore: number; // 0-100
  requirementsMet: number;
  requirementsPending: number;
  requirementsFailed: number;
  lastAssessmentDate?: Date;
  nextAssessmentDue?: Date;
  
  // Documentation
  officialDocumentUrl?: string;
  internalGuideUrl?: string;
  certificationRequired: boolean;
  certificationBody?: string;
  
  // Penalties & Consequences
  maxPenalty?: string;
  penaltyType?: string;
  complianceDeadline?: Date;
  
  // Metadata
  owner: mongoose.Types.ObjectId;
  assignedTo: mongoose.Types.ObjectId[];
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ComplianceFrameworkSchema = new Schema<IComplianceFramework>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    enum: ['GDPR', 'HIPAA', 'PCI_DSS', 'SOC2', 'ISO27001', 'CCPA', 'NIST'],
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  version: {
    type: String,
    required: true,
  },
  effectiveDate: {
    type: Date,
    required: true,
  },
  jurisdiction: [String],
  category: {
    type: String,
    enum: ['privacy', 'healthcare', 'financial', 'security', 'general'],
    required: true,
  },
  
  requirements: {
    total: { type: Number, default: 0 },
    categories: [String],
  },
  
  status: {
    type: String,
    enum: ['active', 'archived', 'pending'],
    default: 'active',
  },
  applicability: {
    industryTypes: [String],
    organizationSizes: [String],
    dataTypes: [String],
  },
  
  overallComplianceScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  requirementsMet: {
    type: Number,
    default: 0,
  },
  requirementsPending: {
    type: Number,
    default: 0,
  },
  requirementsFailed: {
    type: Number,
    default: 0,
  },
  lastAssessmentDate: Date,
  nextAssessmentDue: Date,
  
  officialDocumentUrl: String,
  internalGuideUrl: String,
  certificationRequired: {
    type: Boolean,
    default: false,
  },
  certificationBody: String,
  
  maxPenalty: String,
  penaltyType: String,
  complianceDeadline: Date,
  
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
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
ComplianceFrameworkSchema.index({ code: 1, isActive: 1 });
ComplianceFrameworkSchema.index({ category: 1, status: 1 });
ComplianceFrameworkSchema.index({ overallComplianceScore: -1 });
ComplianceFrameworkSchema.index({ tags: 1 });

export default mongoose.models.ComplianceFramework || mongoose.model<IComplianceFramework>('ComplianceFramework', ComplianceFrameworkSchema);
