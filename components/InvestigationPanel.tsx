'use client';

import { useState, useEffect } from 'react';

interface Investigation {
  _id: string;
  eventId: string;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    assignedAt: Date;
  }>;
  createdBy: {
    userId: string;
    userName: string;
    userEmail: string;
  };
  timeline: Array<{
    action: string;
    description: string;
    userId: string;
    userName: string;
    timestamp: Date;
  }>;
  findings: Array<{
    title: string;
    description: string;
    severity: string;
    addedBy: {
      userId: string;
      userName: string;
    };
    addedAt: Date;
  }>;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface InvestigationPanelProps {
  eventId: string;
  onClose: () => void;
  toast: any;
}

export default function InvestigationPanel({ eventId, onClose, toast }: InvestigationPanelProps) {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedInvestigation, setSelectedInvestigation] = useState<Investigation | null>(null);
  
  // Create form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [submitting, setSubmitting] = useState(false);

  // Update form state
  const [newFinding, setNewFinding] = useState({ title: '', description: '', severity: 'medium' });
  const [showAddFinding, setShowAddFinding] = useState(false);

  useEffect(() => {
    loadInvestigations();
  }, [eventId]);

  const loadInvestigations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/collaboration/investigations?eventId=${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setInvestigations(data.investigations);
        if (data.investigations.length > 0 && !selectedInvestigation) {
          setSelectedInvestigation(data.investigations[0]);
        }
      }
    } catch (error: any) {
      toast.error('Failed to load investigations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvestigation = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error('Please enter title and description');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/collaboration/investigations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId,
          title,
          description,
          priority,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Investigation created successfully');
        setTitle('');
        setDescription('');
        setPriority('medium');
        setShowCreateForm(false);
        loadInvestigations();
      } else {
        toast.error(data.error || 'Failed to create investigation');
      }
    } catch (error: any) {
      toast.error('Failed to create investigation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (investigationId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/collaboration/investigations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          investigationId,
          status: newStatus,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Status updated successfully');
        loadInvestigations();
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  const handleAddFinding = async () => {
    if (!newFinding.title.trim() || !newFinding.description.trim() || !selectedInvestigation) {
      toast.error('Please enter finding details');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/collaboration/investigations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          investigationId: selectedInvestigation._id,
          findings: newFinding,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Finding added successfully');
        setNewFinding({ title: '', description: '', severity: 'medium' });
        setShowAddFinding(false);
        loadInvestigations();
      } else {
        toast.error(data.error || 'Failed to add finding');
      }
    } catch (error: any) {
      toast.error('Failed to add finding');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-700';
      case 'in-progress': return 'bg-yellow-100 text-yellow-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      case 'closed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Shared Investigations</h2>
            <p className="text-sm text-gray-600 mt-1">
              Event ID: {eventId} • {investigations.length} {investigations.length === 1 ? 'investigation' : 'investigations'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + New Investigation
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Investigations List */}
          <div className="w-1/3 border-r border-gray-200 overflow-y-auto p-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : investigations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg">🔍 No investigations</p>
                <p className="text-sm mt-2">Create one to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {investigations.map((inv) => (
                  <div
                    key={inv._id}
                    onClick={() => setSelectedInvestigation(inv)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedInvestigation?._id === inv._id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm">{inv.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(inv.priority)}`}>
                        {inv.priority}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{inv.description}</p>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(inv.status)}`}>
                        {inv.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {inv.assignedTo.length} assigned
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Investigation Details */}
          <div className="flex-1 overflow-y-auto p-6">
            {showCreateForm ? (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900">Create New Investigation</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Investigation title"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the investigation scope and objectives..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCreateInvestigation}
                    disabled={submitting}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                  >
                    {submitting ? 'Creating...' : 'Create Investigation'}
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : selectedInvestigation ? (
              <div className="space-y-6">
                {/* Investigation Header */}
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-2xl font-bold text-gray-900">{selectedInvestigation.title}</h3>
                    <div className="flex gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(selectedInvestigation.priority)}`}>
                        {selectedInvestigation.priority}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedInvestigation.status)}`}>
                        {selectedInvestigation.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-700">{selectedInvestigation.description}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Created by {selectedInvestigation.createdBy.userName} on {formatDate(selectedInvestigation.createdAt)}
                  </p>
                </div>

                {/* Status Update */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Update Status</label>
                  <select
                    value={selectedInvestigation.status}
                    onChange={(e) => handleUpdateStatus(selectedInvestigation._id, e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                {/* Assigned Team */}
                {selectedInvestigation.assignedTo && selectedInvestigation.assignedTo.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Assigned Team</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedInvestigation.assignedTo.map((user, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {user.userName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{user.userName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Findings */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Findings</h4>
                    <button
                      onClick={() => setShowAddFinding(!showAddFinding)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      + Add Finding
                    </button>
                  </div>

                  {showAddFinding && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                      <input
                        type="text"
                        value={newFinding.title}
                        onChange={(e) => setNewFinding({ ...newFinding, title: e.target.value })}
                        placeholder="Finding title"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                      <textarea
                        value={newFinding.description}
                        onChange={(e) => setNewFinding({ ...newFinding, description: e.target.value })}
                        placeholder="Finding description"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        rows={3}
                      />
                      <select
                        value={newFinding.severity}
                        onChange={(e) => setNewFinding({ ...newFinding, severity: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      >
                        <option value="low">Low Severity</option>
                        <option value="medium">Medium Severity</option>
                        <option value="high">High Severity</option>
                        <option value="critical">Critical Severity</option>
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddFinding}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          Add Finding
                        </button>
                        <button
                          onClick={() => {
                            setShowAddFinding(false);
                            setNewFinding({ title: '', description: '', severity: 'medium' });
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedInvestigation.findings && selectedInvestigation.findings.length > 0 ? (
                    <div className="space-y-3">
                      {selectedInvestigation.findings.map((finding, idx) => (
                        <div key={idx} className="p-4 bg-white border border-gray-200 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-semibold text-gray-900">{finding.title}</h5>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              finding.severity === 'critical' ? 'bg-red-100 text-red-700' :
                              finding.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                              finding.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {finding.severity}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{finding.description}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            Added by {finding.addedBy.userName} on {formatDate(finding.addedAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No findings yet</p>
                  )}
                </div>

                {/* Timeline */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Timeline</h4>
                  <div className="space-y-3">
                    {selectedInvestigation.timeline.map((entry, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">{entry.description}</p>
                          <p className="text-xs text-gray-500">{formatDate(entry.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">Select an investigation to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
