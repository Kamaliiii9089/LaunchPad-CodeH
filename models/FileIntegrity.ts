import mongoose from 'mongoose';

const FileIntegritySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  hashAlgorithm: {
    type: String,
    default: 'sha256',
  },
  baselineHash: {
    type: String,
    required: true,
  },
  currentHash: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['intact', 'modified', 'deleted', 'new'],
    default: 'intact',
  },
  lastChecked: {
    type: Date,
    default: Date.now,
  },
  monitoringEnabled: {
    type: Boolean,
    default: true,
  },
  alertOnChange: {
    type: Boolean,
    default: true,
  },
  category: {
    type: String,
    enum: ['system', 'application', 'configuration', 'logs', 'custom'],
    default: 'custom',
  },
  severity: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium',
  },
  changeHistory: [{
    timestamp: { type: Date, default: Date.now },
    previousHash: String,
    newHash: String,
    action: {
      type: String,
      enum: ['created', 'modified', 'deleted', 'restored'],
    },
    details: String,
  }],
  metadata: {
    permissions: String,
    owner: String,
    group: String,
    lastModified: Date,
  },
  tags: [String],
}, {
  timestamps: true,
});

FileIntegritySchema.index({ userId: 1, filePath: 1 });
FileIntegritySchema.index({ status: 1 });
FileIntegritySchema.index({ category: 1 });
FileIntegritySchema.index({ lastChecked: 1 });

export default mongoose.models.FileIntegrity || mongoose.model('FileIntegrity', FileIntegritySchema);
