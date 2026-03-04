'use client';

import { useState, useEffect } from 'react';

interface NetworkMonitorProps {
  toast: any;
}

interface Anomaly {
  _id: string;
  detectedAt: string;
  anomalyType: string;
  severity: string;
  sourceIp: string;
  destinationIp?: string;
  affectedPorts?: number[];
  packetCount?: number;
  bytesTransferred?: number;
  description: string;
  detectionMethod: string;
  confidence: number;
  status: string;
  mitigationActions?: string[];
  notes?: string;
}

interface NetworkSession {
  _id: string;
  sessionId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  isActive: boolean;
  captureInterface: string;
  captureFilter: string;
  packetsCapture: number;
  bytesCapture: number;
  anomaliesDetected: number;
  protocols?: { [key: string]: number };
}

interface TrafficStats {
  totalPackets: number;
  totalBytes: number;
  inboundPackets: number;
  outboundPackets: number;
  inboundBytes: number;
  outboundBytes: number;
  uniqueSourceIps: number;
  uniqueDestinationIps: number;
  protocolBreakdown?: { [key: string]: number };
}

export default function NetworkMonitor({ toast }: NetworkMonitorProps) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [sessions, setSessions] = useState<NetworkSession[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [currentSession, setCurrentSession] = useState<NetworkSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [showAnomalyDetails, setShowAnomalyDetails] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [captureFilter, setCaptureFilter] = useState('');
  const [captureInterface, setCaptureInterface] = useState('eth0');

  useEffect(() => {
    loadAnomalies();
    loadSessions();
  }, [filterSeverity, filterStatus]);

  const loadAnomalies = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ type: 'anomalies' });
      if (filterSeverity !== 'all') params.append('severity', filterSeverity);
      if (filterStatus !== 'all') params.append('status', filterStatus);

      const response = await fetch(`/api/network-monitor?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to load anomalies');

      const data = await response.json();
      setAnomalies(data.anomalies || []);
      setStats(data.stats || null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load anomalies');
    }
  };

  const loadSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/network-monitor?type=sessions', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to load sessions');

      const data = await response.json();
      setSessions(data.sessions || []);
      
      const active = data.sessions?.find((s: NetworkSession) => s.isActive);
      setCurrentSession(active || null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load sessions');
    }
  };

  const startCapture = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/network-monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'start_session',
          interface: captureInterface,
          filter: captureFilter,
        }),
      });

      if (!response.ok) throw new Error('Failed to start capture');

      const data = await response.json();
      setCurrentSession(data.session);
      toast.success('Network capture started');
      loadSessions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to start capture');
    } finally {
      setLoading(false);
    }
  };

  const stopCapture = async () => {
    if (!currentSession) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/network-monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'stop_session',
          sessionId: currentSession.sessionId,
        }),
      });

      if (!response.ok) throw new Error('Failed to stop capture');

      setCurrentSession(null);
      toast.success('Network capture stopped');
      loadSessions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to stop capture');
    } finally {
      setLoading(false);
    }
  };

  const capturePackets = async () => {
    if (!currentSession) {
      toast.error('No active session. Please start capture first.');
      return;
    }

    try {
      setCapturing(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/network-monitor/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: currentSession.sessionId,
          duration: 10,
        }),
      });

      if (!response.ok) throw new Error('Failed to capture packets');

      const data = await response.json();
      toast.success(`Captured ${data.capture.packetsCaptured} packets`);
      loadSessions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to capture packets');
    } finally {
      setCapturing(false);
    }
  };

  const analyzeTraffic = async () => {
    if (!currentSession) {
      toast.error('No active session. Please start capture first.');
      return;
    }

    try {
      setAnalyzing(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/network-monitor/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: currentSession.sessionId,
        }),
      });

      if (!response.ok) throw new Error('Failed to analyze traffic');

      const data = await response.json();
      toast.success(`Analysis complete: ${data.analysis.anomaliesDetected} anomalies detected`);
      loadAnomalies();
      loadSessions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to analyze traffic');
    } finally {
      setAnalyzing(false);
    }
  };

  const updateAnomalyStatus = async (anomalyId: string, status: string, notes?: string) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/network-monitor', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ anomalyId, status, notes }),
      });

      if (!response.ok) throw new Error('Failed to update anomaly');

      toast.success('Anomaly status updated');
      loadAnomalies();
      setShowAnomalyDetails(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update anomaly');
    }
  };

  const deleteAnomaly = async (anomalyId: string) => {
    if (!confirm('Are you sure you want to delete this anomaly?')) return;

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/network-monitor?anomalyId=${anomalyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete anomaly');

      toast.success('Anomaly deleted');
      loadAnomalies();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete anomaly');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-600 bg-red-50';
      case 'investigating': return 'text-yellow-600 bg-yellow-50';
      case 'resolved': return 'text-green-600 bg-green-50';
      case 'false_positive': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getAnomalyTypeIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      port_scan: '🔍',
      data_exfiltration: '📤',
      ddos_attack: '🌊',
      unusual_traffic_volume: '📊',
      suspicious_protocol: '⚠️',
      malicious_payload: '💀',
      brute_force: '🔨',
      dns_tunneling: '🕳️',
      lateral_movement: '↔️',
      command_and_control: '🎮',
    };
    return icons[type] || '🚨';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const filteredAnomalies = anomalies.filter(anomaly => {
    if (filterType !== 'all' && anomaly.anomalyType !== filterType) return false;
    return true;
  });

  const anomalyTypes = Array.from(new Set(anomalies.map(a => a.anomalyType)));

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Anomalies</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats?.total || 0}</h3>
            </div>
            <div className="text-4xl">🚨</div>
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
              <p className="text-sm text-gray-600">Active Sessions</p>
              <h3 className="text-3xl font-bold text-blue-600 mt-1">
                {sessions.filter(s => s.isActive).length}
              </h3>
            </div>
            <div className="text-4xl">📡</div>
          </div>
        </div>
      </div>

      {/* Packet Capture Control */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span>📡</span>
              Network Packet Capture & Analysis
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              Real-time packet inspection with protocol-level analysis and ML-based anomaly detection. 
              Monitors for port scanning, data exfiltration, DNS tunneling, and suspicious traffic patterns.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capture Interface
                </label>
                <select
                  value={captureInterface}
                  onChange={(e) => setCaptureInterface(e.target.value)}
                  disabled={!!currentSession}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="eth0">eth0 (Ethernet)</option>
                  <option value="wlan0">wlan0 (WiFi)</option>
                  <option value="lo">lo (Loopback)</option>
                  <option value="any">any (All Interfaces)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  BPF Filter (Optional)
                </label>
                <input
                  type="text"
                  value={captureFilter}
                  onChange={(e) => setCaptureFilter(e.target.value)}
                  disabled={!!currentSession}
                  placeholder="e.g., tcp port 80"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>
            </div>

            {currentSession && (
              <div className="bg-white border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  <span className="text-sm font-semibold text-gray-900">Active Capture Session</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Packets</p>
                    <p className="font-bold text-gray-900">{currentSession.packetsCapture.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Data</p>
                    <p className="font-bold text-gray-900">{formatBytes(currentSession.bytesCapture)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Anomalies</p>
                    <p className="font-bold text-red-600">{currentSession.anomaliesDetected}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Duration</p>
                    <p className="font-bold text-gray-900">
                      {Math.floor((Date.now() - new Date(currentSession.startTime).getTime()) / 1000)}s
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {!currentSession ? (
                <button
                  onClick={startCapture}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center gap-2"
                >
                  <span>▶️</span>
                  {loading ? 'Starting...' : 'Start Capture'}
                </button>
              ) : (
                <>
                  <button
                    onClick={capturePackets}
                    disabled={capturing}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center gap-2"
                  >
                    <span>📦</span>
                    {capturing ? 'Capturing...' : 'Capture Packets'}
                  </button>
                  <button
                    onClick={analyzeTraffic}
                    disabled={analyzing}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium flex items-center gap-2"
                  >
                    <span>🔬</span>
                    {analyzing ? 'Analyzing...' : 'Analyze Traffic'}
                  </button>
                  <button
                    onClick={stopCapture}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium flex items-center gap-2"
                  >
                    <span>⏹️</span>
                    {loading ? 'Stopping...' : 'Stop Capture'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-4">
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
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="false_positive">False Positive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Anomaly Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Types</option>
              {anomalyTypes.map(type => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Anomalies List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Detected Network Anomalies</h3>
          <p className="text-sm text-gray-600 mt-1">
            Showing {filteredAnomalies.length} anomalies
          </p>
        </div>

        {filteredAnomalies.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Anomalies Detected</h3>
            <p className="text-gray-600">Network traffic appears normal. Start a capture session to monitor for threats.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredAnomalies.map((anomaly) => (
              <div
                key={anomaly._id}
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedAnomaly(anomaly);
                  setShowAnomalyDetails(true);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getAnomalyTypeIcon(anomaly.anomalyType)}</span>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {anomaly.anomalyType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h4>
                        <p className="text-sm text-gray-600">{anomaly.description}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm mt-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(anomaly.severity)}`}>
                        {anomaly.severity.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(anomaly.status)}`}>
                        {anomaly.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className="text-gray-600">
                        <strong>Source IP:</strong> {anomaly.sourceIp}
                      </span>
                      {anomaly.destinationIp && (
                        <span className="text-gray-600">
                          <strong>Dest IP:</strong> {anomaly.destinationIp}
                        </span>
                      )}
                      <span className="text-gray-600">
                        <strong>Confidence:</strong> {anomaly.confidence}%
                      </span>
                      <span className="text-gray-400 text-xs">
                        {new Date(anomaly.detectedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAnomaly(anomaly._id);
                    }}
                    className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Anomaly Details Modal */}
      {showAnomalyDetails && selectedAnomaly && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <span>{getAnomalyTypeIcon(selectedAnomaly.anomalyType)}</span>
                  {selectedAnomaly.anomalyType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Detected {new Date(selectedAnomaly.detectedAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setShowAnomalyDetails(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                <p className="text-gray-900">{selectedAnomaly.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Severity</h3>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getSeverityColor(selectedAnomaly.severity)}`}>
                    {selectedAnomaly.severity.toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Status</h3>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedAnomaly.status)}`}>
                    {selectedAnomaly.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Source IP</h3>
                  <p className="text-gray-900 font-mono">{selectedAnomaly.sourceIp}</p>
                </div>
                {selectedAnomaly.destinationIp && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Destination IP</h3>
                    <p className="text-gray-900 font-mono">{selectedAnomaly.destinationIp}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Detection Method</h3>
                  <p className="text-gray-900">{selectedAnomaly.detectionMethod}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Confidence</h3>
                  <p className="text-gray-900 font-bold">{selectedAnomaly.confidence}%</p>
                </div>
                {selectedAnomaly.packetCount && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Packets</h3>
                    <p className="text-gray-900">{selectedAnomaly.packetCount}</p>
                  </div>
                )}
              </div>

              {selectedAnomaly.affectedPorts && selectedAnomaly.affectedPorts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Affected Ports</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedAnomaly.affectedPorts.slice(0, 20).map(port => (
                      <span key={port} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm font-mono">
                        {port}
                      </span>
                    ))}
                    {selectedAnomaly.affectedPorts.length > 20 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                        +{selectedAnomaly.affectedPorts.length - 20} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {selectedAnomaly.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded">{selectedAnomaly.notes}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                {selectedAnomaly.status === 'active' && (
                  <>
                    <button
                      onClick={() => updateAnomalyStatus(selectedAnomaly._id, 'investigating')}
                      className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium"
                    >
                      Mark as Investigating
                    </button>
                    <button
                      onClick={() => updateAnomalyStatus(selectedAnomaly._id, 'resolved')}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                      Resolve
                    </button>
                  </>
                )}
                {selectedAnomaly.status === 'investigating' && (
                  <button
                    onClick={() => updateAnomalyStatus(selectedAnomaly._id, 'resolved')}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    Mark as Resolved
                  </button>
                )}
                <button
                  onClick={() => updateAnomalyStatus(selectedAnomaly._id, 'false_positive')}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                >
                  False Positive
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
