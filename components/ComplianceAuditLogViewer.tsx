'use client';

import { useState, useEffect } from 'react';

interface AuditLog {
  _id: string;
  eventType: string;
  action: string;
  description: string;
  userId: {
    name: string;
    email: string;
  };
  frameworkId?: {
    name: string;
    code: string;
  };
  status: string;
  timestamp: string;
  complianceImpact: {
    affected: boolean;
    impactLevel?: string;
  };
}

export default function ComplianceAuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    eventType: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchAuditLogs();
  }, [filters]);

  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filters.eventType) params.append('eventType', filters.eventType);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/compliance/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setLogs(data.logs);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    const icons: any = {
      assessment: '📋',
      control_test: '🧪',
      requirement_update: '📝',
      evidence_upload: '📎',
      gap_identified: '⚠️',
      remediation: '🔧',
      report_generated: '📊',
      access: '🔐',
      data_modification: '✏️',
      policy_violation: '🚫',
      exception_granted: '✓',
      certification: '🏆',
    };
    return icons[eventType] || '📄';
  };

  const getImpactBadge = (impactLevel?: string) => {
    if (!impactLevel) return null;
    
    const colors: any = {
      critical: 'bg-red-100 text-red-700',
      high: 'bg-orange-100 text-orange-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-blue-100 text-blue-700',
    };
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[impactLevel]}`}>
        {impactLevel} impact
      </span>
    );
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      success: 'text-green-600',
      failure: 'text-red-600',
      partial: 'text-yellow-600',
      pending: 'text-blue-600',
    };
    return colors[status] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-4">
          <select
            value={filters.eventType}
            onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="">All Event Types</option>
            <option value="assessment">Assessment</option>
            <option value="control_test">Control Test</option>
            <option value="requirement_update">Requirement Update</option>
            <option value="evidence_upload">Evidence Upload</option>
            <option value="gap_identified">Gap Identified</option>
            <option value="remediation">Remediation</option>
            <option value="report_generated">Report Generated</option>
            <option value="access">Access</option>
            <option value="data_modification">Data Modification</option>
          </select>

          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="Start Date"
          />

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="End Date"
          />
        </div>
      </div>

      {/* Audit Logs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Audit Log</h2>
          <p className="text-sm text-gray-600 mt-1">
            {logs.length} events recorded
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {logs.map((log) => (
            <div key={log._id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="text-3xl flex-shrink-0">
                  {getEventIcon(log.eventType)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{log.action}</h3>
                        <span className={getStatusColor(log.status)}>
                          {log.status === 'success' ? '✓' : log.status === 'failure' ? '✗' : '○'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{log.description}</p>
                      
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-gray-500">
                          by {log.userId?.name || 'Unknown'} ({log.userId?.email || 'N/A'})
                        </span>
                        {log.frameworkId && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {log.frameworkId.code}
                          </span>
                        )}
                        {log.complianceImpact?.affected && getImpactBadge(log.complianceImpact.impactLevel)}
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm text-gray-900">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {logs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No audit logs found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
