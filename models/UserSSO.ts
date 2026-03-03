import mongoose, { Document, Schema } from 'mongoose';

export interface IUserSSO extends Document {
  userId: mongoose.Types.ObjectId;
  ssoConfigId: mongoose.Types.ObjectId;
  
  provider: string;
  providerUserId: string;
  providerUsername?: string;
  providerEmail: string;
  
  // Additional provider profile data
  profile?: {
    name?: string;
    firstName?: string;
    lastName?: string;
    picture?: string;
    locale?: string;
    groups?: string[];
    [key: string]: any;
  };
  
  // Tokens (encrypted in production)
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  
  // SAML-specific
  nameID?: string;
  sessionIndex?: string;
  
  // LDAP-specific
  dn?: string;
  
  // Metadata
  lastLogin: Date;
  loginCount: number;
  linked: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const UserSSOSchema = new Schema<IUserSSO>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ssoConfigId: {
      type: Schema.Types.ObjectId,
      ref: 'SSOConfig',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    providerUserId: {
      type: String,
      required: true,
      trim: true,
    },
    providerUsername: {
      type: String,
      trim: true,
    },
    providerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    profile: Schema.Types.Mixed,
    
    // Tokens
    accessToken: String,
    refreshToken: String,
    tokenExpiry: Date,
    
    // SAML-specific
    nameID: String,
    sessionIndex: String,
    
    // LDAP-specific
    dn: String,
    
    // Metadata
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    loginCount: {
      type: Number,
      default: 0,
    },
    linked: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
UserSSOSchema.index({ userId: 1, provider: 1 });
UserSSOSchema.index({ provider: 1, providerUserId: 1 }, { unique: true });
UserSSOSchema.index({ provider: 1, providerEmail: 1 });
UserSSOSchema.index({ ssoConfigId: 1, linked: 1 });

// Method to record login
UserSSOSchema.methods.recordLogin = async function () {
  this.loginCount += 1;
  this.lastLogin = new Date();
  await this.save();
};

// Method to update tokens
UserSSOSchema.methods.updateTokens = async function (
  accessToken: string,
  refreshToken?: string,
  expiresIn?: number
) {
  this.accessToken = accessToken;
  if (refreshToken) {
    this.refreshToken = refreshToken;
  }
  if (expiresIn) {
    this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);
  }
  await this.save();
};

// Static method to find by provider and provider user ID
UserSSOSchema.statics.findByProvider = function (provider: string, providerUserId: string) {
  return this.findOne({ provider, providerUserId, linked: true });
};

// Static method to find by provider and email
UserSSOSchema.statics.findByProviderEmail = function (provider: string, email: string) {
  return this.findOne({ provider, providerEmail: email.toLowerCase(), linked: true });
};

// Static method to get user's SSO connections
UserSSOSchema.statics.getUserConnections = function (userId: mongoose.Types.ObjectId) {
  return this.find({ userId, linked: true }).populate('ssoConfigId');
};

const UserSSO = mongoose.models.UserSSO || mongoose.model<IUserSSO>('UserSSO', UserSSOSchema);

export default UserSSO;
