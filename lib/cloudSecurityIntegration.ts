/**
 * Cloud Security Integration Engine
 * Connectors for AWS CloudTrail/GuardDuty/Security Hub,
 * Azure Defender for Cloud/Activity Logs/Sentinel, and
 * GCP Security Command Center / Cloud Logging.
 *
 * Uses each provider's REST API directly — no heavy cloud SDKs required.
 */

import type {
  ICloudSecurityConfig,
  IAWSConfig,
  IAzureConfig,
  IGCPConfig,
} from '@/models/CloudSecurityConfig';

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

export interface CloudFinding {
  id: string;
  provider: string;
  source: string;          // e.g. "CloudTrail", "GuardDuty", "Defender"
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  category: string;
  resourceId?: string;
  resourceType?: string;
  region?: string;
  timestamp: string;
  rawData?: Record<string, unknown>;
}

export interface ConnectionTestResult {
  success: boolean;
  provider: string;
  latencyMs?: number;
  message: string;
  services?: string[];
  details?: Record<string, unknown>;
}

export interface SyncResult {
  success: boolean;
  provider: string;
  findingsCount: number;
  sources: string[];
  durationMs?: number;
  error?: string;
  findings: CloudFinding[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function isoAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

// AWS SigV4 HMAC-SHA256 signing (simplified — uses crypto-js equivalent via Web Crypto)
async function hmacSHA256(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

async function deriveSigV4Key(
  secretKey: string, date: string, region: string, service: string
): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  let key: ArrayBuffer = enc.encode('AWS4' + secretKey);
  for (const part of [date, region, service, 'aws4_request']) {
    key = await hmacSHA256(key, part);
  }
  return key;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return toHex(buf);
}

/**
 * Sign and execute an AWS API request using SigV4.
 * Works in both Node.js (via crypto global) and Edge runtimes.
 */
async function awsRequest(
  config: IAWSConfig,
  service: string,
  method: string,
  path: string,
  body: string,
  extraHeaders: Record<string, string> = {}
): Promise<Response> {
  const region = config.region;
  const now = new Date();
  const amzdate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const datestamp = amzdate.slice(0, 8);
  const host = `${service}.${region}.amazonaws.com`;
  const url = `https://${host}${path}`;

  const payloadHash = await sha256Hex(body);

  const headers: Record<string, string> = {
    'host': host,
    'x-amz-date': amzdate,
    'x-amz-content-sha256': payloadHash,
    'content-type': 'application/x-amz-json-1.1',
    ...extraHeaders,
  };

  const signedHeaders = Object.keys(headers).sort().join(';');
  const canonicalHeaders = Object.keys(headers).sort().map(k => `${k}:${headers[k]}\n`).join('');
  const canonicalRequest = [method, path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');

  const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzdate, credentialScope, await sha256Hex(canonicalRequest)].join('\n');

  const signingKey = await deriveSigV4Key(config.secretAccessKey, datestamp, region, service);
  const signature = toHex(await hmacSHA256(signingKey, stringToSign));

  const authHeader = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(url, {
    method,
    headers: { ...headers, 'Authorization': authHeader },
    body: body || undefined,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. AWS Connector
// ─────────────────────────────────────────────────────────────────────────────

export class AWSConnector {
  constructor(private cfg: IAWSConfig) {}

  async testConnection(): Promise<ConnectionTestResult> {
    const start = Date.now();
    const services: string[] = [];

    try {
      // Test STS GetCallerIdentity — works with any valid AWS credential
      const res = await awsRequest(
        this.cfg, 'sts', 'POST', '/',
        'Action=GetCallerIdentity&Version=2011-06-15',
        { 'content-type': 'application/x-www-form-urlencoded' }
      );

      const latencyMs = Date.now() - start;

      if (!res.ok && res.status !== 200) {
        return {
          success: false,
          provider: 'aws',
          latencyMs,
          message: `AWS STS responded with HTTP ${res.status}. Check credentials and region.`,
        };
      }

      if (this.cfg.cloudTrailEnabled) services.push('CloudTrail');
      if (this.cfg.guardDutyEnabled) services.push('GuardDuty');
      if (this.cfg.securityHubEnabled) services.push('Security Hub');
      if (this.cfg.cloudWatchEnabled) services.push('CloudWatch Logs');

      return {
        success: true,
        provider: 'aws',
        latencyMs,
        message: `AWS credentials valid. Region: ${this.cfg.region}`,
        services,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: 'aws',
        latencyMs: Date.now() - start,
        message: `AWS connectivity error: ${err.message}`,
      };
    }
  }

  async fetchCloudTrailEvents(lookbackMinutes = 60): Promise<CloudFinding[]> {
    if (!this.cfg.cloudTrailEnabled) return [];

    const findings: CloudFinding[] = [];
    try {
      const body = JSON.stringify({
        StartTime: Math.floor((Date.now() - lookbackMinutes * 60 * 1000) / 1000),
        MaxResults: 50,
      });

      const res = await awsRequest(
        this.cfg, 'cloudtrail', 'POST', '/',
        body,
        { 'x-amz-target': 'CloudTrail_20131101.LookupEvents' }
      );

      if (!res.ok) return [];

      const data = await res.json();
      for (const event of (data.Events || [])) {
        findings.push({
          id: event.EventId || `ct-${Date.now()}-${Math.random()}`,
          provider: 'aws',
          source: 'CloudTrail',
          title: event.EventName || 'CloudTrail Event',
          description: `${event.EventName} by ${event.Username || 'unknown'} from ${event.SourceIPAddress || 'unknown'}`,
          severity: classifyCloudTrailSeverity(event.EventName),
          category: 'Audit',
          resourceId: event.Resources?.[0]?.ResourceName,
          resourceType: event.Resources?.[0]?.ResourceType,
          region: this.cfg.region,
          timestamp: event.EventTime
            ? new Date(event.EventTime * 1000).toISOString()
            : new Date().toISOString(),
          rawData: event,
        });
      }
    } catch (_) {}

    return findings;
  }

  async fetchGuardDutyFindings(): Promise<CloudFinding[]> {
    if (!this.cfg.guardDutyEnabled || !this.cfg.guardDutyDetectorId) return [];

    const findings: CloudFinding[] = [];
    try {
      const listRes = await awsRequest(
        this.cfg, 'guardduty', 'POST',
        `/detector/${this.cfg.guardDutyDetectorId}/findings/statistics`,
        JSON.stringify({ FindingStatisticTypes: ['COUNT_BY_SEVERITY'] }),
        { 'x-amz-target': '' }
      );

      if (!listRes.ok) return [];

      const getRes = await awsRequest(
        this.cfg, 'guardduty', 'POST',
        `/detector/${this.cfg.guardDutyDetectorId}/findings/get`,
        JSON.stringify({ FindingIds: [] }),
        {}
      );

      if (!getRes.ok) return [];

      const data = await getRes.json();
      for (const finding of (data.Findings || [])) {
        findings.push({
          id: finding.Id || `gd-${Date.now()}`,
          provider: 'aws',
          source: 'GuardDuty',
          title: finding.Title,
          description: finding.Description,
          severity: mapGuardDutySeverity(finding.Severity),
          category: finding.Type?.split('/')[0] || 'Threat',
          resourceId: finding.Resource?.InstanceDetails?.InstanceId,
          resourceType: finding.Resource?.ResourceType,
          region: finding.Region,
          timestamp: finding.UpdatedAt || new Date().toISOString(),
          rawData: finding,
        });
      }
    } catch (_) {}

    return findings;
  }

  async fetchSecurityHubFindings(): Promise<CloudFinding[]> {
    if (!this.cfg.securityHubEnabled) return [];

    const findings: CloudFinding[] = [];
    try {
      const body = JSON.stringify({
        Filters: {
          WorkflowStatus: [{ Value: 'NEW', Comparison: 'EQUALS' }],
          RecordState: [{ Value: 'ACTIVE', Comparison: 'EQUALS' }],
        },
        MaxResults: 50,
      });

      const res = await awsRequest(
        this.cfg, 'securityhub', 'POST',
        '/findings',
        body,
        {}
      );

      if (!res.ok) return [];

      const data = await res.json();
      for (const finding of (data.Findings || [])) {
        findings.push({
          id: finding.Id,
          provider: 'aws',
          source: 'Security Hub',
          title: finding.Title,
          description: finding.Description,
          severity: finding.Severity?.Label || 'MEDIUM',
          category: finding.Types?.[0] || 'Security',
          resourceId: finding.Resources?.[0]?.Id,
          resourceType: finding.Resources?.[0]?.Type,
          region: finding.Region,
          timestamp: finding.UpdatedAt || new Date().toISOString(),
          rawData: finding,
        });
      }
    } catch (_) {}

    return findings;
  }

  async sync(lookbackMinutes = 60): Promise<SyncResult> {
    const start = Date.now();
    const sources: string[] = [];
    let allFindings: CloudFinding[] = [];

    const [trail, gd, sh] = await Promise.allSettled([
      this.fetchCloudTrailEvents(lookbackMinutes),
      this.fetchGuardDutyFindings(),
      this.fetchSecurityHubFindings(),
    ]);

    if (trail.status === 'fulfilled' && trail.value.length > 0) {
      allFindings = allFindings.concat(trail.value);
      sources.push('CloudTrail');
    }
    if (gd.status === 'fulfilled' && gd.value.length > 0) {
      allFindings = allFindings.concat(gd.value);
      sources.push('GuardDuty');
    }
    if (sh.status === 'fulfilled' && sh.value.length > 0) {
      allFindings = allFindings.concat(sh.value);
      sources.push('Security Hub');
    }

    return {
      success: true,
      provider: 'aws',
      findingsCount: allFindings.length,
      sources,
      durationMs: Date.now() - start,
      findings: allFindings,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Azure Connector
// ─────────────────────────────────────────────────────────────────────────────

export class AzureConnector {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(private cfg: IAzureConfig) {}

  private async getAccessToken(resource = 'https://management.azure.com/'): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry - 60_000) {
      return this.accessToken;
    }

    const res = await fetch(
      `https://login.microsoftonline.com/${this.cfg.tenantId}/oauth2/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.cfg.clientId,
          client_secret: this.cfg.clientSecret,
          resource,
        }).toString(),
      }
    );

    if (!res.ok) {
      throw new Error(`Azure auth failed: HTTP ${res.status}`);
    }

    const data = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + Number(data.expires_in) * 1000;
    return this.accessToken!;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const start = Date.now();
    const services: string[] = [];

    try {
      const token = await this.getAccessToken();
      const latencyMs = Date.now() - start;

      // Verify subscription access
      const res = await fetch(
        `https://management.azure.com/subscriptions/${this.cfg.subscriptionId}?api-version=2020-01-01`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        return {
          success: false,
          provider: 'azure',
          latencyMs,
          message: `Azure subscription check failed: HTTP ${res.status}`,
        };
      }

      const sub = await res.json();
      if (this.cfg.defenderForCloudEnabled) services.push('Defender for Cloud');
      if (this.cfg.activityLogsEnabled) services.push('Activity Logs');
      if (this.cfg.sentinelEnabled) services.push('Microsoft Sentinel');

      return {
        success: true,
        provider: 'azure',
        latencyMs,
        message: `Azure connected to subscription "${sub.displayName || this.cfg.subscriptionId}"`,
        services,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: 'azure',
        latencyMs: Date.now() - start,
        message: `Azure connectivity error: ${err.message}`,
      };
    }
  }

  async fetchDefenderAlerts(): Promise<CloudFinding[]> {
    if (!this.cfg.defenderForCloudEnabled) return [];

    const findings: CloudFinding[] = [];
    try {
      const token = await this.getAccessToken();
      const res = await fetch(
        `https://management.azure.com/subscriptions/${this.cfg.subscriptionId}/providers/Microsoft.Security/alerts?api-version=2022-01-01`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) return [];

      const data = await res.json();
      for (const alert of (data.value || [])) {
        const props = alert.properties || {};
        findings.push({
          id: alert.id || `az-def-${Date.now()}`,
          provider: 'azure',
          source: 'Defender for Cloud',
          title: props.alertDisplayName || alert.name,
          description: props.description || '',
          severity: mapAzureSeverity(props.severity),
          category: props.intent || props.alertType || 'Threat',
          resourceId: props.compromisedEntity,
          resourceType: 'AzureResource',
          region: alert.location,
          timestamp: props.alertCreationTime || new Date().toISOString(),
          rawData: alert,
        });
      }
    } catch (_) {}

    return findings;
  }

  async fetchActivityLogs(lookbackMinutes = 60): Promise<CloudFinding[]> {
    if (!this.cfg.activityLogsEnabled) return [];

    const findings: CloudFinding[] = [];
    try {
      const token = await this.getAccessToken();
      const startTime = isoAgo(lookbackMinutes);
      const filter = encodeURIComponent(`eventTimestamp ge '${startTime}' and category eq 'Security'`);

      const res = await fetch(
        `https://management.azure.com/subscriptions/${this.cfg.subscriptionId}/providers/microsoft.insights/eventtypes/management/values?api-version=2015-04-01&$filter=${filter}&$top=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) return [];

      const data = await res.json();
      for (const log of (data.value || [])) {
        findings.push({
          id: log.id || `az-log-${Date.now()}`,
          provider: 'azure',
          source: 'Activity Logs',
          title: log.operationName?.localizedValue || log.operationName?.value || 'Activity Event',
          description: `${log.operationName?.localizedValue || ''} by ${log.caller || 'unknown'}`,
          severity: log.level === 'Error' || log.level === 'Critical' ? 'HIGH' : 'LOW',
          category: 'Audit',
          resourceId: log.resourceId,
          resourceType: log.resourceType?.value,
          timestamp: log.eventTimestamp || new Date().toISOString(),
          rawData: log,
        });
      }
    } catch (_) {}

    return findings;
  }

  async fetchSentinelIncidents(): Promise<CloudFinding[]> {
    if (!this.cfg.sentinelEnabled || !this.cfg.sentinelWorkspaceName || !this.cfg.sentinelResourceGroup) {
      return [];
    }

    const findings: CloudFinding[] = [];
    try {
      const token = await this.getAccessToken();
      const url = `https://management.azure.com/subscriptions/${this.cfg.subscriptionId}/resourceGroups/${this.cfg.sentinelResourceGroup}/providers/Microsoft.OperationalInsights/workspaces/${this.cfg.sentinelWorkspaceName}/providers/Microsoft.SecurityInsights/incidents?api-version=2023-02-01&$top=50`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];

      const data = await res.json();
      for (const incident of (data.value || [])) {
        const props = incident.properties || {};
        if (props.status === 'Closed') continue;

        findings.push({
          id: incident.id,
          provider: 'azure',
          source: 'Microsoft Sentinel',
          title: props.title,
          description: props.description || '',
          severity: mapAzureSeverity(props.severity),
          category: props.classification || 'Incident',
          resourceId: props.incidentNumber?.toString(),
          timestamp: props.createdTimeUtc || new Date().toISOString(),
          rawData: incident,
        });
      }
    } catch (_) {}

    return findings;
  }

  async sync(lookbackMinutes = 60): Promise<SyncResult> {
    const start = Date.now();
    const sources: string[] = [];
    let allFindings: CloudFinding[] = [];

    const [def, al, sent] = await Promise.allSettled([
      this.fetchDefenderAlerts(),
      this.fetchActivityLogs(lookbackMinutes),
      this.fetchSentinelIncidents(),
    ]);

    if (def.status === 'fulfilled' && def.value.length > 0) {
      allFindings = allFindings.concat(def.value);
      sources.push('Defender for Cloud');
    }
    if (al.status === 'fulfilled' && al.value.length > 0) {
      allFindings = allFindings.concat(al.value);
      sources.push('Activity Logs');
    }
    if (sent.status === 'fulfilled' && sent.value.length > 0) {
      allFindings = allFindings.concat(sent.value);
      sources.push('Microsoft Sentinel');
    }

    return {
      success: true,
      provider: 'azure',
      findingsCount: allFindings.length,
      sources,
      durationMs: Date.now() - start,
      findings: allFindings,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. GCP Connector
// ─────────────────────────────────────────────────────────────────────────────

export class GCPConnector {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(private cfg: IGCPConfig) {}

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry - 60_000) {
      return this.accessToken;
    }

    let keyData: any;
    try {
      keyData = JSON.parse(this.cfg.serviceAccountKey);
    } catch {
      throw new Error('Invalid GCP service account key JSON');
    }

    // Create JWT for service account
    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: keyData.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    };

    // Sign JWT using RS256 with the private key
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify(claim));
    const unsignedJwt = `${header}.${payload}`;

    // Import private key
    const pemKey = keyData.private_key;
    const pemBody = pemKey.replace(/-----.*?-----/g, '').replace(/\s/g, '');
    const keyBuffer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0)).buffer;

    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      keyBuffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      privateKey,
      new TextEncoder().encode(unsignedJwt)
    );

    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
    const jwt = `${unsignedJwt}.${sigB64}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }).toString(),
    });

    if (!res.ok) throw new Error(`GCP auth failed: HTTP ${res.status}`);

    const data = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000;
    return this.accessToken!;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const start = Date.now();
    const services: string[] = [];

    try {
      const token = await this.getAccessToken();
      const latencyMs = Date.now() - start;

      // Test project access
      const res = await fetch(
        `https://cloudresourcemanager.googleapis.com/v1/projects/${this.cfg.projectId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        return {
          success: false,
          provider: 'gcp',
          latencyMs,
          message: `GCP project access failed: HTTP ${res.status}`,
        };
      }

