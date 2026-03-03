'use client';

import { useState, useEffect } from 'react';

interface IncidentResponse {
  _id: string;
  incidentId: string;
  incidentType: string;
  severity: string;
  playbookName: string;
  status: string;
  triggeredBy: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  ipsBlocked: number;
  systemsQuarantined: number;
  notificationsSent: number;
  ticketsCreated: number;
  actions: any[];
  createdAt: string;
}

interface ResponseHistoryProps {
  toast: any;
}

export default function ResponseHistory({ toast }: ResponseHistoryProps) {
  const [responses, setResponses] = useState<IncidentResponse[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedResponse, setSelectedResponse] = useState<IncidentResponse | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchResponses();
  }, [statusFilter]);

  const fetchResponses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url = '/api/incident-response/history?';
      if (statusFilter !== 'all') url += `status=${statusFilter}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch response history');

      const data = await response.json();
      setResponses(data.responses || []);
      setStats(data.stats);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      completed: 'bg-green-100 text-green-700 border-green-200',
      running: 'bg-blue-100 text-blue-700 border-blue-200',
      failed: 'bg-red-100 text-red-700 border-red-200',
      awaiting_approval: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      cancelled: 'bg-gray-100 text-gray-700 border-gray-200',
      pending: 'bg-purple-100 text-purple-700 border-purple-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getSeverityColor = (severity: string) => {
    const colors: any = {
      critical: 'text-red-600',
      high: 'text-orange-600',
      medium: 'text-yellow-600',
      low: 'text-blue-600',
    };
    return colors[severity] || 'text-gray-600';
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Responses</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Completed</p>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">IPs Blocked</p>
            <p className="text-2xl font-bold text-blue-600">{stats.totalIPsBlocked}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Running/Pending</p>
            <p className="text-2xl font-bold text-purple-600">
              {stats.running + stats.awaitingApproval}
            </p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Filter by status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="running">Running</option>
            <option value="failed">Failed</option>
            <option value="awaiting_approval">Awaiting Approval</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <div className="ml-auto text-sm text-gray-600">
            <span className="font-medium">{responses.length}</span> responses found
          </div>
        </div>
      </div>

      {/* Response List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-3">Loading response history...</p>
            </div>
          ) : responses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No responses found</h3>
              <p className="text-gray-600">Incident responses will appear here once playbooks are executed</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Incident</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Playbook</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Actions Taken</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {responses.map((response) => (
                  <tr key={response._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{response.incidentType}</p>
                        <p className="text-xs text-gray-500">{response.incidentId}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{response.playbookName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(response.status)}`}>
                        {response.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${getSeverityColor(response.severity)}`}>
                        {response.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{formatDuration(response.duration)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        {response.ipsBlocked > 0 && (
                          <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded">
                            🚫 {response.ipsBlocked} IPs
                          </span>
                        )}
                        {response.systemsQuarantined > 0 && (
                          <span className="px-2 py-0.5 bg-yellow-50 text-yellow-600 rounded">
                            🔒 {response.systemsQuarantined} Systems
                          </span>
                        )}
                        {response.notificationsSent > 0 && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                            📧 {response.notificationsSent} Alerts
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-gray-500">{formatDate(response.createdAt)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedResponse(response);
                          setShowDetailsModal(true);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedResponse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Response Details</h2>
                <p className="text-sm text-gray-600 mt-1">{selectedResponse.incidentId}</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Playbook</p>
                  <p className="font-semibold text-gray-900">{selectedResponse.playbookName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Triggered By</p>
                  <p className="font-semibold text-gray-900">{selectedResponse.triggeredBy}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(selectedResponse.status)}`}>
                    {selectedResponse.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Duration</p>
                  <p className="font-semibold text-gray-900">{formatDuration(selectedResponse.duration)}</p>
                </div>
              </div>

              {/* Impact Summary */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Impact Summary</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs text-red-600 mb-1">IPs Blocked</p>
                    <p className="text-2xl font-bold text-red-600">{selectedResponse.ipsBlocked}</p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-xs text-yellow-600 mb-1">Systems Quarantined</p>
                    <p className="text-2xl font-bold text-yellow-600">{selectedResponse.systemsQuarantined}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-600 mb-1">Notifications Sent</p>
                    <p className="text-2xl font-bold text-blue-600">{selectedResponse.notificationsSent}</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-xs text-purple-600 mb-1">Tickets Created</p>
                    <p className="text-2xl font-bold text-purple-600">{selectedResponse.ticketsCreated}</p>
                  </div>
                </div>
              </div>

              {/* Action Steps */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Action Steps ({selectedResponse.actions.length})</h3>
                <div className="space-y-2">
                  {selectedResponse.actions.map((action: any, index: number) => (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        action.status === 'success' ? 'bg-green-50 border-green-200' :
                        action.status === 'failed' ? 'bg-red-50 border-red-200' :
                        action.status === 'running' ? 'bg-blue-50 border-blue-200' :
                        'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        action.status === 'success' ? 'bg-green-500 text-white' :
                        action.status === 'failed' ? 'bg-red-500 text-white' :
                        action.status === 'running' ? 'bg-blue-500 text-white' :
                        'bg-gray-500 text-white'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900">{action.stepName}</p>
                          <span className="text-xs text-gray-500">
                            {action.duration ? formatDuration(action.duration) : 'N/A'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{action.stepType}</p>
                        {action.error && (
                          <p className="text-xs text-red-600 mt-2">Error: {action.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
