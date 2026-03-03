import mongoose, { Document, Schema } from 'mongoose';

export interface IComplianceReport extends Document {
  // Report Identification
  reportId: string;
  title: string;
  description: string;
  reportType: 'full_assessment' | 'gap_analysis' | 'audit_readiness' | 'certification' | 
               'executive_summary' | 'technical_detail' | 'remediation_status' | 'trend_analysis';
  
  // Scope
  frameworks: {
    frameworkId: mongoose.Types.ObjectId;
    frameworkCode: string;
    included: boolean;
  }[];
  requirements: mongoose.Types.ObjectId[];
  controls: mongoose.Types.ObjectId[];
  
  // Time Period
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
  
  // Report Content
  executiveSummary: {
    overallScore: number; // 0-100
    complianceLevel: 'excellent' | 'good' | 'needs_improvement' | 'critical';
    keyFindings: string[];
    criticalIssues: number;
    recommendations: string[];
  };
  
  // Framework Analysis
  frameworkAnalysis: {
    frameworkId: mongoose.Types.ObjectId;
    frameworkCode: string;
    complianceScore: number;
    requirementsTotal: number;
    requirementsMet: number;
    requirementsPending: number;
    requirementsFailed: number;
    criticalGaps: number;
    highRiskGaps: number;
    status: 'compliant' | 'partial' | 'non_compliant';
    details: string;
  }[];
  
  // Control Effectiveness
  controlEffectiveness: {
    total: number;
    effective: number;
    partiallyEffective: number;
    ineffective: number;
    notTested: number;
    averageScore: number;
  };
  
  // Gaps & Findings
  gaps: {
    requirementId: mongoose.Types.ObjectId;
    requirementTitle: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    impact: string;
    recommendation: string;
    estimatedEffort: string;
    priority: number;
  }[];
  
  // Remediation Plan
  remediationPlan: {
    totalItems: number;
    completed: number;
    inProgress: number;
    pending: number;
    items: {
      requirementId: mongoose.Types.ObjectId;
      action: string;
      assignedTo: mongoose.Types.ObjectId;
      dueDate: Date;
      status: 'pending' | 'in_progress' | 'completed';
      priority: 'critical' | 'high' | 'medium' | 'low';
    }[];
  };
  
  // Evidence Summary
  evidenceSummary: {
    totalEvidence: number;
    verifiedEvidence: number;
    pendingVerification: number;
    missingEvidence: number;
    evidenceByType: {
      type: string;
      count: number;
    }[];
  };
  
  // Audit Metrics
  auditMetrics: {
    totalActivities: number;
    assessmentsCompleted: number;
    controlsTested: number;
    policyViolations: number;
    exceptionsGranted: number;
    periodStart: Date;
    periodEnd: Date;
  };
  
  // Trend Data
  trends: {
    complianceScoreHistory: {
      date: Date;
      score: number;
    }[];
    gapTrends: {
      date: Date;
      critical: number;
      high: number;
      medium: number;
      low: number;
    }[];
  };
  
  // Certification Status
  certificationStatus?: {
    framework: string;
    certified: boolean;
    certificationBody?: string;
    certificationDate?: Date;
    expirationDate?: Date;
    nextAuditDate?: Date;
  }[];
  
  // Report Metadata
  generatedBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvalDate?: Date;
  status: 'draft' | 'pending_review' | 'approved' | 'submitted' | 'archived';
  
  // Distribution
  sharedWith: {
    userId: mongoose.Types.ObjectId;
    accessLevel: 'view' | 'comment' | 'edit';
    sharedAt: Date;
  }[];
  
  // Export Formats
  exports: {
    format: 'pdf' | 'excel' | 'json' | 'html';
    url: string;
    generatedAt: Date;
    size: number;
  }[];
  
  // Audit Trail
  auditTrail: {
    action: string;
    performedBy: mongoose.Types.ObjectId;
    timestamp: Date;
    details: string;
  }[];
  