      const proj = await res.json();
      if (this.cfg.sccEnabled) services.push('Security Command Center');
      if (this.cfg.cloudLoggingEnabled) services.push('Cloud Logging');
      if (this.cfg.assetInventoryEnabled) services.push('Asset Inventory');

      return {
        success: true,
        provider: 'gcp',
        latencyMs,
        message: `GCP connected to project "${proj.name || this.cfg.projectId}"`,
        services,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: 'gcp',
        latencyMs: Date.now() - start,
        message: `GCP connectivity error: ${err.message}`,
      };
    }
  }

  async fetchSCCFindings(): Promise<CloudFinding[]> {
    if (!this.cfg.sccEnabled) return [];

    const orgId = this.cfg.sccOrganizationId;
    if (!orgId) return [];

    const findings: CloudFinding[] = [];
    try {
      const token = await this.getAccessToken();
      const res = await fetch(
        `https://securitycenter.googleapis.com/v1/organizations/${orgId}/sources/-/findings?filter=state%3D"ACTIVE"&pageSize=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) return [];

      const data = await res.json();
      for (const finding of (data.listFindingsResults || [])) {
        const f = finding.finding || {};
        findings.push({
          id: f.name || `gcp-scc-${Date.now()}`,
          provider: 'gcp',
          source: 'Security Command Center',
          title: f.category || 'SCC Finding',
          description: f.description || f.sourceProperties?.summary || '',
          severity: mapGCPSeverity(f.severity),
          category: f.findingClass || f.category || 'Security',
          resourceId: f.resourceName,
          resourceType: finding.resource?.type,
          timestamp: f.eventTime || f.createTime || new Date().toISOString(),
          rawData: f,
        });
      }
    } catch (_) {}

    return findings;
  }

  async fetchCloudAuditLogs(lookbackMinutes = 60): Promise<CloudFinding[]> {
    if (!this.cfg.cloudLoggingEnabled) return [];

    const findings: CloudFinding[] = [];
    try {
      const token = await this.getAccessToken();
      const startTime = isoAgo(lookbackMinutes);

      const body = JSON.stringify({
        resourceNames: [`projects/${this.cfg.projectId}`],
        filter: `logName:"cloudaudit.googleapis.com" AND timestamp>="${startTime}" AND protoPayload.methodName:"delete" OR protoPayload.methodName:"create" OR protoPayload.methodName:"update" AND severity>="WARNING"`,
        pageSize: 50,
        orderBy: 'timestamp desc',
      });

      const res = await fetch(
        'https://logging.googleapis.com/v2/entries:list',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body,
        }
      );

      if (!res.ok) return [];

      const data = await res.json();
      for (const entry of (data.entries || [])) {
        const proto = entry.protoPayload || {};
        findings.push({
          id: entry.insertId || `gcp-log-${Date.now()}`,
          provider: 'gcp',
          source: 'Cloud Logging',
          title: proto.methodName || 'Audit Log Event',
          description: `${proto.methodName || ''} by ${proto.authenticationInfo?.principalEmail || 'unknown'}`,
          severity: gcpLogSeverity(entry.severity),
          category: 'Audit',
          resourceId: proto.resourceName,
          resourceType: entry.resource?.type,
          region: entry.resource?.labels?.location,
          timestamp: entry.timestamp || new Date().toISOString(),
          rawData: entry,
        });
      }
    } catch (_) {}

    return findings;
  }

  async sync(lookbackMinutes = 60): Promise<SyncResult> {
    const start = Date.now();
    const sources: string[] = [];
    let allFindings: CloudFinding[] = [];

    const [scc, logs] = await Promise.allSettled([
      this.fetchSCCFindings(),
      this.fetchCloudAuditLogs(lookbackMinutes),
    ]);

    if (scc.status === 'fulfilled' && scc.value.length > 0) {
      allFindings = allFindings.concat(scc.value);
      sources.push('Security Command Center');
    }
    if (logs.status === 'fulfilled' && logs.value.length > 0) {
      allFindings = allFindings.concat(logs.value);
      sources.push('Cloud Logging');
    }

    return {
      success: true,
      provider: 'gcp',
      findingsCount: allFindings.length,
      sources,
      durationMs: Date.now() - start,
      findings: allFindings,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Cloud Manager
// ─────────────────────────────────────────────────────────────────────────────

export class CloudSecurityManager {
  static getConnector(
    config: ICloudSecurityConfig
  ): AWSConnector | AzureConnector | GCPConnector | null {
    switch (config.provider) {
      case 'aws':
        if (!config.awsConfig) return null;
        return new AWSConnector(config.awsConfig);
      case 'azure':
        if (!config.azureConfig) return null;
        return new AzureConnector(config.azureConfig);
      case 'gcp':
        if (!config.gcpConfig) return null;
        return new GCPConnector(config.gcpConfig);
      default:
        return null;
    }
  }

  static async testConnection(config: ICloudSecurityConfig): Promise<ConnectionTestResult> {
    const connector = this.getConnector(config);
    if (!connector) {
      return {
        success: false,
        provider: config.provider,
        message: `No valid configuration found for provider: ${config.provider}`,
      };
    }
    return connector.testConnection();
  }

  static filterFindings(
    findings: CloudFinding[],
    config: ICloudSecurityConfig
  ): CloudFinding[] {
    const rules = config.forwardingRules;
    if (!rules.enabled) return [];

    return findings.filter((f) => {
      const sevMatch =
        rules.severities.length === 0 || rules.severities.includes(f.severity);
      const catMatch =
        rules.categories.length === 0 || rules.categories.includes(f.category);
      return sevMatch && catMatch;
    });
  }

  static async sync(config: ICloudSecurityConfig): Promise<SyncResult> {
    const connector = this.getConnector(config);
    if (!connector) {
      return {
        success: false,
        provider: config.provider,
        findingsCount: 0,
        sources: [],
        findings: [],
        error: `No valid configuration for ${config.provider}`,
      };
    }

    const result = await (connector as AWSConnector).sync(
      config.forwardingRules.pollIntervalMinutes || 60
    );

    result.findings = this.filterFindings(result.findings, config);
    result.findingsCount = result.findings.length;
    return result;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Severity mapping utilities
// ─────────────────────────────────────────────────────────────────────────────

const HIGH_RISK_CLOUDTRAIL = new Set([
  'DeleteTrail', 'StopLogging', 'DeleteFlowLogs', 'DeleteDetector',
  'CreateAccessKey', 'AttachRolePolicy', 'PutUserPolicy', 'PutGroupPolicy',
  'DeleteBucketPolicy', 'PutBucketPolicy', 'ConsoleLogin',
  'AuthorizeSecurityGroupIngress', 'RunInstances',
]);

function classifyCloudTrailSeverity(
  eventName?: string
): CloudFinding['severity'] {
  if (!eventName) return 'LOW';
  if (HIGH_RISK_CLOUDTRAIL.has(eventName)) return 'HIGH';
  if (eventName.startsWith('Delete') || eventName.startsWith('Disable')) return 'MEDIUM';
  return 'LOW';
}

function mapGuardDutySeverity(score: number): CloudFinding['severity'] {
  if (score >= 8) return 'CRITICAL';
  if (score >= 6) return 'HIGH';
  if (score >= 4) return 'MEDIUM';
  return 'LOW';
}

function mapAzureSeverity(s?: string): CloudFinding['severity'] {
  const map: Record<string, CloudFinding['severity']> = {
    High: 'HIGH', Medium: 'MEDIUM', Low: 'LOW',
    Critical: 'CRITICAL', Informational: 'INFORMATIONAL',
    high: 'HIGH', medium: 'MEDIUM', low: 'LOW',
    critical: 'CRITICAL', informational: 'INFORMATIONAL',
  };
  return map[s || ''] || 'MEDIUM';
}

function mapGCPSeverity(s?: string): CloudFinding['severity'] {
  const map: Record<string, CloudFinding['severity']> = {
    CRITICAL: 'CRITICAL', HIGH: 'HIGH', MEDIUM: 'MEDIUM',
    LOW: 'LOW', INFORMATIONAL: 'INFORMATIONAL',
  };
  return map[s || ''] || 'MEDIUM';
}

function gcpLogSeverity(s?: string): CloudFinding['severity'] {
  if (!s) return 'LOW';
  if (['EMERGENCY', 'ALERT', 'CRITICAL'].includes(s)) return 'CRITICAL';
  if (s === 'ERROR') return 'HIGH';
  if (s === 'WARNING') return 'MEDIUM';
  return 'LOW';
}
