'use client';

import { useState, useEffect } from 'react';

interface Policy {
  _id: string;
  title: string;
  description: string;
  category: string;
  version: number;
  status: 'draft' | 'review' | 'approved' | 'active' | 'archived' | 'deprecated';
  effectiveDate?: string;
  expirationDate?: string;
  nextReviewDate?: string;
  acknowledgmentRate: number;
  complianceScore: number;
  violationCount: number;
  createdAt: string;
  createdBy?: { name: string; email: string };
}

interface PolicyStats {
  totalPolicies: number;
  activePolicies: number;
  draftPolicies: number;
  policiesNeedingReview: number;
  totalAcknowledgments: number;
  pendingAcknowledgments: number;
  averageComplianceScore: number;
  totalViolations: number;
}

interface PolicyManagerProps {
  onPolicySelect?: (policy: Policy) => void;
}

export default function PolicyManager({ onPolicySelect }: PolicyManagerProps) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [stats, setStats] = useState<PolicyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchPolicies();
  }, [statusFilter, categoryFilter]);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);

      const response = await fetch(`/api/policies?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch policies');

      const data = await response.json();
      setPolicies(data.policies);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (policyId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/policies/${policyId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (!response.ok) throw new Error('Failed to approve policy');

      fetchPolicies();
    } catch (error) {
      console.error('Error approving policy:', error);
    }
  };

  const handlePublish = async (policyId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/policies/${policyId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to publish policy');

      fetchPolicies();
    } catch (error) {
      console.error('Error publishing policy:', error);
    }
  };

  const handleArchive = async (policyId: string) => {
    if (!confirm('Are you sure you want to archive this policy?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/policies/${policyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to archive policy');

      fetchPolicies();
    } catch (error) {
      console.error('Error archiving policy:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'approved': return 'bg-blue-100 text-blue-700';
      case 'review': return 'bg-yellow-100 text-yellow-700';
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'archived': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security': return '🔒';
      case 'privacy': return '🛡️';
      case 'compliance': return '✅';
      case 'operational': return '⚙️';
      case 'hr': return '👥';
      case 'legal': return '⚖️';
      case 'data_protection': return '🗄️';
      case 'access_control': return '🔑';
      default: return '📄';
    }
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Total Policies</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{stats.totalPolicies}</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.activePolicies} active
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Avg Compliance</div>
            <div className={`text-2xl font-bold mt-1 ${getComplianceColor(stats.averageComplianceScore)}`}>
              {stats.averageComplianceScore.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.totalViolations} violations
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Acknowledgments</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{stats.totalAcknowledgments}</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.pendingAcknowledgments} pending
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Need Review</div>
            <div className="text-2xl font-bold text-yellow-600 mt-1">{stats.policiesNeedingReview}</div>
            <div className="text-xs text-gray-500 mt-1">
              Overdue review
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="review">In Review</option>
              <option value="approved">Approved</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="security">Security</option>
              <option value="privacy">Privacy</option>
              <option value="compliance">Compliance</option>
              <option value="operational">Operational</option>
              <option value="hr">HR</option>
              <option value="legal">Legal</option>
              <option value="data_protection">Data Protection</option>
              <option value="access_control">Access Control</option>
            </select>
          </div>
        </div>
      </div>

      {/* Policy List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Policy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compliance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {policies.map((policy) => (
                <tr key={policy._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getCategoryIcon(policy.category)}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{policy.title}</div>
                        <div className="text-xs text-gray-500">{policy.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(policy.status)}`}>
                      {policy.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className={`font-bold ${getComplianceColor(policy.complianceScore)}`}>
                        {policy.complianceScore.toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-500">
                        {policy.acknowledgmentRate.toFixed(0)}% ack
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    v{policy.version}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      {policy.status === 'review' && (
                        <button
                          onClick={() => handleApprove(policy._id)}
                          className="text-green-600 hover:text-green-700 font-medium"
                        >
                          Approve
                        </button>
                      )}
                      {policy.status === 'approved' && (
                        <button
                          onClick={() => handlePublish(policy._id)}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Publish
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedPolicy(policy);
                          setShowDetails(true);
                        }}
                        className="text-gray-600 hover:text-gray-700 font-medium"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleArchive(policy._id)}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        Archive
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {policies.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-2">📄</div>
            <p className="text-gray-600">No policies found</p>
          </div>
        )}
      </div>

      {/* Policy Details Modal */}
      {showDetails && selectedPolicy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedPolicy.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedPolicy.description}</p>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-sm text-gray-600">Version</div>
                  <div className="text-lg font-bold text-gray-900">v{selectedPolicy.version}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Compliance Score</div>
                  <div className={`text-lg font-bold ${getComplianceColor(selectedPolicy.complianceScore)}`}>
                    {selectedPolicy.complianceScore.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Acknowledgment Rate</div>
                  <div className="text-lg font-bold text-gray-900">
                    {selectedPolicy.acknowledgmentRate.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Violations</div>
                  <div className="text-lg font-bold text-red-600">{selectedPolicy.violationCount}</div>
                </div>
              </div>
              {selectedPolicy.effectiveDate && (
                <div className="text-sm text-gray-600 mb-2">
                  Effective: {new Date(selectedPolicy.effectiveDate).toLocaleDateString()}
                </div>
              )}
              {selectedPolicy.nextReviewDate && (
                <div className="text-sm text-gray-600">
                  Next Review: {new Date(selectedPolicy.nextReviewDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
