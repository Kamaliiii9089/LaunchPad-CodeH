/**
 * SIEM Integration Engine
 * Provides connectors for Splunk, ELK Stack, IBM QRadar, and custom Syslog forwarding
 */

import { ISIEMConfig, ISplunkConfig, IELKConfig, IQRadarConfig, ISyslogConfig } from '@/models/SIEMConfig';

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

export interface SecurityEventPayload {
  id: string | number;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  timestamp: string;
  status: 'active' | 'investigating' | 'resolved';
  sourceIp?: string;
  destinationIp?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface ForwardResult {
  success: boolean;
  connector: string;
  eventCount: number;
  error?: string;
  responseCode?: number;
  durationMs?: number;
}

export interface ConnectionTestResult {
  success: boolean;
  connector: string;
  latencyMs?: number;
  message: string;
  details?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Severity mapping helpers
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_SYSLOG: Record<string, number> = {
  critical: 2, // Critical
  high: 3,     // Error
  medium: 4,   // Warning
  low: 6,      // Informational
};

const SEVERITY_SPLUNK: Record<string, string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Splunk HEC Connector
// ─────────────────────────────────────────────────────────────────────────────

export class SplunkConnector {
  private config: ISplunkConfig;
  private baseUrl: string;

  constructor(config: ISplunkConfig) {
    this.config = config;
    const scheme = config.ssl ? 'https' : 'http';
    this.baseUrl = `${scheme}://${config.host}:${config.port}`;
  }

  /** Format events to Splunk HEC format */
  private formatEvents(events: SecurityEventPayload[]): string {
    return events
      .map((event) => {
        const hecEvent = {
          time: Math.floor(new Date(event.timestamp).getTime() / 1000),
          host: 'breachbuddy',
          source: 'breachbuddy:security',
          sourcetype: this.config.sourcetype,
          index: this.config.index,
          event: {
            id: event.id,
            type: event.type,
            severity: SEVERITY_SPLUNK[event.severity] || event.severity.toUpperCase(),
            description: event.description,
            status: event.status,
            sourceIp: event.sourceIp,
            destinationIp: event.destinationIp,
            userId: event.userId,
            ...event.metadata,
          },
        };
        return JSON.stringify(hecEvent);
      })
      .join('\n');
  }

  /** Test connection to Splunk HEC */
  async testConnection(): Promise<ConnectionTestResult> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/services/collector/health`, {
        method: 'GET',
        headers: {
          Authorization: `Splunk ${this.config.token}`,
        },
      });

      const latencyMs = Date.now() - start;

      if (response.ok || response.status === 200) {
        return {
          success: true,
          connector: 'splunk',
          latencyMs,
          message: `Splunk HEC reachable at ${this.config.host}:${this.config.port}`,
        };
      }

      return {
        success: false,
        connector: 'splunk',
        latencyMs,
        message: `Splunk HEC responded with HTTP ${response.status}`,
        details: { status: response.status },
      };
    } catch (error: any) {
      return {
        success: false,
        connector: 'splunk',
        latencyMs: Date.now() - start,
        message: `Cannot reach Splunk HEC: ${error.message}`,
      };
    }
  }

  /** Forward events to Splunk via HEC */
  async forwardEvents(events: SecurityEventPayload[]): Promise<ForwardResult> {
    const start = Date.now();
    try {
      const body = this.formatEvents(events);
      const response = await fetch(`${this.baseUrl}/services/collector/event`, {
        method: 'POST',
        headers: {
          Authorization: `Splunk ${this.config.token}`,
          'Content-Type': 'application/json',
        },
        body,
      });

      const durationMs = Date.now() - start;

      if (response.ok) {
        return {
          success: true,
          connector: 'splunk',
          eventCount: events.length,
          responseCode: response.status,
          durationMs,
        };
      }

      const errorText = await response.text();
      return {
        success: false,
        connector: 'splunk',
        eventCount: 0,
        error: `HTTP ${response.status}: ${errorText}`,
        responseCode: response.status,
        durationMs,
      };
    } catch (error: any) {
      return {
        success: false,
        connector: 'splunk',
        eventCount: 0,
        error: error.message,
        durationMs: Date.now() - start,
      };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ELK Stack (Elasticsearch) Connector
// ─────────────────────────────────────────────────────────────────────────────

export class ELKConnector {
  private config: IELKConfig;

  constructor(config: IELKConfig) {
    this.config = config;
  }

  private buildAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `ApiKey ${this.config.apiKey}`;
    } else if (this.config.username && this.config.password) {
      const encoded = Buffer.from(
        `${this.config.username}:${this.config.password}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${encoded}`;
    }

    return headers;
  }

  /** Derive index name from pattern (replace wildcard with date) */
  private resolveIndex(): string {
    const today = new Date().toISOString().slice(0, 10);
    return this.config.indexPattern.replace('*', today);
  }

  /** Build Elasticsearch bulk body */
  private buildBulkBody(events: SecurityEventPayload[]): string {
    const index = this.resolveIndex();
    const lines: string[] = [];

    for (const event of events) {
      const meta = this.config.pipeline
        ? { index: { _index: index, pipeline: this.config.pipeline } }
        : { index: { _index: index } };

      lines.push(JSON.stringify(meta));
      lines.push(
        JSON.stringify({
          '@timestamp': new Date(event.timestamp).toISOString(),
          event: {
            id: event.id,
            type: event.type,
            severity: event.severity,
            description: event.description,
            status: event.status,
          },
          source: { ip: event.sourceIp },
          destination: { ip: event.destinationIp },
          user: { id: event.userId },
          labels: { platform: 'breachbuddy' },
          ...event.metadata,
        })
      );
    }

    return lines.join('\n') + '\n';
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.config.elasticsearchUrl}/_cluster/health`, {
        method: 'GET',
        headers: this.buildAuthHeaders(),
      });

