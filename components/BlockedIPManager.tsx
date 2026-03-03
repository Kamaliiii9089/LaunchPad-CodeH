'use client';

import { useState, useEffect } from 'react';

interface BlockedIP {
  _id: string;
  ipAddress: string;
  reason: string;
  threatType: string;
  severity: string;
  blockType: string;
  isTemporary: boolean;
  expiresAt?: string;
  blockedBy: string;
  status: string;
  isActive: boolean;
  attacksBlocked: number;
  whitelisted: boolean;
  country?: string;
  createdAt: string;
}

interface BlockedIPManagerProps {
  toast: any;
}

export default function BlockedIPManager({ toast }: BlockedIPManagerProps) {
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newIP, setNewIP] = useState({
    ipAddress: '',
    reason: '',
    threatType: '',
    severity: 'high',
    blockType: 'firewall',
    isTemporary: false,
    duration: 60,
  });

  useEffect(() => {
    fetchBlockedIPs();
  }, [filter]);

  const fetchBlockedIPs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url = '/api/incident-response/blocked-ips?';
      if (filter === 'active') url += 'status=active';
      if (filter === 'whitelisted') url += 'whitelisted=true';

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch blocked IPs');

      const data = await response.json();
      setBlockedIPs(data.blockedIPs || []);
      setStats(data.stats);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addBlockedIP = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/incident-response/blocked-ips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newIP),
      });

      if (!response.ok) throw new Error('Failed to block IP');

      toast.success('IP blocked successfully');
      setShowAddModal(false);
      setNewIP({
        ipAddress: '',
        reason: '',
        threatType: '',
        severity: 'high',
        blockType: 'firewall',
        isTemporary: false,
        duration: 60,
      });
      fetchBlockedIPs();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const unblockIP = async (id: string) => {
    if (!confirm('Are you sure you want to unblock this IP?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/incident-response/blocked-ips/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to unblock IP');

      toast.success('IP unblocked successfully');
      fetchBlockedIPs();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const whitelistIP = async (id: string) => {
    const reason = prompt('Please provide a reason for whitelisting this IP:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/incident-response/blocked-ips/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'whitelist', reason }),
      });

      if (!response.ok) throw new Error('Failed to whitelist IP');

      toast.success('IP whitelisted successfully');
      fetchBlockedIPs();
    } catch (error: any) {
      toast.error(error.message);
    }
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Blocked IP Addresses</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage automatically and manually blocked IP addresses
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
        >
          <span>🚫</span> Block IP
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Blocked</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Active Blocks</p>
            <p className="text-2xl font-bold text-red-600">{stats.active}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Expired</p>
            <p className="text-2xl font-bold text-gray-600">{stats.expired}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Whitelisted</p>
            <p className="text-2xl font-bold text-green-600">{stats.whitelisted}</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All IPs</option>
            <option value="active">Active Only</option>
            <option value="whitelisted">Whitelisted</option>
          </select>

          <div className="ml-auto text-sm text-gray-600">
            <span className="font-medium">{blockedIPs.length}</span> IPs found
          </div>
        </div>
      </div>

      {/* IP List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-3">Loading blocked IPs...</p>
            </div>
          ) : blockedIPs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🚫</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No blocked IPs found</h3>
              <p className="text-gray-600">Blocked IP addresses will appear here</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Threat Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Block Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Blocked</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {blockedIPs.map((ip) => (
                  <tr key={ip._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-mono font-medium text-gray-900">{ip.ipAddress}</p>
                        {ip.country && (
                          <p className="text-xs text-gray-500">{ip.country}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{ip.reason}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{ip.threatType}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(ip.severity)}`}>
                        {ip.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{ip.blockType}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {ip.whitelisted ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium w-fit">
                            Whitelisted
                          </span>
                        ) : ip.isActive ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium w-fit">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium w-fit">
                            Inactive
                          </span>
                        )}
                        {ip.isTemporary && ip.expiresAt && (
                          <span className={`text-xs ${isExpired(ip.expiresAt) ? 'text-gray-500' : 'text-orange-600'}`}>
                            {isExpired(ip.expiresAt) ? 'Expired' : `Expires ${formatDate(ip.expiresAt)}`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-gray-500">{formatDate(ip.createdAt)}</p>
                      <p className="text-xs text-gray-500">by {ip.blockedBy}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {!ip.whitelisted && ip.isActive && (
                          <>
                            <button
                              onClick={() => whitelistIP(ip._id)}
                              className="text-xs text-green-600 hover:text-green-700 font-medium"
                            >
                              Whitelist
                            </button>
                            <button
                              onClick={() => unblockIP(ip._id)}
                              className="text-xs text-red-600 hover:text-red-700 font-medium"
                            >
                              Unblock
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add IP Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Block IP Address</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IP Address *
                </label>
                <input
                  type="text"
                  value={newIP.ipAddress}
                  onChange={(e) => setNewIP({ ...newIP, ipAddress: e.target.value })}
                  placeholder="192.168.1.100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason *
                </label>
                <input
                  type="text"
                  value={newIP.reason}
                  onChange={(e) => setNewIP({ ...newIP, reason: e.target.value })}
                  placeholder="Brute force attack detected"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Threat Type *
                </label>
                <input
                  type="text"
                  value={newIP.threatType}
                  onChange={(e) => setNewIP({ ...newIP, threatType: e.target.value })}
                  placeholder="Brute Force Attack"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severity
                  </label>
                  <select
                    value={newIP.severity}
                    onChange={(e) => setNewIP({ ...newIP, severity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Block Type
                  </label>
                  <select
                    value={newIP.blockType}
                    onChange={(e) => setNewIP({ ...newIP, blockType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="firewall">Firewall</option>
                    <option value="waf">WAF</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newIP.isTemporary}
                    onChange={(e) => setNewIP({ ...newIP, isTemporary: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Temporary Block</span>
                </label>
              </div>

              {newIP.isTemporary && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={newIP.duration}
                    onChange={(e) => setNewIP({ ...newIP, duration: parseInt(e.target.value) })}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={addBlockedIP}
                  disabled={!newIP.ipAddress || !newIP.reason || !newIP.threatType}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Block IP
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
