import mongoose, { Document, Schema } from 'mongoose';

export interface ISSOConfig extends Document {
  organizationId?: string;
  name: string;
  type: 'oauth' | 'saml' | 'ldap';
  provider: string;
  enabled: boolean;
  
  // OAuth Configuration
  oauthConfig?: {
    clientId: string;
    clientSecret: string;
    authorizationUrl?: string;
    tokenUrl?: string;
    userInfoUrl?: string;
    scope?: string;
  };
  
  // SAML Configuration
  samlConfig?: {
    entryPoint: string;
    issuer: string;
    cert: string;
    privateKey?: string;
    signatureAlgorithm?: string;
    wantAssertionsSigned?: boolean;
    wantResponseSigned?: boolean;
    identifierFormat?: string;
    attributeMapping?: Record<string, string>;
  };
  
  // LDAP Configuration
  ldapConfig?: {
    url: string;
    bindDN: string;
    bindCredentials: string;
    searchBase: string;
    searchFilter: string;
    searchAttributes?: string[];
    groupSearchBase?: string;
    groupSearchFilter?: string;
    groupSearchAttributes?: string[];
    tlsOptions?: {
      rejectUnauthorized?: boolean;
      ca?: string[];
    };
    attributeMapping?: Record<string, string>;
  };
  
  // General Settings
  domainRestrictions?: string[]; // Allowed email domains
  autoProvision?: boolean; // Auto-create users on first login
  roleMapping?: Record<string, string>; // Map SSO groups/roles to app roles
  defaultRole?: string;
  
  // Metadata
  createdBy: mongoose.Types.ObjectId;
  lastUsed?: Date;
  usageCount: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const SSOConfigSchema = new Schema<ISSOConfig>(
  {
    organizationId: {
      type: String,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['oauth', 'saml', 'ldap'],
      index: true,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    
    // OAuth Configuration
    oauthConfig: {
      clientId: String,
      clientSecret: String,
      authorizationUrl: String,
      tokenUrl: String,
      userInfoUrl: String,
      scope: String,
    },
    
    // SAML Configuration
    samlConfig: {
      entryPoint: String,
      issuer: String,
      cert: String,
      privateKey: String,
      signatureAlgorithm: {
        type: String,
        enum: ['sha1', 'sha256', 'sha512'],
        default: 'sha256',
      },
      wantAssertionsSigned: Boolean,
      wantResponseSigned: Boolean,
      identifierFormat: String,
      attributeMapping: Schema.Types.Mixed,
    },
    
    // LDAP Configuration
    ldapConfig: {
      url: String,
      bindDN: String,
      bindCredentials: String,
      searchBase: String,
      searchFilter: String,
      searchAttributes: [String],
      groupSearchBase: String,
      groupSearchFilter: String,
      groupSearchAttributes: [String],
      tlsOptions: {
        rejectUnauthorized: Boolean,
        ca: [String],
      },
      attributeMapping: Schema.Types.Mixed,
    },
    
    // General Settings
    domainRestrictions: [String],
    autoProvision: {
      type: Boolean,
      default: true,
    },
    roleMapping: Schema.Types.Mixed,
    defaultRole: {
      type: String,
      default: 'user',
    },
    
    // Metadata
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastUsed: Date,
    usageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
SSOConfigSchema.index({ organizationId: 1, type: 1 });
SSOConfigSchema.index({ provider: 1, enabled: 1 });
SSOConfigSchema.index({ createdBy: 1 });

// Pre-save hook to validate configuration
SSOConfigSchema.pre('save', function (next) {
  const config = this;

  // Validate that appropriate config exists for type
  if (config.type === 'oauth' && !config.oauthConfig) {
    return next(new Error('OAuth configuration is required for OAuth type'));
  }
  if (config.type === 'saml' && !config.samlConfig) {
    return next(new Error('SAML configuration is required for SAML type'));
  }
  if (config.type === 'ldap' && !config.ldapConfig) {
    return next(new Error('LDAP configuration is required for LDAP type'));
  }

  next();
});

// Method to increment usage count
SSOConfigSchema.methods.recordUsage = async function () {
  this.usageCount += 1;
  this.lastUsed = new Date();
  await this.save();
};

// Static method to find active config by provider
SSOConfigSchema.statics.findByProvider = function (provider: string) {
  return this.findOne({ provider, enabled: true });
};

const SSOConfig = mongoose.models.SSOConfig || mongoose.model<ISSOConfig>('SSOConfig', SSOConfigSchema);

export default SSOConfig;
