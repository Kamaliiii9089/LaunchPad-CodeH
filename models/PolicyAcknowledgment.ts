import mongoose, { Schema, Document } from 'mongoose';

export interface IPolicyAcknowledgment extends Document {
  policyId: mongoose.Types.ObjectId;
  policyVersion: number;
  userId: mongoose.Types.ObjectId;
  status: 'pending' | 'acknowledged' | 'declined' | 'expired' | 'exempted';
  acknowledgedAt?: Date;
  declinedAt?: Date;
  declineReason?: string;
  expiresAt?: Date;
  remindersSent: number;
  lastReminderAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  readTime?: number; // seconds spent reading
  scrollPercentage?: number; // how much of policy was scrolled
  questionsAnswered?: {
    question: string;
    answer: string;
    correct: boolean;
  }[];
  quizScore?: number;
  signature?: string;
  signatureMethod?: 'typed' | 'drawn' | 'certificate' | 'biometric';
  certificationStatement?: string;
  witnessedBy?: mongoose.Types.ObjectId;
  attestationData?: Record<string, any>;
  exemptionReason?: string;
  exemptionApprovedBy?: mongoose.Types.ObjectId;
  exemptionExpiresAt?: Date;
  revokedAt?: Date;
  revokedBy?: mongoose.Types.ObjectId;
  revokedReason?: string;
  isValid: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const PolicyAcknowledgmentSchema = new Schema({
  policyId: { type: Schema.Types.ObjectId, ref: 'Policy', required: true },
  policyVersion: { type: Number, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['pending', 'acknowledged', 'declined', 'expired', 'exempted'],
    default: 'pending',
  },
  acknowledgedAt: { type: Date },
  declinedAt: { type: Date },
  declineReason: { type: String },
  expiresAt: { type: Date },
  remindersSent: { type: Number, default: 0 },
  lastReminderAt: { type: Date },
  ipAddress: { type: String },
  userAgent: { type: String },
  deviceFingerprint: { type: String },
  readTime: { type: Number }, // seconds
  scrollPercentage: { type: Number, min: 0, max: 100 },
  questionsAnswered: [{
    question: { type: String, required: true },
    answer: { type: String, required: true },
    correct: { type: Boolean, required: true },
  }],
  quizScore: { type: Number, min: 0, max: 100 },
  signature: { type: String },
  signatureMethod: {
    type: String,
    enum: ['typed', 'drawn', 'certificate', 'biometric'],
  },
  certificationStatement: { type: String },
  witnessedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  attestationData: { type: Schema.Types.Mixed },
  exemptionReason: { type: String },
  exemptionApprovedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  exemptionExpiresAt: { type: Date },
  revokedAt: { type: Date },
  revokedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  revokedReason: { type: String },
  isValid: { type: Boolean, default: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

PolicyAcknowledgmentSchema.index({ policyId: 1, userId: 1, policyVersion: 1 });
PolicyAcknowledgmentSchema.index({ userId: 1, status: 1 });
PolicyAcknowledgmentSchema.index({ expiresAt: 1 });
PolicyAcknowledgmentSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.PolicyAcknowledgment || mongoose.model<IPolicyAcknowledgment>('PolicyAcknowledgment', PolicyAcknowledgmentSchema);
