'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ForwardingRules {
  severities: string[];
  categories: string[];
  pollIntervalMinutes: number;
  enabled: boolean;
}

interface AWSConfig {
  accessKeyId: string;
  secretAccessKey?: string;
  region: string;
  roleArn?: string;
  enableCloudTrail: boolean;
  enableGuardDuty: boolean;
  guardDutyDetectorId?: string;
  enableSecurityHub: boolean;
  enableCloudWatch: boolean;
  cloudWatchLogGroups?: string[];
}

interface AzureConfig {
  tenantId: string;
  clientId: string;
  clientSecret?: string;
  subscriptionId: string;
  enableDefender: boolean;
  enableActivityLogs: boolean;
  enableSentinel: boolean;
  sentinelWorkspaceId?: string;
  sentinelWorkspaceName?: string;
}

interface GCPConfig {
  projectId: string;
  serviceAccountKey?: string;
  organizationId?: string;
  enableSCC: boolean;
  enableCloudLogging: boolean;
  enableAssetInventory: boolean;
}

interface CloudConfig {
  _id: string;
  name: string;
  description?: string;
  provider: 'aws' | 'azure' | 'gcp';
  enabled: boolean;
  status: 'active' | 'inactive' | 'error' | 'testing';
  eventsIngested: number;
  findingsCount: number;
  lastSyncAt?: string;
  lastError?: string;
  awsConfig?: AWSConfig;
  azureConfig?: AzureConfig;
  gcpConfig?: GCPConfig;
  forwardingRules: ForwardingRules;
  createdAt: string;
}

interface Stats {
  total: number;
  active: number;
  error: number;
  totalFindings: number;
  totalEventsIngested: number;
  byProvider: { aws: number; azure: number; gcp: number };
}

const ALL_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'];

