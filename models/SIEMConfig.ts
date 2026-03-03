import mongoose, { Schema, Document } from 'mongoose';

export type SIEMType = 'splunk' | 'elk' | 'qradar' | 'syslog';
export type SIEMStatus = 'active' | 'inactive' | 'error' | 'testing';
export type SyslogProtocol = 'UDP' | 'TCP' | 'TLS';
export type SyslogFacility = 'kern' | 'user' | 'mail' | 'daemon' | 'auth' | 'syslog' | 'lpr' | 'news' | 'uucp' | 'cron' | 'authpriv' | 'ftp' | 'local0' | 'local1' | 'local2' | 'local3' | 'local4' | 'local5' | 'local6' | 'local7';

export interface ISplunkConfig {
  host: string;
  port: number;
  token: string;
  index: string;
  sourcetype: string;
  ssl: boolean;
}

export interface IELKConfig {
  elasticsearchUrl: string;
  kibanaUrl?: string;
  indexPattern: string;
  apiKey?: string;
  username?: string;
  password?: string;
  ssl: boolean;
  pipeline?: string;
}

export interface IQRadarConfig {
  consoleHost: string;
  apiToken: string;
  logSourceId?: string;
  logSourceName: string;
  protocol: 'https' | 'http';
  verifySSL: boolean;
}

export interface ISyslogConfig {
  host: string;
  port: number;
  protocol: SyslogProtocol;
  facility: SyslogFacility;
  appName: string;
  rfc: 'RFC5424' | 'RFC3164';
  tlsCert?: string;
  tlsKey?: string;
  tlsCa?: string;
}

export interface IEventForwardingRule {
  severities: ('critical' | 'high' | 'medium' | 'low')[];
  eventTypes: string[];
  statuses: ('active' | 'resolved' | 'investigating')[];
  enabled: boolean;
}

export interface ISIEMConfig extends Document {
  name: string;
  description?: string;
  type: SIEMType;
  status: SIEMStatus;
  enabled: boolean;
  splunkConfig?: ISplunkConfig;
  elkConfig?: IELKConfig;
  qradarConfig?: IQRadarConfig;
  syslogConfig?: ISyslogConfig;
  forwardingRules: IEventForwardingRule;
  batchSize: number;
  retryAttempts: number;
  retryDelayMs: number;
  lastConnectedAt?: Date;
  lastForwardedAt?: Date;
  lastError?: string;
  eventsForwarded: number;
  eventsFailed: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const SIEMConfigSchema = new Schema<ISIEMConfig>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: {
      type: String,
      enum: ['splunk', 'elk', 'qradar', 'syslog'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'error', 'testing'],
      default: 'inactive',
    },
    enabled: { type: Boolean, default: true },
    splunkConfig: {
      host: String,
      port: { type: Number, default: 8088 },
      token: String,
      index: { type: String, default: 'main' },
      sourcetype: { type: String, default: 'breachbuddy:security' },
      ssl: { type: Boolean, default: true },
    },
    elkConfig: {
      elasticsearchUrl: String,
      kibanaUrl: String,
      indexPattern: { type: String, default: 'breachbuddy-security-*' },
      apiKey: String,
      username: String,
      password: String,
      ssl: { type: Boolean, default: true },
      pipeline: String,
    },
    qradarConfig: {
      consoleHost: String,
      apiToken: String,
      logSourceId: String,
      logSourceName: { type: String, default: 'BreachBuddy' },
      protocol: { type: String, enum: ['https', 'http'], default: 'https' },
      verifySSL: { type: Boolean, default: true },
    },
    syslogConfig: {
      host: String,
      port: { type: Number, default: 514 },
      protocol: { type: String, enum: ['UDP', 'TCP', 'TLS'], default: 'UDP' },
      facility: { type: String, default: 'auth' },
      appName: { type: String, default: 'breachbuddy' },
      rfc: { type: String, enum: ['RFC5424', 'RFC3164'], default: 'RFC5424' },
      tlsCert: String,
      tlsKey: String,
      tlsCa: String,
    },
    forwardingRules: {
      severities: {
        type: [String],
        default: ['critical', 'high', 'medium', 'low'],
      },
      eventTypes: { type: [String], default: [] },
      statuses: {
        type: [String],
        default: ['active', 'investigating'],
      },
      enabled: { type: Boolean, default: true },
    },
    batchSize: { type: Number, default: 100 },
    retryAttempts: { type: Number, default: 3 },
    retryDelayMs: { type: Number, default: 1000 },
    lastConnectedAt: Date,
    lastForwardedAt: Date,
    lastError: String,
    eventsForwarded: { type: Number, default: 0 },
    eventsFailed: { type: Number, default: 0 },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

SIEMConfigSchema.index({ createdBy: 1 });
SIEMConfigSchema.index({ type: 1, enabled: 1 });

export default mongoose.models.SIEMConfig ||
  mongoose.model<ISIEMConfig>('SIEMConfig', SIEMConfigSchema);