  // Metadata
  tags: string[];
  confidential: boolean;
  retentionPeriod: number; // in days
  expiresAt?: Date;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ComplianceReportSchema = new Schema<IComplianceReport>({
  reportId: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  reportType: {
    type: String,
    enum: ['full_assessment', 'gap_analysis', 'audit_readiness', 'certification', 
           'executive_summary', 'technical_detail', 'remediation_status', 'trend_analysis'],
    required: true,
  },
  
  frameworks: [{
    frameworkId: {
      type: Schema.Types.ObjectId,
      ref: 'ComplianceFramework',
    },
    frameworkCode: String,
    included: {
      type: Boolean,
      default: true,
    },
  }],
  requirements: [{
    type: Schema.Types.ObjectId,
    ref: 'ComplianceRequirement',
  }],
  controls: [{
    type: Schema.Types.ObjectId,
    ref: 'ComplianceControl',
  }],
  
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
  
  executiveSummary: {
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    complianceLevel: {
      type: String,
      enum: ['excellent', 'good', 'needs_improvement', 'critical'],
    },
    keyFindings: [String],
    criticalIssues: {
      type: Number,
      default: 0,
    },
    recommendations: [String],
  },
  
  frameworkAnalysis: [{
    frameworkId: {
      type: Schema.Types.ObjectId,
      ref: 'ComplianceFramework',
    },
    frameworkCode: String,
    complianceScore: Number,
    requirementsTotal: Number,
    requirementsMet: Number,
    requirementsPending: Number,
    requirementsFailed: Number,
    criticalGaps: Number,
    highRiskGaps: Number,
    status: {
      type: String,
      enum: ['compliant', 'partial', 'non_compliant'],
    },
    details: String,
  }],
  
  controlEffectiveness: {
    total: Number,
    effective: Number,
    partiallyEffective: Number,
    ineffective: Number,
    notTested: Number,
    averageScore: Number,
  },
  
  gaps: [{
    requirementId: {
      type: Schema.Types.ObjectId,
      ref: 'ComplianceRequirement',
    },
    requirementTitle: String,
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
    },
    description: String,
    impact: String,
    recommendation: String,
    estimatedEffort: String,
    priority: Number,
  }],
  
  remediationPlan: {
    totalItems: Number,
    completed: Number,
    inProgress: Number,
    pending: Number,
    items: [{
      requirementId: {
        type: Schema.Types.ObjectId,
        ref: 'ComplianceRequirement',
      },
      action: String,
      assignedTo: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      dueDate: Date,
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed'],
      },
      priority: {
        type: String,
        enum: ['critical', 'high', 'medium', 'low'],
      },
    }],
  },
  
  evidenceSummary: {
    totalEvidence: Number,
    verifiedEvidence: Number,
    pendingVerification: Number,
    missingEvidence: Number,
    evidenceByType: [{
      type: String,
      count: Number,
    }],
  },
  
  auditMetrics: {
    totalActivities: Number,
    assessmentsCompleted: Number,
    controlsTested: Number,
    policyViolations: Number,
    exceptionsGranted: Number,
    periodStart: Date,
    periodEnd: Date,
  },
  
  trends: {
    complianceScoreHistory: [{
      date: Date,
      score: Number,
    }],
    gapTrends: [{
      date: Date,
      critical: Number,
      high: Number,
      medium: Number,
      low: Number,
    }],
  },
  
  certificationStatus: [{
    framework: String,
    certified: Boolean,
    certificationBody: String,
    certificationDate: Date,
    expirationDate: Date,
    nextAuditDate: Date,
  }],
  
  generatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  approvalDate: Date,
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'approved', 'submitted', 'archived'],
    default: 'draft',
  },
  
  sharedWith: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    accessLevel: {
      type: String,
      enum: ['view', 'comment', 'edit'],
    },
    sharedAt: Date,
  }],
  
  exports: [{
    format: {
      type: String,
      enum: ['pdf', 'excel', 'json', 'html'],
    },
    url: String,
    generatedAt: Date,
    size: Number,
  }],
  
  auditTrail: [{
    action: String,
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    timestamp: Date,
    details: String,
  }],
  
  tags: [String],
  confidential: {
    type: Boolean,
    default: true,
  },
  retentionPeriod: {
    type: Number,
    default: 2555, // 7 years
  },
  expiresAt: Date,
  version: {
    type: Number,
    default: 1,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
ComplianceReportSchema.index({ reportId: 1 });
ComplianceReportSchema.index({ reportType: 1, status: 1 });
ComplianceReportSchema.index({ generatedAt: -1 });
ComplianceReportSchema.index({ 'frameworks.frameworkId': 1 });
ComplianceReportSchema.index({ generatedBy: 1 });
ComplianceReportSchema.index({ tags: 1 });

export default mongoose.models.ComplianceReport || mongoose.model<IComplianceReport>('ComplianceReport', ComplianceReportSchema);
