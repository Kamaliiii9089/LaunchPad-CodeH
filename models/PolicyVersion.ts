import mongoose, { Schema, Document } from 'mongoose';

export interface IPolicyVersion extends Document {
  policyId: mongoose.Types.ObjectId;
  version: number;
  title: string;
  description: string;
  sections: any[];
  enforcementRules: any[];
  effectiveDate?: Date;
  expirationDate?: Date;
  status: 'draft' | 'review' | 'approved' | 'active' | 'archived' | 'deprecated';
  changeType: 'major' | 'minor' | 'patch';
  changeSummary: string;
  changesDetail: {
    added: string[];
    modified: string[];
    removed: string[];
  };
  impactLevel: 'high' | 'medium' | 'low';
  requiresReacknowledgment: boolean;
  previousVersion?: number;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  publishedBy?: mongoose.Types.ObjectId;
  publishedAt?: Date;
  snapshot: Record<string, any>; // Full snapshot of policy at this version
  diffFromPrevious?: string; // JSON diff or markdown diff
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const PolicyVersionSchema = new Schema({
  policyId: { type: Schema.Types.ObjectId, ref: 'Policy', required: true },
  version: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  sections: [{ type: Schema.Types.Mixed }],
  enforcementRules: [{ type: Schema.Types.Mixed }],
  effectiveDate: { type: Date },
  expirationDate: { type: Date },
  status: {
    type: String,
    enum: ['draft', 'review', 'approved', 'active', 'archived', 'deprecated'],
    required: true,
  },
  changeType: {
    type: String,
    enum: ['major', 'minor', 'patch'],
    default: 'minor',
  },
  changeSummary: { type: String, required: true },
  changesDetail: {
    added: [{ type: String }],
    modified: [{ type: String }],
    removed: [{ type: String }],
  },
  impactLevel: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium',
  },
  requiresReacknowledgment: { type: Boolean, default: false },
  previousVersion: { type: Number },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  publishedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  publishedAt: { type: Date },
  snapshot: { type: Schema.Types.Mixed, required: true },
  diffFromPrevious: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

PolicyVersionSchema.index({ policyId: 1, version: -1 });
PolicyVersionSchema.index({ createdAt: -1 });
PolicyVersionSchema.index({ status: 1 });

export default mongoose.models.PolicyVersion || mongoose.model<IPolicyVersion>('PolicyVersion', PolicyVersionSchema);
