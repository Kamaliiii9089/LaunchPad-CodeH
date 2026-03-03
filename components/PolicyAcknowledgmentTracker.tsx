'use client';

import { useState, useEffect } from 'react';

interface Acknowledgment {
  _id: string;
  policyId: {
    _id: string;
    title: string;
    category: string;
    version: number;
  };
  policyVersion: number;
  status: 'pending' | 'acknowledged' | 'declined' | 'expired' | 'exempted';
  acknowledgedAt?: string;
  expiresAt?: string;
  remindersSent: number;
  readTime?: number;
  scrollPercentage?: number;
  quizScore?: number;
  createdAt: string;
}

interface AckStats {
  total: number;
  pending: number;
  acknowledged: number;
  expired: number;
}

export default function PolicyAcknowledgmentTracker() {
  const [acknowledgments, setAcknowledgments] = useState<Acknowledgment[]>([]);
  const [stats, setStats] = useState<AckStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAck, setSelectedAck] = useState<Acknowledgment | null>(null);
  const [showAcknowledgeModal, setShowAcknowledgeModal] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [readTime, setReadTime] = useState(0);

  useEffect(() => {
    fetchAcknowledgments();
  }, [statusFilter]);

  useEffect(() => {
    if (showAcknowledgeModal) {
      const interval = setInterval(() => {
        setReadTime((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setReadTime(0);
    }
  }, [showAcknowledgeModal]);

  const fetchAcknowledgments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/policies/acknowledgments?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch acknowledgments');

      const data = await response.json();
      setAcknowledgments(data.acknowledgments);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching acknowledgments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!selectedAck) return;

    try {
      setAcknowledging(true);
      const token = localStorage.getItem('token');

      const response = await fetch(
        `/api/policies/acknowledgments/${selectedAck._id}/acknowledge`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            readTime,
            scrollPercentage: 100, // Simplified for demo
            signature: 'Digital Signature',
            signatureMethod: 'typed',
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to acknowledge policy');

      setShowAcknowledgeModal(false);
      setSelectedAck(null);
      fetchAcknowledgments();
    } catch (error) {
      console.error('Error acknowledging policy:', error);
    } finally {
      setAcknowledging(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'acknowledged': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'expired': return 'bg-red-100 text-red-700';
      case 'declined': return 'bg-gray-100 text-gray-700';
      case 'exempted': return 'bg-blue-100 text-blue-700';
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

  const isOverdue = (ack: Acknowledgment) => {
    return ack.expiresAt && new Date(ack.expiresAt) < new Date() && ack.status === 'pending';
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
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Pending</div>
            <div className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</div>
            <div className="text-xs text-gray-500 mt-1">Action required</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Acknowledged</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{stats.acknowledged}</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.total > 0 ? Math.round((stats.acknowledged / stats.total) * 100) : 0}% complete
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Expired</div>
            <div className="text-2xl font-bold text-red-600 mt-1">{stats.expired}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="expired">Expired</option>
          <option value="declined">Declined</option>
          <option value="exempted">Exempted</option>
        </select>
      </div>

      {/* Acknowledgment List */}
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
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {acknowledgments.map((ack) => (
                <tr
                  key={ack._id}
                  className={`hover:bg-gray-50 ${isOverdue(ack) ? 'bg-red-50' : ''}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getCategoryIcon(ack.policyId.category)}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{ack.policyId.title}</div>
                        <div className="text-xs text-gray-500">Version {ack.policyVersion}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ack.status)}`}>
                      {ack.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {ack.expiresAt ? (
                      <div className="text-sm">
                        <div className={isOverdue(ack) ? 'text-red-600 font-medium' : 'text-gray-900'}>
                          {new Date(ack.expiresAt).toLocaleDateString()}
                        </div>
                        {isOverdue(ack) && (
                          <div className="text-xs text-red-600">Overdue!</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">No deadline</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {ack.status === 'acknowledged' ? (
                      <div className="text-sm text-gray-600">
                        {ack.readTime && <div>Read: {Math.floor(ack.readTime / 60)}m</div>}
                        {ack.quizScore !== undefined && <div>Quiz: {ack.quizScore}%</div>}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        {ack.remindersSent > 0 && `${ack.remindersSent} reminder(s) sent`}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {ack.status === 'pending' && (
                      <button
                        onClick={() => {
                          setSelectedAck(ack);
                          setShowAcknowledgeModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Acknowledge
                      </button>
                    )}
                    {ack.status === 'acknowledged' && (
                      <span className="text-green-600">✓ Complete</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {acknowledgments.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-2">✅</div>
            <p className="text-gray-600">No acknowledgments found</p>
          </div>
        )}
      </div>

      {/* Acknowledge Modal */}
      {showAcknowledgeModal && selectedAck && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Acknowledge Policy
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedAck.policyId.title}</p>
                </div>
                <button
                  onClick={() => {
                    setShowAcknowledgeModal(false);
                    setSelectedAck(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">ℹ️</span>
                  <div>
                    <div className="font-medium text-blue-900">Important Notice</div>
                    <div className="text-sm text-blue-700 mt-1">
                      By acknowledging this policy, you confirm that you have read and understood its contents
                      and agree to comply with all stated requirements.
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-sm text-gray-600 mb-2">Time Spent Reading</div>
                <div className="text-2xl font-bold text-gray-900">
                  {Math.floor(readTime / 60)}:{(readTime % 60).toString().padStart(2, '0')}
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    required
                  />
                  <span className="text-sm text-gray-700">
                    I have read and understand this policy
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    required
                  />
                  <span className="text-sm text-gray-700">
                    I agree to comply with all requirements stated in this policy
                  </span>
                </label>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowAcknowledgeModal(false);
                    setSelectedAck(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={acknowledging}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAcknowledge}
                  disabled={acknowledging}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {acknowledging ? 'Acknowledging...' : 'Acknowledge Policy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