      const latencyMs = Date.now() - start;

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          connector: 'elk',
          latencyMs,
          message: `Elasticsearch cluster "${data.cluster_name}" is ${data.status}`,
          details: { clusterStatus: data.status, indices: data.number_of_indices },
        };
      }

      return {
        success: false,
        connector: 'elk',
        latencyMs,
        message: `Elasticsearch responded with HTTP ${response.status}`,
      };
    } catch (error: any) {
      return {
        success: false,
        connector: 'elk',
        latencyMs: Date.now() - start,
        message: `Cannot reach Elasticsearch: ${error.message}`,
      };
    }
  }

  async forwardEvents(events: SecurityEventPayload[]): Promise<ForwardResult> {
    const start = Date.now();
    try {
      const bulkUrl = `${this.config.elasticsearchUrl}/_bulk`;
      const response = await fetch(bulkUrl, {
        method: 'POST',
        headers: this.buildAuthHeaders(),
        body: this.buildBulkBody(events),
      });

      const durationMs = Date.now() - start;

      if (response.ok) {
        const data = await response.json();
        const failed = data.errors
          ? (data.items || []).filter((i: any) => i.index?.error).length
          : 0;

        return {
          success: !data.errors,
          connector: 'elk',
          eventCount: events.length - failed,
          responseCode: response.status,
          durationMs,
          error: data.errors ? `${failed} events failed to index` : undefined,
        };
      }

      const errorText = await response.text();
      return {
        success: false,
        connector: 'elk',
        eventCount: 0,
        error: `HTTP ${response.status}: ${errorText}`,
        responseCode: response.status,
        durationMs,
      };
    } catch (error: any) {
      return {
        success: false,
        connector: 'elk',
        eventCount: 0,
        error: error.message,
        durationMs: Date.now() - start,
      };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. IBM QRadar Connector
// ─────────────────────────────────────────────────────────────────────────────

export class QRadarConnector {
  private config: IQRadarConfig;
  private baseUrl: string;

  constructor(config: IQRadarConfig) {
    this.config = config;
    this.baseUrl = `${config.protocol}://${config.consoleHost}`;
  }

  private buildHeaders(): Record<string, string> {
    return {
      'SEC': this.config.apiToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Version': '14.0',
    };
  }

  /** Map severity to QRadar magnitude (1–10) */
  private severityToMagnitude(severity: string): number {
    const map: Record<string, number> = {
      critical: 10,
      high: 7,
      medium: 5,
      low: 3,
    };
    return map[severity] ?? 5;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/api/system/information`, {
        method: 'GET',
        headers: this.buildHeaders(),
      });

      const latencyMs = Date.now() - start;

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          connector: 'qradar',
          latencyMs,
          message: `QRadar Console reachable (version ${data.release_name || 'unknown'})`,
          details: { version: data.release_name },
        };
      }

      return {
        success: false,
        connector: 'qradar',
        latencyMs,
        message: `QRadar responded with HTTP ${response.status}`,
      };
    } catch (error: any) {
      return {
        success: false,
        connector: 'qradar',
        latencyMs: Date.now() - start,
        message: `Cannot reach QRadar Console: ${error.message}`,
      };
    }
  }

  /** Forward events as QRadar LEEF (Log Event Extended Format) offenses */
  async forwardEvents(events: SecurityEventPayload[]): Promise<ForwardResult> {
    const start = Date.now();
    const errors: string[] = [];
    let forwarded = 0;

    for (const event of events) {
      try {
        // Create SIEM offense via QRadar Syslog/API
        const leefPayload = {
          log_source_id: this.config.logSourceId,
          log_source_name: this.config.logSourceName,
          event_desc: event.description,
          start_time: new Date(event.timestamp).getTime(),
          severity: this.severityToMagnitude(event.severity),
          event_count: 1,
          username: event.userId,
          source_ip: event.sourceIp,
          destination_ip: event.destinationIp,
          category: event.type,
          status: event.status,
        };

        const response = await fetch(`${this.baseUrl}/api/siem/offenses`, {
          method: 'POST',
          headers: this.buildHeaders(),
          body: JSON.stringify(leefPayload),
        });

        if (response.ok) {
          forwarded++;
        } else {
          errors.push(`Event ${event.id}: HTTP ${response.status}`);
        }
      } catch (err: any) {
        errors.push(`Event ${event.id}: ${err.message}`);
      }
    }

    return {
      success: errors.length === 0,
      connector: 'qradar',
      eventCount: forwarded,
      durationMs: Date.now() - start,
      error: errors.length ? errors.slice(0, 3).join('; ') : undefined,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Syslog Connector (RFC 5424 / RFC 3164)
// ─────────────────────────────────────────────────────────────────────────────

const FACILITY_CODES: Record<string, number> = {
  kern: 0, user: 1, mail: 2, daemon: 3, auth: 4, syslog: 5,
  lpr: 6, news: 7, uucp: 8, cron: 9, authpriv: 10, ftp: 11,
  local0: 16, local1: 17, local2: 18, local3: 19, local4: 20,
  local5: 21, local6: 22, local7: 23,
};

export class SyslogConnector {
  private config: ISyslogConfig;

  constructor(config: ISyslogConfig) {
    this.config = config;
  }

  private calcPriority(severity: string): number {
    const facility = FACILITY_CODES[this.config.facility] ?? 4;
    const severityCode = SEVERITY_SYSLOG[severity] ?? 6;
    return facility * 8 + severityCode;
  }

  /** Format a single event as RFC 5424 syslog message */
  private formatRFC5424(event: SecurityEventPayload): string {
    const pri = this.calcPriority(event.severity);
    const ts = new Date(event.timestamp).toISOString();
    const hostname = 'breachbuddy';
    const appName = this.config.appName;
    const procId = '-';
    const msgId = String(event.id);
    const msg = `type="${event.type}" severity="${event.severity}" status="${event.status}" description="${event.description.replace(/"/g, "'")}"`;

    return `<${pri}>1 ${ts} ${hostname} ${appName} ${procId} ${msgId} - ${msg}`;
  }

  /** Format a single event as RFC 3164 syslog message */
  private formatRFC3164(event: SecurityEventPayload): string {
    const pri = this.calcPriority(event.severity);
    // RFC 3164 timestamp: Mmm dd HH:MM:SS
    const d = new Date(event.timestamp);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const ts = `${months[d.getMonth()]} ${String(d.getDate()).padStart(2,' ')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
    const hostname = 'breachbuddy';
    const msg = `${event.type}: ${event.description} [severity=${event.severity}, status=${event.status}]`;

    return `<${pri}>${ts} ${hostname} ${this.config.appName}: ${msg}`;
  }

  private formatEvent(event: SecurityEventPayload): string {
    return this.config.rfc === 'RFC5424'
      ? this.formatRFC5424(event)
      : this.formatRFC3164(event);
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const start = Date.now();
    // For UDP we can't truly connect-test; we send a NILVALUE test message
    try {
      const testMsg = this.config.rfc === 'RFC5424'
        ? `<${this.calcPriority('low')}>1 ${new Date().toISOString()} breachbuddy ${this.config.appName} - CONN_TEST - BreachBuddy SIEM connectivity test`
        : `<${this.calcPriority('low')}>${new Date().toLocaleString()} breachbuddy ${this.config.appName}: BreachBuddy SIEM connectivity test`;

      await this.sendUDP(testMsg);

      return {
        success: true,
        connector: 'syslog',
        latencyMs: Date.now() - start,
        message: `Syslog test message sent to ${this.config.host}:${this.config.port} (${this.config.protocol})`,
      };
    } catch (error: any) {
      return {
        success: false,
        connector: 'syslog',
        latencyMs: Date.now() - start,
        message: `Syslog test failed: ${error.message}`,
      };
    }
  }

  /**
   * In a Node.js environment, syslog UDP/TCP is sent via dgram/net.
   * Here we use a fetch-based relay endpoint for edge-compatible environments,
   * and fall back to a simulated success when running in browser context.
   */
  private async sendUDP(message: string): Promise<void> {
    // In a real server-side environment, you would use node:dgram.
    // Since Next.js API routes run in Node, we schedule via internal relay.
    // For now we simulate network dispatch (replace with actual dgram in a dedicated Node worker).
    if (typeof window === 'undefined') {
      // Server-side: use event-forwarding relay
      const { siemSyslogRelay } = await import('./siemSyslogRelay');
      await siemSyslogRelay(this.config, message);
    }
    // Client-side: no-op (forwarding is server-side only)
  }

  async forwardEvents(events: SecurityEventPayload[]): Promise<ForwardResult> {
    const start = Date.now();
    let forwarded = 0;
    const errors: string[] = [];

    for (const event of events) {
      try {
        const msg = this.formatEvent(event);
        await this.sendUDP(msg);
        forwarded++;
      } catch (err: any) {
        errors.push(`Event ${event.id}: ${err.message}`);
      }
    }

    return {
      success: errors.length === 0,
      connector: 'syslog',
      eventCount: forwarded,
      durationMs: Date.now() - start,
      error: errors.length ? errors.slice(0, 3).join('; ') : undefined,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIEM Integration Manager — orchestrates all connectors
// ─────────────────────────────────────────────────────────────────────────────

export class SIEMIntegrationManager {
  /** Instantiate the correct connector from a config document */
  static getConnector(
    config: ISIEMConfig
  ): SplunkConnector | ELKConnector | QRadarConnector | SyslogConnector | null {
    switch (config.type) {
      case 'splunk':
        if (!config.splunkConfig) return null;
        return new SplunkConnector(config.splunkConfig);
      case 'elk':
        if (!config.elkConfig) return null;
        return new ELKConnector(config.elkConfig);
      case 'qradar':
        if (!config.qradarConfig) return null;
        return new QRadarConnector(config.qradarConfig);
      case 'syslog':
        if (!config.syslogConfig) return null;
        return new SyslogConnector(config.syslogConfig);
      default:
        return null;
    }
  }

  /** Test connection for any SIEM type */
  static async testConnection(config: ISIEMConfig): Promise<ConnectionTestResult> {
    const connector = this.getConnector(config);
    if (!connector) {
      return {
        success: false,
        connector: config.type,
        message: `No valid configuration found for SIEM type: ${config.type}`,
      };
    }
    return connector.testConnection();
  }

  /** Filter events by forwarding rules */
  static filterEvents(
    events: SecurityEventPayload[],
    config: ISIEMConfig
  ): SecurityEventPayload[] {
    const rules = config.forwardingRules;
    if (!rules.enabled) return [];

    return events.filter((event) => {
      const severityMatch =
        rules.severities.length === 0 || rules.severities.includes(event.severity);
      const statusMatch =
        rules.statuses.length === 0 || rules.statuses.includes(event.status);
      const typeMatch =
        rules.eventTypes.length === 0 || rules.eventTypes.includes(event.type);

      return severityMatch && statusMatch && typeMatch;
    });
  }

  /** Forward filtered events to a SIEM, with retry logic */
  static async forwardEvents(
    events: SecurityEventPayload[],
    config: ISIEMConfig
  ): Promise<ForwardResult> {
    const connector = this.getConnector(config);
    if (!connector) {
      return {
        success: false,
        connector: config.type,
        eventCount: 0,
        error: `No valid configuration for ${config.type}`,
      };
    }

    const filtered = this.filterEvents(events, config);
    if (filtered.length === 0) {
      return {
        success: true,
        connector: config.type,
        eventCount: 0,
      };
    }

    // Split into batches
    const batches: SecurityEventPayload[][] = [];
    for (let i = 0; i < filtered.length; i += config.batchSize) {
      batches.push(filtered.slice(i, i + config.batchSize));
    }

    let totalForwarded = 0;
    let lastError: string | undefined;

    for (const batch of batches) {
      let attempt = 0;
      let result: ForwardResult | null = null;

      while (attempt <= config.retryAttempts) {
        result = await connector.forwardEvents(batch);
        if (result.success) {
          totalForwarded += result.eventCount;
          break;
        }

        attempt++;
        if (attempt <= config.retryAttempts) {
          await new Promise((r) =>
            setTimeout(r, config.retryDelayMs * Math.pow(2, attempt - 1))
          );
        } else {
          lastError = result.error;
        }
      }
    }

    return {
      success: !lastError,
      connector: config.type,
      eventCount: totalForwarded,
      error: lastError,
    };
  }
}
