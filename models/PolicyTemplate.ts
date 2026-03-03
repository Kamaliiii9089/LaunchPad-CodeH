import mongoose, { Schema, Document } from 'mongoose';

export interface IPolicySection {
  id: string;
  title: string;
  content: string;
  order: number;
  required: boolean;
}

export interface IPolicyTemplate extends Document {
  name: string;
  description: string;
  category: 'security' | 'privacy' | 'compliance' | 'operational' | 'hr' | 'legal' | 'data_protection' | 'access_control';
  standard?: string; // e.g., 'ISO 27001', 'GDPR', 'HIPAA', 'SOC 2', 'PCI-DSS'
  sections: IPolicySection[];
  tags: string[];
  mandatoryFields: string[];
  variables: { name: string; description: string; defaultValue?: string; }[];
  enforcementLevel: 'mandatory' | 'recommended' | 'optional';
  applicableRoles: string[];
  targetAudience: 'all_users' | 'admin_only' | 'developers' | 'specific_roles';
  estimatedReadTime: number; // in minutes
  popularityScore: number;
  usageCount: number;
  isActive: boolean;
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

const PolicyTemplateSchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  category: {
    type: String,
    required: true,
    enum: ['security', 'privacy', 'compliance', 'operational', 'hr', 'legal', 'data_protection', 'access_control'],
  },
  standard: { type: String },
  sections: [PolicySectionSchema],
  tags: [{ type: String }],
  mandatoryFields: [{ type: String }],
  variables: [{
    name: { type: String, required: true },
    description: { type: String, required: true },
    defaultValue: { type: String },
  }],
  enforcementLevel: {
    type: String,
    enum: ['mandatory', 'recommended', 'optional'],
    default: 'recommended',
  },
  applicableRoles: [{ type: String }],
  targetAudience: {
    type: String,
    enum: ['all_users', 'admin_only', 'developers', 'specific_roles'],
    default: 'all_users',
  },
  estimatedReadTime: { type: Number, default: 5 },
  popularityScore: { type: Number, default: 0 },
  usageCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

PolicyTemplateSchema.index({ category: 1, isActive: 1 });
PolicyTemplateSchema.index({ tags: 1 });
PolicyTemplateSchema.index({ standard: 1 });

export default mongoose.models.PolicyTemplate || mongoose.model<IPolicyTemplate>('PolicyTemplate', PolicyTemplateSchema);
