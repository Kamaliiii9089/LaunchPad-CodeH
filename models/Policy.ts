import mongoose, { Schema, Document } from 'mongoose';

export interface IPolicySection {
  id: string;
  title: string;
  content: string;
  order: number;
  required: boolean;
}

export interface IPolicyEnforcement {
  type: 'workflow_validation' | 'user_action_check' | 'system_constraint' | 'automated_remediation';
  trigger: string;
  action: string;
  conditions: Record<string, any>;
  severity: 'block' | 'warn' | 'log';
}

export interface IPolicy extends Document {
  title: string;
  description: string;
  category: 'security' | 'privacy' | 'compliance' | 'operational' | 'hr' | 'legal' | 'data_protection' | 'access_control';
  templateId?: mongoose.Types.ObjectId;
  sections: IPolicySection[];
  version: number;
  status: 'draft' | 'review' | 'approved' | 'active' | 'archived' | 'deprecated';
  effectiveDate?: Date;
  expirationDate?: Date;
  reviewFrequency: number; // in days
  nextReviewDate?: Date;
  enforcementRules: IPolicyEnforcement[];
  applicableRoles: string[];
  exemptRoles: string[];
  requiresAcknowledgment: boolean;
  acknowledgmentDeadline?: number; // days after becoming active
  tags: string[];
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  publishedBy?: mongoose.Types.ObjectId;
  publishedAt?: Date;
  archivedBy?: mongoose.Types.ObjectId;
  archivedAt?: Date;
  archivedReason?: string;
  violationCount: number;
  acknowledgmentRate: number; // percentage
  complianceScore: number; // 0-100
  relatedPolicies: mongoose.Types.ObjectId[];
  attachments: { name: string; url: string; uploadedAt: Date; }[];
  changeLog: { version: number; changes: string; changedBy: mongoose.Types.ObjectId; changedAt: Date; }[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PolicySectionSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  order: { type: Number, required: true },
  required: { type: Boolean, default: true },
});

const PolicyEnforcementSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['workflow_validation', 'user_action_check', 'system_constraint', 'automated_remediation'],
  },
  trigger: { type: String, required: true },
  action: { type: String, required: true },
  conditions: { type: Schema.Types.Mixed, default: {} },
  severity: { type: String, enum: ['block', 'warn', 'log'], default: 'warn' },
});

const PolicySchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: {
    type: String,
    required: true,
    enum: ['security', 'privacy', 'compliance', 'operational', 'hr', 'legal', 'data_protection', 'access_control'],
  },
  templateId: { type: Schema.Types.ObjectId, ref: 'PolicyTemplate' },
  sections: [PolicySectionSchema],
  version: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ['draft', 'review', 'approved', 'active', 'archived', 'deprecated'],
    default: 'draft',
  },
  effectiveDate: { type: Date },
  expirationDate: { type: Date },
  reviewFrequency: { type: Number, default: 365 }, // annual by default
  nextReviewDate: { type: Date },
  enforcementRules: [PolicyEnforcementSchema],
  applicableRoles: [{ type: String }],
  exemptRoles: [{ type: String }],
  requiresAcknowledgment: { type: Boolean, default: true },
  acknowledgmentDeadline: { type: Number, default: 30 }, // 30 days
  tags: [{ type: String }],
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  publishedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  publishedAt: { type: Date },
  archivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  archivedAt: { type: Date },
  archivedReason: { type: String },
  violationCount: { type: Number, default: 0 },
  acknowledgmentRate: { type: Number, default: 0 },
  complianceScore: { type: Number, default: 100 },
  relatedPolicies: [{ type: Schema.Types.ObjectId, ref: 'Policy' }],
  attachments: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  }],
  changeLog: [{
    version: { type: Number, required: true },
    changes: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, default: Date.now },
  }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

PolicySchema.index({ status: 1, category: 1 });
PolicySchema.index({ effectiveDate: 1, expirationDate: 1 });
PolicySchema.index({ nextReviewDate: 1 });
PolicySchema.index({ tags: 1 });

export default mongoose.models.Policy || mongoose.model<IPolicy>('Policy', PolicySchema);
