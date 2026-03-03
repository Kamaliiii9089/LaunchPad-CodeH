'use client';

import { useState, useEffect } from 'react';

interface Playbook {
  _id: string;
  name: string;
  description: string;
  category: string;
  severity: string;
  enabled: boolean;
  autoTrigger: boolean;
  threatTypes: string[];
  steps: any[];
  executionCount: number;
  successCount: number;
  failureCount: number;
  lastExecuted?: string;
  tags: string[];
  requiresApproval: boolean;
}

interface PlaybookLibraryProps {
  toast: any;
}

export default function PlaybookLibrary({ toast }: PlaybookLibraryProps) {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled' | 'auto'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchPlaybooks();
  }, [filter, categoryFilter]);

  const fetchPlaybooks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url = '/api/incident-response/playbooks?';
      if (filter === 'enabled') url += 'enabled=true&';
      if (filter === 'disabled') url += 'enabled=false&';
      if (filter === 'auto') url += 'autoTrigger=true&';
      if (categoryFilter !== 'all') url += `category=${categoryFilter}&`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch playbooks');

      const data = await response.json();
      setPlaybooks(data.playbooks || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePlaybook = async (playbookId: string, currentState: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/incident-response/playbooks/${playbookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: !currentState }),
      });

      if (!response.ok) throw new Error('Failed to update playbook');

      toast.success(`Playbook ${!currentState ? 'enabled' : 'disabled'}`);
      fetchPlaybooks();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deletePlaybook = async (playbookId: string) => {
    if (!confirm('Are you sure you want to delete this playbook?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/incident-response/playbooks/${playbookId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete playbook');

      toast.success('Playbook deleted successfully');
      fetchPlaybooks();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: any = {
      malware: '🦠',
      intrusion: '🚨',
      data_breach: '💾',
      ddos: '🌊',
      phishing: '🎣',
      insider_threat: '👤',
      other: '📋',
    };
    return icons[category] || '📋';
  };

  const getSeverityColor = (severity: string) => {
    const colors: any = {
      critical: 'bg-red-100 text-red-700 border-red-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      low: 'bg-blue-100 text-blue-700 border-blue-200',
    };
    return colors[severity] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Incident Response Playbooks</h2>
          <p className="text-sm text-gray-600 mt-1">
            Automated response procedures for security incidents
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
        >
          <span>+</span> Create Playbook
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Playbooks</option>
              <option value="enabled">Enabled Only</option>
              <option value="disabled">Disabled Only</option>
              <option value="auto">Auto-Trigger</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="malware">Malware</option>
              <option value="intrusion">Intrusion</option>
              <option value="data_breach">Data Breach</option>
              <option value="ddos">DDoS</option>
              <option value="phishing">Phishing</option>
              <option value="insider_threat">Insider Threat</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="ml-auto text-sm text-gray-600">
            <span className="font-medium">{playbooks.length}</span> playbooks found
          </div>
        </div>
      </div>

      {/* Playbook Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-3">Loading playbooks...</p>
        </div>
      ) : playbooks.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No playbooks found</h3>
          <p className="text-gray-600 mb-6">Create your first incident response playbook to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Playbook
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {playbooks.map((playbook) => (
            <div
              key={playbook._id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all overflow-hidden"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{getCategoryIcon(playbook.category)}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{playbook.name}</h3>
                      <p className="text-xs text-gray-600 line-clamp-2">{playbook.description}</p>
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center flex-wrap gap-2 mb-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(playbook.severity)}`}>
                    {playbook.severity}
                  </span>
                  {playbook.autoTrigger && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium border border-purple-200">
                      Auto-Trigger
                    </span>
                  )}
                  {playbook.requiresApproval && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium border border-amber-200">
                      Needs Approval
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    playbook.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {playbook.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-gray-200">
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Steps</p>
                    <p className="text-lg font-bold text-gray-900">{playbook.steps.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Executions</p>
                    <p className="text-lg font-bold text-gray-900">{playbook.executionCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Success Rate</p>
                    <p className="text-lg font-bold text-green-600">
                      {playbook.executionCount > 0
                        ? Math.round((playbook.successCount / playbook.executionCount) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedPlaybook(playbook);
                      setShowDetailsModal(true);
                    }}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => togglePlaybook(playbook._id, playbook.enabled)}
                    className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                      playbook.enabled
                        ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {playbook.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => deletePlaybook(playbook._id)}
                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Playbook Details Modal */}
      {showDetailsModal && selectedPlaybook && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{selectedPlaybook.name}</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600">{selectedPlaybook.description}</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Steps ({selectedPlaybook.steps.length})</h3>
                <div className="space-y-3">
                  {selectedPlaybook.steps.map((step: any, index: number) => (
                    <div key={step.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{step.name}</p>
                        <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {step.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Threat Types</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPlaybook.threatTypes.map((type: string) => (
                    <span
                      key={type}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                    >
                      {type}
                    </span>
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
