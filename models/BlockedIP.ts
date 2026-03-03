import mongoose from 'mongoose';

export interface IBlockedIP extends mongoose.Document {
  ipAddress: string;
  reason: string;
  threatType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Block configuration
  blockType: 'firewall' | 'waf' | 'both';
  isTemporary: boolean;
  duration?: number; // Duration in minutes
  expiresAt?: Date;
  
  // Source of block
  blockedBy: 'auto' | 'manual' | 'playbook';
  blockedByUser?: mongoose.Types.ObjectId;
  playbookId?: mongoose.Types.ObjectId;
  incidentResponseId?: mongoose.Types.ObjectId;
  
  // Status
  status: 'active' | 'expired' | 'removed';
  isActive: boolean;
  
  // Statistics
  attacksBlocked: number;
  lastAttempt?: Date;
  
  // Whitelist override
  whitelisted: boolean;
  whitelistedBy?: mongoose.Types.ObjectId;
  whitelistedAt?: Date;
  whitelistReason?: string;
  
  // Geolocation data
  country?: string;
  region?: string;
  city?: string;
  
  // Additional metadata
  notes?: string;
  tags: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

const BlockedIPSchema = new mongoose.Schema({
  ipAddress: { 
    type: String, 
    required: true,
    unique: true,
    validate: {
      validator: function(v: string) {
        // Simple IP validation
        return /^(\d{1,3}\.){3}\d{1,3}$/.test(v);
      },
      message: 'Invalid IP address format'
    }
  },
  reason: { type: String, required: true },
  threatType: { type: String, required: true },
  severity: { 
    type: String, 
    required: true,
    enum: ['low', 'medium', 'high', 'critical']
  },
  
  blockType: { 
    type: String, 
    required: true,
    enum: ['firewall', 'waf', 'both'],
    default: 'firewall'
  },
  isTemporary: { type: Boolean, default: false },
  duration: Number,
  expiresAt: Date,
  
  blockedBy: { 
    type: String, 
    required: true,
    enum: ['auto', 'manual', 'playbook']
  },
  blockedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  playbookId: { type: mongoose.Schema.Types.ObjectId, ref: 'IncidentPlaybook' },
  incidentResponseId: { type: mongoose.Schema.Types.ObjectId, ref: 'IncidentResponse' },
  
  status: { 
    type: String, 
    required: true,
    enum: ['active', 'expired', 'removed'],
    default: 'active'
  },
  isActive: { type: Boolean, default: true },
  
  attacksBlocked: { type: Number, default: 0 },
  lastAttempt: Date,
  
  whitelisted: { type: Boolean, default: false },
  whitelistedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  whitelistedAt: Date,
  whitelistReason: String,
  
  country: String,
  region: String,
  city: String,
  
  notes: String,
  tags: [{ type: String }],
}, {
  timestamps: true,
});

// Indexes
BlockedIPSchema.index({ ipAddress: 1 });
BlockedIPSchema.index({ status: 1, isActive: 1 });
BlockedIPSchema.index({ expiresAt: 1 });
BlockedIPSchema.index({ whitelisted: 1 });
BlockedIPSchema.index({ createdAt: -1 });

// Automatically expire temporary blocks
BlockedIPSchema.pre('save', function(next) {
  if (this.isTemporary && this.duration && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + this.duration * 60000);
  }
  next();
});

export default mongoose.models.BlockedIP || mongoose.model<IBlockedIP>('BlockedIP', BlockedIPSchema);