const PROVIDER_META = {
  aws: { label: 'AWS', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  azure: { label: 'Azure', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  gcp: { label: 'GCP', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
};

const STATUS_META = {
  active:   { label: 'Active',   cls: 'bg-green-100 text-green-700' },
  inactive: { label: 'Inactive', cls: 'bg-gray-100 text-gray-600' },
  error:    { label: 'Error',    cls: 'bg-red-100 text-red-700' },
  testing:  { label: 'Testing',  cls: 'bg-yellow-100 text-yellow-700' },
};

const emptyAWS = (): AWSConfig => ({
  accessKeyId: '', secretAccessKey: '', region: 'us-east-1', roleArn: '',
  enableCloudTrail: true, enableGuardDuty: false, guardDutyDetectorId: '',
  enableSecurityHub: false, enableCloudWatch: false, cloudWatchLogGroups: [],
});

const emptyAzure = (): AzureConfig => ({
  tenantId: '', clientId: '', clientSecret: '', subscriptionId: '',
  enableDefender: true, enableActivityLogs: true, enableSentinel: false,
  sentinelWorkspaceId: '', sentinelWorkspaceName: '',
});

const emptyGCP = (): GCPConfig => ({
  projectId: '', serviceAccountKey: '', organizationId: '',
  enableSCC: true, enableCloudLogging: true, enableAssetInventory: false,
});

const emptyRules = (): ForwardingRules => ({
  severities: ['CRITICAL', 'HIGH', 'MEDIUM'],
  categories: [],
  pollIntervalMinutes: 15,
  enabled: true,
});

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

export default function CloudSecurityManager({ toast }: { toast: any }) {
  const [configs, setConfigs] = useState<CloudConfig[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CloudConfig | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Record<string, string>>({});

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formProvider, setFormProvider] = useState<'aws' | 'azure' | 'gcp'>('aws');
  const [formEnabled, setFormEnabled] = useState(true);
  const [formAWS, setFormAWS] = useState<AWSConfig>(emptyAWS());
  const [formAzure, setFormAzure] = useState<AzureConfig>(emptyAzure());
  const [formGCP, setFormGCP] = useState<GCPConfig>(emptyGCP());
  const [formRules, setFormRules] = useState<ForwardingRules>(emptyRules());
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [cfgRes, statRes] = await Promise.all([
        fetch('/api/cloud-security'),
        fetch('/api/cloud-security/stats'),
      ]);
      const cfgJson = await cfgRes.json();
      const statJson = await statRes.json();
      if (cfgJson.success) setConfigs(cfgJson.configs);
      if (statJson.success) setStats(statJson.stats);
    } catch {
      toast.error('Failed to load cloud security data');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openCreate() {
    setEditingConfig(null);
    setFormName('');
    setFormDescription('');
    setFormProvider('aws');
    setFormEnabled(true);
    setFormAWS(emptyAWS());
    setFormAzure(emptyAzure());
    setFormGCP(emptyGCP());
    setFormRules(emptyRules());
    setShowModal(true);
  }

  function openEdit(cfg: CloudConfig) {
    setEditingConfig(cfg);
    setFormName(cfg.name);
    setFormDescription(cfg.description ?? '');
    setFormProvider(cfg.provider);
    setFormEnabled(cfg.enabled);
    setFormAWS(cfg.awsConfig ? { ...emptyAWS(), ...cfg.awsConfig } : emptyAWS());
    setFormAzure(cfg.azureConfig ? { ...emptyAzure(), ...cfg.azureConfig } : emptyAzure());
    setFormGCP(cfg.gcpConfig ? { ...emptyGCP(), ...cfg.gcpConfig } : emptyGCP());
    setFormRules({ ...emptyRules(), ...cfg.forwardingRules });
    setShowModal(true);
  }

  async function handleSave() {
    if (!formName.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const payload: any = {
        name: formName.trim(),
        description: formDescription.trim(),
        provider: formProvider,
        enabled: formEnabled,
        forwardingRules: formRules,
      };
      if (formProvider === 'aws')   payload.awsConfig   = formAWS;
      if (formProvider === 'azure') payload.azureConfig = formAzure;
      if (formProvider === 'gcp')   payload.gcpConfig   = formGCP;

      const url = editingConfig ? `/api/cloud-security/${editingConfig._id}` : '/api/cloud-security';
      const method = editingConfig ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      toast.success(editingConfig ? 'Integration updated' : 'Integration created');
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this cloud integration?')) return;
    setBusyIds(b => ({ ...b, [id]: 'deleting' }));
    try {
      const res = await fetch(`/api/cloud-security/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Integration deleted');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusyIds(b => { const n = { ...b }; delete n[id]; return n; });
    }
  }

  async function handleTest(id: string) {
    setBusyIds(b => ({ ...b, [id]: 'testing' }));
    try {
      const res = await fetch(`/api/cloud-security/${id}/test`, { method: 'POST' });
      const json = await res.json();
      if (json.success) toast.success('Connection test passed');
      else toast.error(`Test failed: ${json.result?.message || json.error}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusyIds(b => { const n = { ...b }; delete n[id]; return n; });
    }
  }

  async function handleSync(id: string) {
    setBusyIds(b => ({ ...b, [id]: 'syncing' }));
    try {
      const res = await fetch(`/api/cloud-security/${id}/sync`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Sync complete — ${json.findingsCount} finding(s) ingested`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusyIds(b => { const n = { ...b }; delete n[id]; return n; });
    }
  }

  function toggleSeverity(sev: string) {
    setFormRules(r => ({
      ...r,
      severities: r.severities.includes(sev) ? r.severities.filter(s => s !== sev) : [...r.severities, sev],
    }));
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Cloud Security Integrations</h2>
          <p className="text-sm text-gray-500 mt-0.5">Connect AWS, Azure and GCP for centralized threat detection and monitoring.</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + Add Integration
        </button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total },
            { label: 'Active', value: stats.active },
            { label: 'Errors', value: stats.error },
            { label: 'Findings', value: stats.totalFindings.toLocaleString() },
            { label: 'Events', value: stats.totalEventsIngested.toLocaleString() },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
              <div className="text-xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Provider quick stats */}
      {stats && (
        <div className="flex gap-3 mb-6 flex-wrap">
          {(['aws', 'azure', 'gcp'] as const).map(p => (
            <div key={p} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${PROVIDER_META[p].badge}`}>
              <span className={`w-2 h-2 rounded-full ${PROVIDER_META[p].dot}`} />
              {PROVIDER_META[p].label}: {stats.byProvider[p]}
            </div>
          ))}
        </div>
      )}

      {/* Config list */}
      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading integrations…</div>
      ) : configs.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-lg mb-1">No cloud integrations yet</p>
          <p className="text-sm">Add your first AWS, Azure, or GCP integration to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map(cfg => {
            const pm = PROVIDER_META[cfg.provider];
            const sm = STATUS_META[cfg.status] ?? STATUS_META.inactive;
            const busy = busyIds[cfg._id];
            const expanded = expandedId === cfg._id;
            return (
              <div key={cfg._id} className={`border rounded-lg overflow-hidden ${pm.border}`}>
                {/* Row */}
                <div className={`flex items-center gap-3 p-4 ${pm.bg}`}>
                  <button
                    onClick={() => setExpandedId(expanded ? null : cfg._id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                    aria-label="expand"
                  >
                    <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 truncate">{cfg.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pm.badge}`}>{pm.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sm.cls}`}>{sm.label}</span>
                      {!cfg.enabled && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Disabled</span>
                      )}
                    </div>
                    {cfg.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{cfg.description}</p>}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{cfg.findingsCount.toLocaleString()} findings</span>
                      <span>{cfg.eventsIngested.toLocaleString()} events</span>
                      {cfg.lastSyncAt && <span>Last sync: {new Date(cfg.lastSyncAt).toLocaleString()}</span>}
                    </div>
                    {cfg.lastError && (
                      <p className="text-xs text-red-500 mt-0.5 truncate">Error: {cfg.lastError}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleTest(cfg._id)}
                      disabled={!!busy}
                      className="px-3 py-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50 transition-colors"
                    >
                      {busy === 'testing' ? 'Testing…' : 'Test'}
                    </button>
                    <button
                      onClick={() => handleSync(cfg._id)}
                      disabled={!!busy || !cfg.enabled}
                      className="px-3 py-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100 disabled:opacity-50 transition-colors"
                    >
                      {busy === 'syncing' ? 'Syncing…' : 'Sync'}
                    </button>
                    <button
                      onClick={() => openEdit(cfg)}
                      className="px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cfg._id)}
                      disabled={!!busy}
                      className="px-3 py-1.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      {busy === 'deleting' ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded && (
                  <div className="p-4 bg-white border-t border-gray-100 text-sm">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {/* AWS details */}
                      {cfg.provider === 'aws' && cfg.awsConfig && (
                        <>
                          <Detail label="Region" value={cfg.awsConfig.region} />
                          <Detail label="Access Key ID" value={cfg.awsConfig.accessKeyId} />
                          {cfg.awsConfig.roleArn && <Detail label="Role ARN" value={cfg.awsConfig.roleArn} />}
                          <Detail label="CloudTrail" value={cfg.awsConfig.enableCloudTrail ? 'Enabled' : 'Disabled'} />
                          <Detail label="GuardDuty" value={cfg.awsConfig.enableGuardDuty ? 'Enabled' : 'Disabled'} />
                          <Detail label="Security Hub" value={cfg.awsConfig.enableSecurityHub ? 'Enabled' : 'Disabled'} />
                          <Detail label="CloudWatch" value={cfg.awsConfig.enableCloudWatch ? 'Enabled' : 'Disabled'} />
                        </>
                      )}
                      {/* Azure details */}
                      {cfg.provider === 'azure' && cfg.azureConfig && (
                        <>
                          <Detail label="Tenant ID" value={cfg.azureConfig.tenantId} />
                          <Detail label="Subscription" value={cfg.azureConfig.subscriptionId} />
                          <Detail label="Defender" value={cfg.azureConfig.enableDefender ? 'Enabled' : 'Disabled'} />
                          <Detail label="Activity Logs" value={cfg.azureConfig.enableActivityLogs ? 'Enabled' : 'Disabled'} />
                          <Detail label="Sentinel" value={cfg.azureConfig.enableSentinel ? 'Enabled' : 'Disabled'} />
                        </>
                      )}
                      {/* GCP details */}
                      {cfg.provider === 'gcp' && cfg.gcpConfig && (
                        <>
                          <Detail label="Project ID" value={cfg.gcpConfig.projectId} />
                          {cfg.gcpConfig.organizationId && <Detail label="Organization" value={cfg.gcpConfig.organizationId} />}
                          <Detail label="SCC" value={cfg.gcpConfig.enableSCC ? 'Enabled' : 'Disabled'} />
                          <Detail label="Cloud Logging" value={cfg.gcpConfig.enableCloudLogging ? 'Enabled' : 'Disabled'} />
                          <Detail label="Asset Inventory" value={cfg.gcpConfig.enableAssetInventory ? 'Enabled' : 'Disabled'} />
                        </>
                      )}
                      {/* Forwarding rules */}
                      <Detail label="Poll Interval" value={`${cfg.forwardingRules.pollIntervalMinutes} min`} />
                      <Detail label="Severity Filter" value={cfg.forwardingRules.severities.join(', ') || 'None'} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-semibold">{editingConfig ? 'Edit Integration' : 'Add Cloud Integration'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-5 space-y-5">
              {/* Name / description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input value={formName} onChange={e => setFormName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Production AWS" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input value={formDescription} onChange={e => setFormDescription(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional description" />
                </div>
              </div>

              {/* Provider selector (only on create) */}
              {!editingConfig && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cloud Provider *</label>
                  <div className="flex gap-3">
                    {(['aws', 'azure', 'gcp'] as const).map(p => (
                      <button key={p}
                        onClick={() => setFormProvider(p)}
                        className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${formProvider === p ? `${PROVIDER_META[p].border} ${PROVIDER_META[p].bg} ${PROVIDER_META[p].color}` : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                      >
                        {PROVIDER_META[p].label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* AWS config */}
              {formProvider === 'aws' && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800 text-sm">AWS Configuration</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Access Key ID" value={formAWS.accessKeyId} onChange={v => setFormAWS(a => ({ ...a, accessKeyId: v }))} />
                    <Field label="Secret Access Key" type="password" value={formAWS.secretAccessKey ?? ''} onChange={v => setFormAWS(a => ({ ...a, secretAccessKey: v }))} placeholder={editingConfig ? '(unchanged)' : ''} />
                    <Field label="Region" value={formAWS.region} onChange={v => setFormAWS(a => ({ ...a, region: v }))} placeholder="us-east-1" />
                    <Field label="Role ARN (optional)" value={formAWS.roleArn ?? ''} onChange={v => setFormAWS(a => ({ ...a, roleArn: v }))} placeholder="arn:aws:iam::123456789:role/…" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <Toggle checked={formAWS.enableCloudTrail} onChange={v => setFormAWS(a => ({ ...a, enableCloudTrail: v }))} label="CloudTrail" />
                    <Toggle checked={formAWS.enableGuardDuty} onChange={v => setFormAWS(a => ({ ...a, enableGuardDuty: v }))} label="GuardDuty" />
                    <Toggle checked={formAWS.enableSecurityHub} onChange={v => setFormAWS(a => ({ ...a, enableSecurityHub: v }))} label="Security Hub" />
                    <Toggle checked={formAWS.enableCloudWatch} onChange={v => setFormAWS(a => ({ ...a, enableCloudWatch: v }))} label="CloudWatch Logs" />
                  </div>
                  {formAWS.enableGuardDuty && (
                    <Field label="GuardDuty Detector ID" value={formAWS.guardDutyDetectorId ?? ''} onChange={v => setFormAWS(a => ({ ...a, guardDutyDetectorId: v }))} />
                  )}
                </div>
              )}

              {/* Azure config */}
              {formProvider === 'azure' && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800 text-sm">Azure Configuration</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Tenant ID" value={formAzure.tenantId} onChange={v => setFormAzure(a => ({ ...a, tenantId: v }))} />
                    <Field label="Client ID" value={formAzure.clientId} onChange={v => setFormAzure(a => ({ ...a, clientId: v }))} />
                    <Field label="Client Secret" type="password" value={formAzure.clientSecret ?? ''} onChange={v => setFormAzure(a => ({ ...a, clientSecret: v }))} placeholder={editingConfig ? '(unchanged)' : ''} />
                    <Field label="Subscription ID" value={formAzure.subscriptionId} onChange={v => setFormAzure(a => ({ ...a, subscriptionId: v }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <Toggle checked={formAzure.enableDefender} onChange={v => setFormAzure(a => ({ ...a, enableDefender: v }))} label="Defender for Cloud" />
                    <Toggle checked={formAzure.enableActivityLogs} onChange={v => setFormAzure(a => ({ ...a, enableActivityLogs: v }))} label="Activity Logs" />
                    <Toggle checked={formAzure.enableSentinel} onChange={v => setFormAzure(a => ({ ...a, enableSentinel: v }))} label="Sentinel" />
                  </div>
                  {formAzure.enableSentinel && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Sentinel Workspace ID" value={formAzure.sentinelWorkspaceId ?? ''} onChange={v => setFormAzure(a => ({ ...a, sentinelWorkspaceId: v }))} />
                      <Field label="Sentinel Workspace Name" value={formAzure.sentinelWorkspaceName ?? ''} onChange={v => setFormAzure(a => ({ ...a, sentinelWorkspaceName: v }))} />
                    </div>
                  )}
                </div>
              )}

              {/* GCP config */}
              {formProvider === 'gcp' && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800 text-sm">GCP Configuration</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Project ID" value={formGCP.projectId} onChange={v => setFormGCP(a => ({ ...a, projectId: v }))} />
                    <Field label="Organization ID (optional)" value={formGCP.organizationId ?? ''} onChange={v => setFormGCP(a => ({ ...a, organizationId: v }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Account Key (JSON) {editingConfig && <span className="text-gray-400 font-normal">(leave blank to keep existing)</span>}
                    </label>
                    <textarea
                      rows={4}
                      value={formGCP.serviceAccountKey ?? ''}
                      onChange={e => setFormGCP(a => ({ ...a, serviceAccountKey: e.target.value }))}
                      placeholder='{"type":"service_account","project_id":"…"}'
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Toggle checked={formGCP.enableSCC} onChange={v => setFormGCP(a => ({ ...a, enableSCC: v }))} label="Security Command Center" />
                    <Toggle checked={formGCP.enableCloudLogging} onChange={v => setFormGCP(a => ({ ...a, enableCloudLogging: v }))} label="Cloud Logging" />
                    <Toggle checked={formGCP.enableAssetInventory} onChange={v => setFormGCP(a => ({ ...a, enableAssetInventory: v }))} label="Asset Inventory" />
                  </div>
                </div>
              )}

              {/* Forwarding rules */}
              <div className="space-y-3 border-t pt-4">
                <h4 className="font-medium text-gray-800 text-sm">Forwarding Rules</h4>
                <Toggle checked={formRules.enabled} onChange={v => setFormRules(r => ({ ...r, enabled: v }))} label="Enable forwarding" />
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Severity filter</label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_SEVERITIES.map(sev => {
                      const sel = formRules.severities.includes(sev);
                      return (
                        <button key={sev} onClick={() => toggleSeverity(sev)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${sel ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                          {sev}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-gray-600 whitespace-nowrap">Poll every</label>
                  <input type="number" min={1} max={1440} value={formRules.pollIntervalMinutes}
                    onChange={e => setFormRules(r => ({ ...r, pollIntervalMinutes: Number(e.target.value) }))}
                    className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <span className="text-xs text-gray-500">minutes</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Toggle checked={formEnabled} onChange={setFormEnabled} label="Enable integration" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t bg-gray-50">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors font-medium">
                {saving ? 'Saving…' : editingConfig ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-800 font-medium truncate">{value}</dd>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}
