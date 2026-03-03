'use client';

import React, { useState, useEffect } from 'react';

interface ActionLog {
  _id: string;
  executionId: string;
  actionType: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  result?: any;
  error?: string;
  attemptNumber: number;
  maxAttempts: number;
  triggerEvent?: {
    eventId: string;
    eventType: string;
    severity: string;
  };
}

interface ExecutionHistoryProps {
  toast: any;
}

export default function ExecutionHistory({ toast }: ExecutionHistoryProps) {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'success' | 'failure' | 'pending'>('all');

  useEffect(() => {
    loadLogs();
  }, [filter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const queryParams = filter !== 'all' ? `?status=${filter}` : '';
      const response = await fetch(`/api/automation/logs${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load execution logs');
      }

      const data = await response.json();
      setLogs(data.logs);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load execution history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-700';
      case 'failure': return 'bg-red-100 text-red-700';
      case 'running': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'awaiting_approval': return 'bg-purple-100 text-purple-700';
      case 'cancelled': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Execution History</h3>
          <p className="text-sm text-gray-600 mt-1">
            {logs.length} execution{logs.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('success')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              filter === 'success'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Success
          </button>
          <button
            onClick={() => setFilter('failure')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              filter === 'failure'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Failed
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              filter === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={loadLogs}
            className="ml-2 p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Started
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attempts
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No execution logs found
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <div className="font-medium text-gray-900">
                          {log.actionType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </div>
                        {log.triggerEvent && (
                          <div className="text-xs text-gray-500">
                            {log.triggerEvent.eventType}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(log.startedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDuration(log.duration)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {log.attemptNumber}/{log.maxAttempts}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {log.error ? (
                        <button
                          onClick={() => toast.error(log.error)}
                          className="text-red-600 hover:text-red-700 text-xs"
                        >
                          View Error
                        </button>
                      ) : log.result ? (
                        <button
                          onClick={() => toast.info(JSON.stringify(log.result, null, 2))}
                          className="text-blue-600 hover:text-blue-700 text-xs"
                        >
                          View Result
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">N/A</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">
            {logs.length}
          </div>
          <div className="text-sm text-gray-600">Total Executions</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {logs.filter(l => l.status === 'success').length}
          </div>
          <div className="text-sm text-gray-600">Successful</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600">
            {logs.filter(l => l.status === 'failure').length}
          </div>
          <div className="text-sm text-gray-600">Failed</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">
            {logs.filter(l => ['pending', 'running'].includes(l.status)).length}
          </div>
          <div className="text-sm text-gray-600">In Progress</div>
        </div>
      </div>
    </div>
  );
}
