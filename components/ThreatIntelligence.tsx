'use client';

import { useState, useEffect } from 'react';

interface ThreatIntelligenceProps {
  toast: any;
}

interface IOC {
  _id: string;
  userId: string;
  ioc: {
    value: string;
    type: string;
    firstSeen: string;
    lastSeen: string;
    occurrences: number;
    severity: string;
    confidence: number;
    tags: string[];
    sources: string[];
    status: string;
  };
  enrichments?: {
    virusTotal?: any;
    abuseIPDB?: any;
    mitre?: any[];
  };
  riskScore: number;
  threatCategory: string;
  actionTaken: string;
  notes: string;
  enrichedAt?: string;
  createdAt: string;
}

export default function ThreatIntelligence({ toast }: ThreatIntelligenceProps) {
  const [iocs, setIocs] = useState<IOC[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [selectedIOC, setSelectedIOC] = useState<IOC | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Add IOC form state
  const [newIOC, setNewIOC] = useState({
    value: '',
    type: 'ip',
    severity: 'medium',
    tags: '',
    notes: '',
  });

  useEffect(() => {
    loadIOCs();
  }, [filterType, filterSeverity, filterStatus]);

  const loadIOCs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ type: 'iocs' });
      if (filterType !== 'all') params.append('iocType', filterType);
      if (filterSeverity !== 'all') params.append('severity', filterSeverity);
      if (filterStatus !== 'all') params.append('status', filterStatus);

      const response = await fetch(`/api/threat-intel?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to load IOCs');

      const data = await response.json();
      setIocs(data.iocs || []);
      setStats(data.stats || null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load IOCs');
    } finally {
      setLoading(false);
    }
  };

  const addIOC = async () => {
    if (!newIOC.value.trim()) {
      toast.error('Please enter an IOC value');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/threat-intel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'add_ioc',
          value: newIOC.value.trim(),
          type: newIOC.type,
          severity: newIOC.severity,
          tags: newIOC.tags.split(',').map(t => t.trim()).filter(Boolean),
          notes: newIOC.notes,
        }),
      });

      if (!response.ok) throw new Error('Failed to add IOC');

      const data = await response.json();
      toast.success(data.message || 'IOC added successfully');
      setShowAddModal(false);
      setNewIOC({ value: '', type: 'ip', severity: 'medium', tags: '', notes: '' });
      loadIOCs();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add IOC');
    }
  };

  const enrichIOC = async (iocId: string) => {
    try {
      setEnriching(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/threat-intel/enrich', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ iocId }),
      });

      if (!response.ok) throw new Error('Failed to enrich IOC');

      const data = await response.json();
      toast.success('IOC enriched successfully');
      loadIOCs();
      
      // Update selected IOC if it's the one being enriched
      if (selectedIOC && selectedIOC._id === iocId) {
        setSelectedIOC(data.ioc);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to enrich IOC');
    } finally {
      setEnriching(false);
    }
  };

  const updateIOC = async (iocId: string, updates: any) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/threat-intel', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ iocId, ...updates }),
      });

      if (!response.ok) throw new Error('Failed to update IOC');

      toast.success('IOC updated successfully');
      loadIOCs();
      setShowDetailsModal(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update IOC');
    }
  };

  const deleteIOC = async (iocId: string) => {
    if (!confirm('Are you sure you want to delete this IOC?')) return;

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/threat-intel?iocId=${iocId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete IOC');

      toast.success('IOC deleted successfully');
      loadIOCs();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete IOC');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      ip: '🌐',
      domain: '🔗',
      url: '📎',
      hash: '#️⃣',
      email: '📧',
      file: '📄',
    };
    return icons[type] || '🔍';
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 60) return 'text-orange-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  const filteredIOCs = iocs;

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total IOCs</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats?.total || 0}</h3>
            </div>
            <div className="text-4xl">🎯</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Threats</p>
              <h3 className="text-3xl font-bold text-red-600 mt-1">{stats?.active || 0}</h3>
            </div>
            <div className="text-4xl">⚠️</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical Severity</p>
              <h3 className="text-3xl font-bold text-red-600 mt-1">{stats?.critical || 0}</h3>
            </div>
            <div className="text-4xl">🔥</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Enriched IOCs</p>
              <h3 className="text-3xl font-bold text-blue-600 mt-1">{stats?.enriched || 0}</h3>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </div>
      </div>

      {/* Threat Intelligence Sources */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span>🧠</span>
              External Threat Intelligence Integration
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              Automatically enrich IOCs with data from leading threat intelligence sources: MITRE ATT&CK framework for 
              tactical analysis, VirusTotal for malware detection, and AbuseIPDB for IP reputation scoring.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-indigo-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🎯</span>
                  <h4 className="font-semibold text-gray-900">MITRE ATT&CK</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Maps threats to tactics, techniques, and procedures (TTPs) for comprehensive threat analysis
                </p>
                <div className="mt-2 text-xs text-green-600 font-medium">✓ Integrated</div>
              </div>

              <div className="bg-white border border-indigo-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🦠</span>
                  <h4 className="font-semibold text-gray-900">VirusTotal</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Scans files and URLs against 70+ antivirus engines for malware detection and analysis
                </p>
                <div className="mt-2 text-xs text-green-600 font-medium">✓ Integrated</div>
              </div>

              <div className="bg-white border border-indigo-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🌐</span>
                  <h4 className="font-semibold text-gray-900">AbuseIPDB</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Checks IP addresses against abuse reports and provides reputation scores
                </p>
                <div className="mt-2 text-xs text-green-600 font-medium">✓ Integrated</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IOC Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="ip">IP Address</option>
                <option value="domain">Domain</option>
                <option value="url">URL</option>
                <option value="hash">File Hash</option>
                <option value="email">Email</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="whitelisted">Whitelisted</option>
                <option value="false_positive">False Positive</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
          >
            <span>➕</span>
            Add IOC
          </button>
        </div>
      </div>

      {/* IOCs List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Indicators of Compromise (IOCs)</h3>
          <p className="text-sm text-gray-600 mt-1">
            Showing {filteredIOCs.length} IOCs
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading IOCs...</p>
          </div>
        ) : filteredIOCs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No IOCs Found</h3>
            <p className="text-gray-600 mb-4">Add indicators of compromise to start threat intelligence analysis.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Add Your First IOC
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredIOCs.map((ioc) => (
              <div
                key={ioc._id}
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedIOC(ioc);
                  setShowDetailsModal(true);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getTypeIcon(ioc.ioc.type)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 font-mono">{ioc.ioc.value}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(ioc.ioc.severity)}`}>
                            {ioc.ioc.severity.toUpperCase()}
                          </span>
                          {ioc.enrichedAt && (
                            <span className="px-2 py-1 bg-green-50 text-green-600 rounded-full text-xs font-medium">
                              ✓ Enriched
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          Type: {ioc.ioc.type.toUpperCase()} • Category: {ioc.threatCategory} • 
                          Occurrences: {ioc.ioc.occurrences} • 
                          First seen: {new Date(ioc.ioc.firstSeen).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {ioc.riskScore > 0 && (
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Risk Score:</span>
                          <span className={`text-lg font-bold ${getRiskScoreColor(ioc.riskScore)}`}>
                            {ioc.riskScore}/100
                          </span>
                        </div>
                        {ioc.ioc.tags.length > 0 && (
                          <div className="flex items-center gap-2">
                            {ioc.ioc.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {!ioc.enrichedAt && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          enrichIOC(ioc._id);
                        }}
                        disabled={enriching}
                        className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
                      >
                        {enriching ? 'Enriching...' : '🧠 Enrich'}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteIOC(ioc._id);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add IOC Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Add Indicator of Compromise</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IOC Type</label>
                <select
                  value={newIOC.type}
                  onChange={(e) => setNewIOC({ ...newIOC, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="ip">IP Address</option>
                  <option value="domain">Domain</option>
                  <option value="url">URL</option>
                  <option value="hash">File Hash</option>
                  <option value="email">Email</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IOC Value</label>
                <input
                  type="text"
                  value={newIOC.value}
                  onChange={(e) => setNewIOC({ ...newIOC, value: e.target.value })}
                  placeholder="e.g., 192.168.1.100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={newIOC.severity}
                  onChange={(e) => setNewIOC({ ...newIOC, severity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={newIOC.tags}
                  onChange={(e) => setNewIOC({ ...newIOC, tags: e.target.value })}
                  placeholder="e.g., malware, botnet, c2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={newIOC.notes}
                  onChange={(e) => setNewIOC({ ...newIOC, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={addIOC}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Add IOC
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IOC Details Modal */}
      {showDetailsModal && selectedIOC && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <span>{getTypeIcon(selectedIOC.ioc.type)}</span>
                  IOC Details
                </h2>
                <p className="text-sm text-gray-600 mt-1 font-mono">{selectedIOC.ioc.value}</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Type</p>
                    <p className="font-medium text-gray-900">{selectedIOC.ioc.type.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Severity</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getSeverityColor(selectedIOC.ioc.severity)}`}>
                      {selectedIOC.ioc.severity.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-medium text-gray-900">{selectedIOC.ioc.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Threat Category</p>
                    <p className="font-medium text-gray-900">{selectedIOC.threatCategory}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Risk Score</p>
                    <p className={`text-2xl font-bold ${getRiskScoreColor(selectedIOC.riskScore)}`}>
                      {selectedIOC.riskScore}/100
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Occurrences</p>
                    <p className="font-medium text-gray-900">{selectedIOC.ioc.occurrences}</p>
                  </div>
                </div>
              </div>

              {/* VirusTotal Enrichment */}
              {selectedIOC.enrichments?.virusTotal && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span>🦠</span>
                    VirusTotal Analysis
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Detection Ratio</p>
                      <p className="text-xl font-bold text-red-600">
                        {selectedIOC.enrichments.virusTotal.detectionRatio}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">File Type</p>
                      <p className="font-medium text-gray-900">{selectedIOC.enrichments.virusTotal.fileType}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Vendor Detections</p>
                    <div className="space-y-1">
                      {selectedIOC.enrichments.virusTotal.vendors.map((vendor: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{vendor.name}</span>
                          <span className={vendor.detected ? 'text-red-600 font-medium' : 'text-green-600'}>
                            {vendor.detected ? `⚠️ ${vendor.result}` : '✓ Clean'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* AbuseIPDB Enrichment */}
              {selectedIOC.enrichments?.abuseIPDB && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span>🌐</span>
                    AbuseIPDB Reputation
                  </h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Abuse Score</p>
                      <p className="text-xl font-bold text-red-600">
                        {selectedIOC.enrichments.abuseIPDB.abuseConfidenceScore}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Reports</p>
                      <p className="font-medium text-gray-900">{selectedIOC.enrichments.abuseIPDB.totalReports}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Country</p>
                      <p className="font-medium text-gray-900">{selectedIOC.enrichments.abuseIPDB.countryName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">ISP</p>
                      <p className="font-medium text-gray-900">{selectedIOC.enrichments.abuseIPDB.isp}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Usage Type</p>
                      <p className="font-medium text-gray-900">{selectedIOC.enrichments.abuseIPDB.usageType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Whitelisted</p>
                      <p className="font-medium text-gray-900">
                        {selectedIOC.enrichments.abuseIPDB.isWhitelisted ? '✓ Yes' : '✗ No'}
                      </p>
                    </div>
                  </div>
                  {selectedIOC.enrichments.abuseIPDB.reports.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Recent Reports</p>
                      <div className="space-y-1">
                        {selectedIOC.enrichments.abuseIPDB.reports.map((report: any, idx: number) => (
                          <div key={idx} className="text-sm bg-white border border-blue-200 rounded p-2">
                            <p className="text-gray-700">{report.comment}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(report.reportedAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MITRE ATT&CK Enrichment */}
              {selectedIOC.enrichments?.mitre && selectedIOC.enrichments.mitre.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span>🎯</span>
                    MITRE ATT&CK Techniques
                  </h3>
                  <div className="space-y-3">
                    {selectedIOC.enrichments.mitre.map((technique: any, idx: number) => (
                      <div key={idx} className="bg-white border border-green-200 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {technique.techniqueId}: {technique.techniqueName}
                            </h4>
                            <p className="text-sm text-gray-600">Tactic: {technique.tactic}</p>
                          </div>
                          {technique.matched && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                              Matched
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{technique.description}</p>
                        {technique.mitigations && technique.mitigations.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-gray-700 mb-1">Mitigations:</p>
                            {technique.mitigations.map((mitigation: any, mIdx: number) => (
                              <p key={mIdx} className="text-xs text-gray-600">
                                • {mitigation.name}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                {!selectedIOC.enrichedAt && (
                  <button
                    onClick={() => enrichIOC(selectedIOC._id)}
                    disabled={enriching}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
                  >
                    {enriching ? 'Enriching...' : '🧠 Enrich with Threat Intel'}
                  </button>
                )}
                <button
                  onClick={() => updateIOC(selectedIOC._id, { status: 'whitelisted' })}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                >
                  Whitelist
                </button>
                <button
                  onClick={() => updateIOC(selectedIOC._id, { actionTaken: 'blocked' })}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Block
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
