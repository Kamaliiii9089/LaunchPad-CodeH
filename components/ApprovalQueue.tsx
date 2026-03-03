'use client';

import React, { useState, useEffect } from 'react';

interface ApprovalRequest {
  _id: string;
  type: string;
  status: string;
  priority: string;
  actionType: string;
  actionConfig: any;
  triggerEvent?: {
    eventId: string;
    eventType: string;
    severity: string;
    description: string;
  };
  reason: string;
  impact: string;
  reversible: boolean;
  requestedBy: {
    name: string;
    email: string;
  };
  requestedAt: string;
  expiresAt: string;
  reviewedBy?: {
    name: string;
    email: string;
  };
  reviewedAt?: string;
  reviewNotes?: string;
}

interface ApprovalQueueProps {
  toast: any;
}

export default function ApprovalQueue({ toast }: ApprovalQueueProps) {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'processed'>('pending');
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/automation/approvals', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load approvals');
      }

      const data = await response.json();
      setApprovals(data.approvals);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load approval requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId: string, notes: string) => {
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/automation/approvals/${approvalId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          decision: 'approved',
          notes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to approve request');
      }

      toast.success('Request approved and action executed');
      setShowReviewModal(false);
      setSelectedApproval(null);
      setReviewNotes('');
      loadApprovals();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve request');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (approvalId: string, notes: string) => {
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/automation/approvals/${approvalId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          decision: 'rejected',
          notes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reject request');
      }

      toast.success('Request rejected');
      setShowReviewModal(false);
      setSelectedApproval(null);
      setReviewNotes('');
      loadApprovals();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject request');
    } finally {
      setProcessing(false);
    }
  };

  const filteredApprovals = approvals.filter(approval => {
    if (filter === 'pending') return approval.status === 'pending';
    if (filter === 'processed') return ['approved', 'rejected', 'expired'].includes(approval.status);
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'expired': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const pendingCount = approvals.filter(a => a.status === 'pending').length;

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
          <h3 className="text-lg font-semibold text-gray-900">Approval Queue</h3>
          <p className="text-sm text-gray-600 mt-1">
            {pendingCount} pending approval{pendingCount !== 1 ? 's' : ''}
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
            onClick={() => setFilter('processed')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              filter === 'processed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Processed
          </button>
          <button
            onClick={loadApprovals}
            className="ml-2 p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Approvals List */}
      <div className="space-y-3">
        {filteredApprovals.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No approval requests found</p>
          </div>
        ) : (
          filteredApprovals.map(approval => (
            <div
              key={approval._id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${getPriorityColor(approval.priority)}`}>
                      {approval.priority.toUpperCase()}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(approval.status)}`}>
                      {approval.status}
                    </span>
                    <span className="text-xs text-gray-500">{approval.type}</span>
                  </div>

                  <h4 className="font-semibold text-gray-900 mb-1">
                    {approval.actionType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </h4>

                  <p className="text-sm text-gray-700 mb-2">{approval.reason}</p>

                  {approval.triggerEvent && (
                    <div className="text-xs text-gray-600 mb-2">
                      <span className="font-medium">Triggered by:</span> {approval.triggerEvent.eventType} 
                      <span className={`ml-2 px-1.5 py-0.5 rounded ${
                        approval.triggerEvent.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        approval.triggerEvent.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {approval.triggerEvent.severity}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                    <span>Requested by: {approval.requestedBy.name}</span>
                    <span>•</span>
                    <span>
                      {new Date(approval.requestedAt).toLocaleString()}
                    </span>
                    {approval.reviewedBy && (
                      <>
                        <span>•</span>
                        <span>Reviewed by: {approval.reviewedBy.name}</span>
                      </>
                    )}
                  </div>

                  {approval.reviewNotes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                      <span className="font-medium">Notes:</span> {approval.reviewNotes}
                    </div>
                  )}
                </div>

                {approval.status === 'pending' && (
                  <div className="ml-4 flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setSelectedApproval(approval);
                        setShowReviewModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Review
                    </button>
                  </div>
                )}
              </div>

              {/* Action Details */}
              <details className="mt-3">
                <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900">
                  View Details
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
                  <div className="mb-2">
                    <span className="font-medium">Impact:</span> {approval.impact}
                  </div>
                  <div className="mb-2">
                    <span className="font-medium">Reversible:</span>{' '}
                    <span className={approval.reversible ? 'text-green-600' : 'text-red-600'}>
                      {approval.reversible ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Expires:</span>{' '}
                    {new Date(approval.expiresAt).toLocaleString()}
                  </div>
                </div>
              </details>
            </div>
          ))
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Review Approval Request</h3>

            <div className="space-y-4 mb-6">
              <div>
                <span className="text-sm font-medium text-gray-700">Action:</span>
                <p className="text-lg font-semibold text-gray-900">
                  {selectedApproval.actionType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700">Reason:</span>
                <p className="text-gray-900">{selectedApproval.reason}</p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700">Impact:</span>
                <p className="text-gray-900">{selectedApproval.impact}</p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700">Reversible:</span>
                <p className={selectedApproval.reversible ? 'text-green-600' : 'text-red-600'}>
                  {selectedApproval.reversible ? 'Yes - Action can be reversed' : 'No - Action is permanent'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Notes (Optional)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  rows={3}
                  placeholder="Add notes about your decision..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleApprove(selectedApproval._id, reviewNotes)}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {processing ? 'Processing...' : '✓ Approve & Execute'}
              </button>
              <button
                onClick={() => handleReject(selectedApproval._id, reviewNotes)}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {processing ? 'Processing...' : '✗ Reject'}
              </button>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedApproval(null);
                  setReviewNotes('');
                }}
                disabled={processing}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
