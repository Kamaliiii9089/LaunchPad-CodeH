import mongoose, { Schema, Document } from 'mongoose';

export type CloudProvider = 'aws' | 'azure' | 'gcp';
export type CloudStatus = 'active' | 'inactive' | 'error' | 'testing';

// ── AWS ──────────────────────────────────────────────────────────────────────

export interface IAWSConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  roleArn?: string;
  externalId?: string;
  // CloudTrail
  cloudTrailEnabled: boolean;
  cloudTrailS3Bucket?: string;
  cloudTrailLogGroupArn?: string;
  // GuardDuty
  guardDutyEnabled: boolean;
  guardDutyDetectorId?: string;
  // Security Hub
  securityHubEnabled: boolean;
  // CloudWatch
  cloudWatchEnabled: boolean;
  cloudWatchLogGroups?: string[];
}

// ── Azure ────────────────────────────────────────────────────────────────────

export interface IAzureConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  subscriptionId: string;
  // Microsoft Defender for Cloud (Security Center)
  defenderForCloudEnabled: boolean;
  workspaceId?: string;
  // Azure Monitor / Activity Logs
  activityLogsEnabled: boolean;
  // Azure Sentinel
  sentinelEnabled: boolean;
  sentinelWorkspaceName?: string;
  sentinelResourceGroup?: string;
}

// ── GCP ──────────────────────────────────────────────────────────────────────

export interface IGCPConfig {
  projectId: string;
  serviceAccountKey: string; // JSON string of service account credentials
  // Security Command Center
  sccEnabled: boolean;
  sccOrganizationId?: string;
  // Cloud Logging / Audit Logs
  cloudLoggingEnabled: boolean;
  logSink?: string;
  // Cloud Asset Inventory
  assetInventoryEnabled: boolean;
}

// ── Event Forwarding Rules ────────────────────────────────────────────────────

export interface ICloudForwardingRules {
  severities: ('CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL')[];
  categories: string[];
  enabled: boolean;
  pollIntervalMinutes: number;
}

// ── Main Document ─────────────────────────────────────────────────────────────

export interface ICloudSecurityConfig extends Document {
  name: string;
  description?: string;
  provider: CloudProvider;
  status: CloudStatus;
  enabled: boolean;
  awsConfig?: IAWSConfig;
  azureConfig?: IAzureConfig;
  gcpConfig?: IGCPConfig;
  forwardingRules: ICloudForwardingRules;
  lastSyncAt?: Date;
  lastError?: string;
  eventsIngested: number;
  findingsCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const CloudSecurityConfigSchema = new Schema<ICloudSecurityConfig>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    provider: {
      type: String,
      enum: ['aws', 'azure', 'gcp'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'error', 'testing'],
      default: 'inactive',
    },
    enabled: { type: Boolean, default: true },

    awsConfig: {
      accessKeyId: String,
      secretAccessKey: String,
      region: { type: String, default: 'us-east-1' },
      roleArn: String,
      externalId: String,
      cloudTrailEnabled: { type: Boolean, default: true },
      cloudTrailS3Bucket: String,
      cloudTrailLogGroupArn: String,
      guardDutyEnabled: { type: Boolean, default: false },
      guardDutyDetectorId: String,
      securityHubEnabled: { type: Boolean, default: false },
      cloudWatchEnabled: { type: Boolean, default: false },
      cloudWatchLogGroups: [String],
    },

    azureConfig: {
      tenantId: String,
      clientId: String,
      clientSecret: String,
      subscriptionId: String,
      defenderForCloudEnabled: { type: Boolean, default: true },
      workspaceId: String,
      activityLogsEnabled: { type: Boolean, default: true },
      sentinelEnabled: { type: Boolean, default: false },
      sentinelWorkspaceName: String,
      sentinelResourceGroup: String,
    },

    gcpConfig: {
      projectId: String,
      serviceAccountKey: String,
      sccEnabled: { type: Boolean, default: true },
      sccOrganizationId: String,
      cloudLoggingEnabled: { type: Boolean, default: true },
      logSink: String,
      assetInventoryEnabled: { type: Boolean, default: false },
    },

    forwardingRules: {
      severities: {
        type: [String],
        default: ['CRITICAL', 'HIGH', 'MEDIUM'],
      },
      categories: { type: [String], default: [] },
      enabled: { type: Boolean, default: true },
      pollIntervalMinutes: { type: Number, default: 15 },
    },

    lastSyncAt: Date,
    lastError: String,
    eventsIngested: { type: Number, default: 0 },
    findingsCount: { type: Number, default: 0 },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

CloudSecurityConfigSchema.index({ createdBy: 1 });
CloudSecurityConfigSchema.index({ provider: 1, enabled: 1 });

export default mongoose.models.CloudSecurityConfig ||
  mongoose.model<ICloudSecurityConfig>('CloudSecurityConfig', CloudSecurityConfigSchema);
