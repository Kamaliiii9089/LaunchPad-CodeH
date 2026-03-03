'use client';

import { useState, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SIEMType = 'splunk' | 'elk' | 'qradar' | 'syslog';
type SIEMStatus = 'active' | 'inactive' | 'error' | 'testing';

interface SIEMConfig {
  _id: string;
  name: string;
  description?: string;
  type: SIEMType;
  status: SIEMStatus;
  enabled: boolean;
  splunkConfig?: {
    host: string;
    port: number;
    token: string;
    index: string;
    sourcetype: string;
    ssl: boolean;
  };
  elkConfig?: {
    elasticsearchUrl: string;
    kibanaUrl?: string;
    indexPattern: string;
    apiKey?: string;
    username?: string;
    password?: string;
    ssl: boolean;
    pipeline?: string;
  };
  qradarConfig?: {
    consoleHost: string;
    apiToken: string;
    logSourceName: string;
    protocol: 'https' | 'http';
    verifySSL: boolean;
  };
  syslogConfig?: {
    host: string;
    port: number;
    protocol: 'UDP' | 'TCP' | 'TLS';
    facility: string;
    appName: string;
    rfc: 'RFC5424' | 'RFC3164';
  };
  forwardingRules: {
    severities: string[];
    eventTypes: string[];
    statuses: string[];
    enabled: boolean;
  };
  batchSize: number;
  retryAttempts: number;
  lastConnectedAt?: string;
  lastForwardedAt?: string;
  lastError?: string;
  eventsForwarded: number;
  eventsFailed: number;
  createdAt: string;
}

interface SIEMStats {
  total: number;
  active: number;
  inactive: number;
  error: number;
  totalEventsForwarded: number;
  totalEventsFailed: number;
  byType: Record<SIEMType, number>;
}

interface SIEMConfigManagerProps {
  toast: any;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const SIEM_META: Record<SIEMType, { label: string; icon: string; color: string; description: string }> = {
  splunk: {
    label: 'Splunk',
    icon: '🟠',
    color: 'orange',
    description: 'Forward events to Splunk via HTTP Event Collector (HEC)',
  },
  elk: {
    label: 'ELK Stack',
    icon: '🟣',
    color: 'purple',
    description: 'Index events into Elasticsearch / Kibana (ELK / OpenSearch)',
  },
  qradar: {
    label: 'IBM QRadar',
    icon: '🔵',
    color: 'blue',
    description: 'Send events to IBM QRadar SIEM via RESTful API',
  },
  syslog: {
    label: 'Syslog',
    icon: '🟢',
    color: 'green',
    description: 'Forward RFC 5424 / RFC 3164 syslog messages (UDP, TCP, TLS)',
  },
};

const STATUS_BADGE: Record<SIEMStatus, { bg: string; text: string; label: string }> = {
  active:   { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Active' },
  inactive: { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Inactive' },
  error:    { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Error' },
  testing:  { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Testing…' },
};

const DEFAULT_FORM = {
  name: '',
  description: '',
  type: 'splunk' as SIEMType,
  enabled: true,
  // Splunk
  splunkHost: '',
  splunkPort: '8088',
  splunkToken: '',
  splunkIndex: 'main',
  splunkSourcetype: 'breachbuddy:security',
  splunkSsl: true,
  // ELK
  elkUrl: '',
  elkKibanaUrl: '',
  elkIndex: 'breachbuddy-security-*',
  elkApiKey: '',
  elkUsername: '',
  elkPassword: '',
  elkSsl: true,
  elkPipeline: '',
  // QRadar
  qradarHost: '',
  qradarToken: '',
  qradarLogSource: 'BreachBuddy',
  qradarProtocol: 'https' as 'https' | 'http',
  qradarVerifySSL: true,
  // Syslog
  syslogHost: '',
  syslogPort: '514',
  syslogProtocol: 'UDP' as 'UDP' | 'TCP' | 'TLS',
  syslogFacility: 'auth',
  syslogAppName: 'breachbuddy',
  syslogRfc: 'RFC5424' as 'RFC5424' | 'RFC3164',
  // Forwarding
  fwdSeverities: ['critical', 'high', 'medium', 'low'],
  fwdStatuses: ['active', 'investigating'],
  fwdEnabled: true,
  batchSize: '100',
  retryAttempts: '3',
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function SIEMConfigManager({ toast }: SIEMConfigManagerProps) {
  const [configs, setConfigs] = useState<SIEMConfig[]>([]);
  const [stats, setStats] = useState<SIEMStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [forwardingId, setForwardingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...DEFAULT_FORM });

  useEffect(() => {
    loadConfigs();
    loadStats();
  }, []);

  // ── API calls ───────────────────────────────────────────────────────────────

  const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : '');

  const apiHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token()}`,
  });

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/siem', { headers: apiHeaders() });
      const data = await res.json();
      if (data.success) setConfigs(data.configs);
    } catch {
      toast.error('Failed to load SIEM configurations');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch('/api/siem/stats', { headers: apiHeaders() });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch {}
  };

  const buildPayload = () => {
    const base = {
      name: form.name,
      description: form.description,
      type: form.type,
      enabled: form.enabled,
      forwardingRules: {
        severities: form.fwdSeverities,
        statuses: form.fwdStatuses,
        eventTypes: [],
        enabled: form.fwdEnabled,
      },
      batchSize: Number(form.batchSize),
      retryAttempts: Number(form.retryAttempts),
    };

    if (form.type === 'splunk') {
      return {
        ...base,
        splunkConfig: {
          host: form.splunkHost,
          port: Number(form.splunkPort),
          token: form.splunkToken,
          index: form.splunkIndex,
          sourcetype: form.splunkSourcetype,
          ssl: form.splunkSsl,
        },
      };
    }
    if (form.type === 'elk') {
      return {
        ...base,
        elkConfig: {
          elasticsearchUrl: form.elkUrl,
          kibanaUrl: form.elkKibanaUrl || undefined,
          indexPattern: form.elkIndex,
          apiKey: form.elkApiKey || undefined,
          username: form.elkUsername || undefined,
          password: form.elkPassword || undefined,
          ssl: form.elkSsl,
          pipeline: form.elkPipeline || undefined,
        },
      };
    }
    if (form.type === 'qradar') {
      return {
        ...base,
        qradarConfig: {
          consoleHost: form.qradarHost,
          apiToken: form.qradarToken,
          logSourceName: form.qradarLogSource,
          protocol: form.qradarProtocol,
          verifySSL: form.qradarVerifySSL,
        },
      };
    }
    // syslog
    return {
      ...base,
      syslogConfig: {
        host: form.syslogHost,
        port: Number(form.syslogPort),
        protocol: form.syslogProtocol,
        facility: form.syslogFacility,
        appName: form.syslogAppName,
        rfc: form.syslogRfc,
      },
    };
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Connector name is required');
      return;
    }

    try {
      const payload = buildPayload();
      const url = editingId ? `/api/siem/${editingId}` : '/api/siem';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: apiHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      toast.success(editingId ? 'SIEM connector updated' : 'SIEM connector created');
      setShowCreateModal(false);
      setEditingId(null);
      setForm({ ...DEFAULT_FORM });
      loadConfigs();
      loadStats();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save SIEM configuration');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete SIEM connector "${name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/siem/${id}`, {
        method: 'DELETE',
        headers: apiHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('SIEM connector deleted');
      loadConfigs();
      loadStats();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete SIEM connector');
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`/api/siem/${id}/test`, {
        method: 'POST',
        headers: apiHeaders(),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Connection successful! Latency: ${data.result?.latencyMs ?? '–'}ms`);
      } else {
        toast.error(`Connection failed: ${data.result?.message || data.error}`);
      }
      loadConfigs();
    } catch (err: any) {
      toast.error(err.message || 'Test failed');
    } finally {
      setTestingId(null);
    }
  };

  const handleForwardSampleEvents = async (id: string) => {
    setForwardingId(id);
    const sampleEvents = [
      { id: 'sample-1', type: 'Brute Force Attack', severity: 'critical', description: 'Sample: brute-force test event from BreachBuddy', timestamp: new Date().toISOString(), status: 'active', sourceIp: '198.51.100.1' },
      { id: 'sample-2', type: 'SQL Injection', severity: 'high', description: 'Sample: SQL injection test event from BreachBuddy', timestamp: new Date().toISOString(), status: 'investigating', sourceIp: '203.0.113.5' },
    ];

    try {
      const res = await fetch('/api/siem/forward', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ events: sampleEvents, configId: id }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Forwarded ${sampleEvents.length} sample events successfully`);
      } else {
        toast.error(`Forward failed: ${data.results?.[0]?.error || data.error}`);
      }
      loadConfigs();
    } catch (err: any) {
      toast.error(err.message || 'Failed to forward events');
    } finally {
      setForwardingId(null);
    }
  };

  const openEdit = (c: SIEMConfig) => {
    const f: typeof DEFAULT_FORM = {
      ...DEFAULT_FORM,
      name: c.name,
      description: c.description || '',
      type: c.type,
      enabled: c.enabled,
      fwdSeverities: c.forwardingRules.severities,
      fwdStatuses: c.forwardingRules.statuses,
      fwdEnabled: c.forwardingRules.enabled,
      batchSize: String(c.batchSize),
      retryAttempts: String(c.retryAttempts),
    };

    if (c.splunkConfig) {
      f.splunkHost = c.splunkConfig.host;
      f.splunkPort = String(c.splunkConfig.port);
      f.splunkToken = c.splunkConfig.token || '';
      f.splunkIndex = c.splunkConfig.index;
      f.splunkSourcetype = c.splunkConfig.sourcetype;
      f.splunkSsl = c.splunkConfig.ssl;
    }
    if (c.elkConfig) {
      f.elkUrl = c.elkConfig.elasticsearchUrl;
      f.elkKibanaUrl = c.elkConfig.kibanaUrl || '';
      f.elkIndex = c.elkConfig.indexPattern;
      f.elkApiKey = c.elkConfig.apiKey || '';
      f.elkUsername = c.elkConfig.username || '';
      f.elkSsl = c.elkConfig.ssl;
      f.elkPipeline = c.elkConfig.pipeline || '';
    }
    if (c.qradarConfig) {
      f.qradarHost = c.qradarConfig.consoleHost;
      f.qradarToken = c.qradarConfig.apiToken || '';
      f.qradarLogSource = c.qradarConfig.logSourceName;
      f.qradarProtocol = c.qradarConfig.protocol;
      f.qradarVerifySSL = c.qradarConfig.verifySSL;
    }
    if (c.syslogConfig) {
      f.syslogHost = c.syslogConfig.host;
      f.syslogPort = String(c.syslogConfig.port);
      f.syslogProtocol = c.syslogConfig.protocol;
      f.syslogFacility = c.syslogConfig.facility;
      f.syslogAppName = c.syslogConfig.appName;
      f.syslogRfc = c.syslogConfig.rfc;
    }

    setForm(f);
    setEditingId(c._id);
    setShowCreateModal(true);
  };

  const toggleSeverity = (s: string) => {
    setForm((prev) => ({
      ...prev,
      fwdSeverities: prev.fwdSeverities.includes(s)
        ? prev.fwdSeverities.filter((x) => x !== s)
        : [...prev.fwdSeverities, s],
    }));
  };

  const toggleStatus = (s: string) => {
    setForm((prev) => ({
      ...prev,
      fwdStatuses: prev.fwdStatuses.includes(s)
        ? prev.fwdStatuses.filter((x) => x !== s)
        : [...prev.fwdStatuses, s],
    }));
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>🛰️</span> SIEM Integrations
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Forward security events to Splunk, ELK Stack, IBM QRadar, or custom Syslog endpoints
          </p>
        </div>
        <button
          onClick={() => { setForm({ ...DEFAULT_FORM }); setEditingId(null); setShowCreateModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <span>+</span> Add Connector
        </button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Connectors', value: stats.total, color: 'text-gray-900' },
            { label: 'Active', value: stats.active, color: 'text-green-600' },
            { label: 'Events Forwarded', value: stats.totalEventsForwarded.toLocaleString(), color: 'text-blue-600' },
            { label: 'Failed Events', value: stats.totalEventsFailed.toLocaleString(), color: stats.totalEventsFailed > 0 ? 'text-red-600' : 'text-gray-500' },
          ].map((s) => (
            <div key={s.label} className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* SIEM type cards (empty state) */}
      {!loading && configs.length === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 font-medium">Available integrations:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.entries(SIEM_META) as [SIEMType, typeof SIEM_META[SIEMType]][]).map(([type, meta]) => (
              <button
                key={type}
                onClick={() => {
                  setForm({ ...DEFAULT_FORM, type });
                  setEditingId(null);
                  setShowCreateModal(true);
                }}
                className="p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{meta.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-blue-700">{meta.label}</p>
                    <p className="text-xs text-gray-500">{meta.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading connectors…</p>
        </div>
      )}

      {/* Config list */}
      {!loading && configs.length > 0 && (
        <div className="space-y-3">
          {configs.map((c) => {
            const meta = SIEM_META[c.type];
            const statusBadge = STATUS_BADGE[c.status];
            const isExpanded = expandedId === c._id;

            return (
              <div key={c._id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Row header */}
                <div className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : c._id)}>
                  <span className="text-2xl flex-shrink-0">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 truncate">{c.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                        {statusBadge.label}
                      </span>
                      {!c.enabled && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">Disabled</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {meta.label} · {c.eventsForwarded.toLocaleString()} events forwarded
                      {c.lastForwardedAt && ` · last: ${new Date(c.lastForwardedAt).toLocaleString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTest(c._id); }}
                      disabled={testingId === c._id}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                    >
                      {testingId === c._id ? 'Testing…' : 'Test'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleForwardSampleEvents(c._id); }}
                      disabled={forwardingId === c._id}
                      className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-600 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
                    >
                      {forwardingId === c._id ? 'Sending…' : 'Send Sample'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                      className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(c._id, c.name); }}
                      className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Connection</p>
                      {c.splunkConfig && (
                        <div className="space-y-1 text-gray-700">
                          <p><span className="text-gray-400">Host:</span> {c.splunkConfig.host}:{c.splunkConfig.port}</p>
                          <p><span className="text-gray-400">Index:</span> {c.splunkConfig.index}</p>
                          <p><span className="text-gray-400">SSL:</span> {c.splunkConfig.ssl ? 'Yes' : 'No'}</p>
                        </div>
                      )}
                      {c.elkConfig && (
                        <div className="space-y-1 text-gray-700">
                          <p><span className="text-gray-400">URL:</span> {c.elkConfig.elasticsearchUrl}</p>
                          <p><span className="text-gray-400">Index:</span> {c.elkConfig.indexPattern}</p>
                          <p><span className="text-gray-400">SSL:</span> {c.elkConfig.ssl ? 'Yes' : 'No'}</p>
                        </div>
                      )}
                      {c.qradarConfig && (
                        <div className="space-y-1 text-gray-700">
                          <p><span className="text-gray-400">Host:</span> {c.qradarConfig.consoleHost}</p>
                          <p><span className="text-gray-400">Protocol:</span> {c.qradarConfig.protocol.toUpperCase()}</p>
                          <p><span className="text-gray-400">Log Source:</span> {c.qradarConfig.logSourceName}</p>
                        </div>
                      )}
                      {c.syslogConfig && (
                        <div className="space-y-1 text-gray-700">
                          <p><span className="text-gray-400">Host:</span> {c.syslogConfig.host}:{c.syslogConfig.port}</p>
                          <p><span className="text-gray-400">Protocol:</span> {c.syslogConfig.protocol}</p>
                          <p><span className="text-gray-400">Format:</span> {c.syslogConfig.rfc}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Forwarding Rules</p>
                      <div className="space-y-1 text-gray-700">
                        <p><span className="text-gray-400">Severities:</span> {c.forwardingRules.severities.join(', ') || 'all'}</p>
                        <p><span className="text-gray-400">Statuses:</span> {c.forwardingRules.statuses.join(', ') || 'all'}</p>
                        <p><span className="text-gray-400">Batch size:</span> {c.batchSize}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Statistics</p>
                      <div className="space-y-1 text-gray-700">
                        <p><span className="text-gray-400">Forwarded:</span> {c.eventsForwarded.toLocaleString()}</p>
                        <p><span className="text-gray-400">Failed:</span> {c.eventsFailed.toLocaleString()}</p>
                        {c.lastError && (
                          <p className="text-red-600 text-xs truncate" title={c.lastError}>
                            <span className="text-gray-400">Last error:</span> {c.lastError}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Modal ──────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit SIEM Connector' : 'New SIEM Connector'}
              </h3>
              <button onClick={() => { setShowCreateModal(false); setEditingId(null); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Connector Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Production Splunk"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Optional description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>

                {/* SIEM type selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SIEM Type <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(SIEM_META) as [SIEMType, typeof SIEM_META[SIEMType]][]).map(([type, meta]) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, type }))}
                        className={`p-3 border-2 rounded-lg text-left transition-all ${
                          form.type === type
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{meta.icon}</span>
                          <span className="font-medium text-sm text-gray-900">{meta.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={form.enabled}
                      onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <span className="text-sm text-gray-700">Enable connector</span>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Connector-specific settings */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  {SIEM_META[form.type].icon} {SIEM_META[form.type].label} Settings
                </p>

                {form.type === 'splunk' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">HEC Host</label>
                        <input type="text" value={form.splunkHost} onChange={(e) => setForm((p) => ({ ...p, splunkHost: e.target.value }))} placeholder="splunk.example.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Port</label>
                        <input type="number" value={form.splunkPort} onChange={(e) => setForm((p) => ({ ...p, splunkPort: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">HEC Token</label>
                      <input type="password" value={form.splunkToken} onChange={(e) => setForm((p) => ({ ...p, splunkToken: e.target.value }))} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Index</label>
                        <input type="text" value={form.splunkIndex} onChange={(e) => setForm((p) => ({ ...p, splunkIndex: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Sourcetype</label>
                        <input type="text" value={form.splunkSourcetype} onChange={(e) => setForm((p) => ({ ...p, splunkSourcetype: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="splunkSsl" checked={form.splunkSsl} onChange={(e) => setForm((p) => ({ ...p, splunkSsl: e.target.checked }))} className="rounded" />
                      <label htmlFor="splunkSsl" className="text-sm text-gray-700">Use HTTPS (SSL/TLS)</label>
                    </div>
                  </div>
                )}

                {form.type === 'elk' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Elasticsearch URL</label>
                      <input type="text" value={form.elkUrl} onChange={(e) => setForm((p) => ({ ...p, elkUrl: e.target.value }))} placeholder="https://elastic.example.com:9200" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Kibana URL (optional)</label>
                      <input type="text" value={form.elkKibanaUrl} onChange={(e) => setForm((p) => ({ ...p, elkKibanaUrl: e.target.value }))} placeholder="https://kibana.example.com:5601" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Index Pattern</label>
                      <input type="text" value={form.elkIndex} onChange={(e) => setForm((p) => ({ ...p, elkIndex: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs font-medium text-gray-600 mb-2">Authentication (choose one)</p>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">API Key</label>
                          <input type="password" value={form.elkApiKey} onChange={(e) => setForm((p) => ({ ...p, elkApiKey: e.target.value }))} placeholder="base64-encoded API key" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Username</label>
                            <input type="text" value={form.elkUsername} onChange={(e) => setForm((p) => ({ ...p, elkUsername: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Password</label>
                            <input type="password" value={form.elkPassword} onChange={(e) => setForm((p) => ({ ...p, elkPassword: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Ingest Pipeline (optional)</label>
                      <input type="text" value={form.elkPipeline} onChange={(e) => setForm((p) => ({ ...p, elkPipeline: e.target.value }))} placeholder="breachbuddy-pipeline" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="elkSsl" checked={form.elkSsl} onChange={(e) => setForm((p) => ({ ...p, elkSsl: e.target.checked }))} className="rounded" />
                      <label htmlFor="elkSsl" className="text-sm text-gray-700">Use HTTPS (SSL/TLS)</label>
                    </div>
                  </div>
                )}

                {form.type === 'qradar' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">QRadar Console Host</label>
                      <input type="text" value={form.qradarHost} onChange={(e) => setForm((p) => ({ ...p, qradarHost: e.target.value }))} placeholder="qradar.example.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">API Token (SEC header)</label>
                      <input type="password" value={form.qradarToken} onChange={(e) => setForm((p) => ({ ...p, qradarToken: e.target.value }))} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Log Source Name</label>
                      <input type="text" value={form.qradarLogSource} onChange={(e) => setForm((p) => ({ ...p, qradarLogSource: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Protocol</label>
                        <select value={form.qradarProtocol} onChange={(e) => setForm((p) => ({ ...p, qradarProtocol: e.target.value as 'https' | 'http' }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm">
                          <option value="https">HTTPS</option>
                          <option value="http">HTTP</option>
                        </select>
                      </div>
                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" checked={form.qradarVerifySSL} onChange={(e) => setForm((p) => ({ ...p, qradarVerifySSL: e.target.checked }))} className="rounded" />
                          Verify SSL Certificate
                        </label>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                      The QRadar API token requires <strong>Admin or Security Analyst</strong> privileges. Generate it in QRadar Admin → Authorized Services.
                    </div>
                  </div>
                )}

                {form.type === 'syslog' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Syslog Host</label>
                        <input type="text" value={form.syslogHost} onChange={(e) => setForm((p) => ({ ...p, syslogHost: e.target.value }))} placeholder="syslog.example.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Port</label>
                        <input type="number" value={form.syslogPort} onChange={(e) => setForm((p) => ({ ...p, syslogPort: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Transport Protocol</label>
                        <select value={form.syslogProtocol} onChange={(e) => setForm((p) => ({ ...p, syslogProtocol: e.target.value as 'UDP' | 'TCP' | 'TLS' }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm">
                          <option value="UDP">UDP (RFC 5426)</option>
                          <option value="TCP">TCP (RFC 6587)</option>
                          <option value="TLS">TLS (RFC 5425)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Message Format</label>
                        <select value={form.syslogRfc} onChange={(e) => setForm((p) => ({ ...p, syslogRfc: e.target.value as 'RFC5424' | 'RFC3164' }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm">
                          <option value="RFC5424">RFC 5424 (modern)</option>
                          <option value="RFC3164">RFC 3164 (legacy BSD)</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Facility</label>
                        <select value={form.syslogFacility} onChange={(e) => setForm((p) => ({ ...p, syslogFacility: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm">
                          {['kern','user','mail','daemon','auth','syslog','lpr','news','uucp','cron','authpriv','ftp','local0','local1','local2','local3','local4','local5','local6','local7'].map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">App Name (TAG)</label>
                        <input type="text" value={form.syslogAppName} onChange={(e) => setForm((p) => ({ ...p, syslogAppName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <hr className="border-gray-100" />

              {/* Forwarding rules */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">Forwarding Rules</p>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={form.fwdEnabled} onChange={(e) => setForm((p) => ({ ...p, fwdEnabled: e.target.checked }))} className="rounded" />
                    Enabled
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Forward severities:</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { v: 'critical', label: 'Critical', cls: 'bg-red-100 text-red-700 border-red-300' },
                        { v: 'high', label: 'High', cls: 'bg-orange-100 text-orange-700 border-orange-300' },
                        { v: 'medium', label: 'Medium', cls: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
                        { v: 'low', label: 'Low', cls: 'bg-blue-100 text-blue-700 border-blue-300' },
                      ].map(({ v, label, cls }) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => toggleSeverity(v)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-opacity ${cls} ${form.fwdSeverities.includes(v) ? 'opacity-100' : 'opacity-40'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-2">Forward statuses:</p>
                    <div className="flex flex-wrap gap-2">
                      {['active', 'investigating', 'resolved'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleStatus(s)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-opacity capitalize ${form.fwdStatuses.includes(s) ? 'bg-gray-800 text-white border-gray-800' : 'bg-gray-100 text-gray-500 border-gray-300 opacity-50'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Batch Size</label>
                      <input type="number" min="1" max="1000" value={form.batchSize} onChange={(e) => setForm((p) => ({ ...p, batchSize: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Retry Attempts</label>
                      <input type="number" min="0" max="10" value={form.retryAttempts} onChange={(e) => setForm((p) => ({ ...p, retryAttempts: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() => { setShowCreateModal(false); setEditingId(null); }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingId ? 'Save Changes' : 'Create Connector'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
