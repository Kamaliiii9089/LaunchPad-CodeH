import { useState, useEffect } from 'react';

interface FileIntegrityProps {
  toast: any;
}

interface MonitoredFile {
  _id: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  status: 'intact' | 'modified' | 'deleted' | 'new';
  category: string;
  severity: string;
  baselineHash: string;
  currentHash: string;
  lastChecked: string;
  monitoringEnabled: boolean;
  alertOnChange: boolean;
  changeHistory: Array<{
    timestamp: string;
    action: string;
    previousHash?: string;
    newHash?: string;
    details: string;
  }>;
}

interface FIMStats {
  total: number;
  intact: number;
  modified: number;
  deleted: number;
  critical: number;
  lastScan: string | null;
}

export default function FileIntegrityMonitor({ toast }: FileIntegrityProps) {
  const [files, setFiles] = useState<MonitoredFile[]>([]);
  const [stats, setStats] = useState<FIMStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<MonitoredFile | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Add file form state
  const [newFile, setNewFile] = useState({
    filePath: '',
    fileName: '',
    fileSize: 0,
    category: 'custom',
    severity: 'medium',
    alertOnChange: true,
  });

  useEffect(() => {
    loadFiles();
  }, [filterStatus, filterCategory]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url = '/api/fim';
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterCategory !== 'all') params.append('category', filterCategory);
      if (params.toString()) url += '?' + params.toString();

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to load files');

      const data = await response.json();
      setFiles(data.files);
      setStats(data.stats);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load monitored files');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    try {
      setScanning(true);
      const token = localStorage.getItem('token');

      const response = await fetch('/api/fim/scan', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Scan failed');

      const data = await response.json();
      toast.success(data.message);
      
      if (data.changesDetected > 0) {
        toast.warning(`⚠️ ${data.changesDetected} unauthorized changes detected!`);
      }

      loadFiles();
    } catch (error: any) {
      toast.error(error.message || 'Failed to run scan');
    } finally {
      setScanning(false);
    }
  };

  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/fim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newFile),
      });

      if (!response.ok) throw new Error('Failed to add file');

      const data = await response.json();
      toast.success(data.message);
      setShowAddModal(false);
      setNewFile({
        filePath: '',
        fileName: '',
        fileSize: 0,
        category: 'custom',
        severity: 'medium',
        alertOnChange: true,
      });
      loadFiles();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add file');
    }
  };

  const handleAcceptChange = async (fileId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/fim', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: fileId, action: 'accept' }),
      });

      if (!response.ok) throw new Error('Failed to accept change');

      toast.success('Change accepted and baseline updated');
      loadFiles();
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept change');
    }
  };

  const handleToggleMonitoring = async (fileId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/fim', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: fileId, action: 'toggle-monitoring' }),
      });

      if (!response.ok) throw new Error('Failed to toggle monitoring');

      toast.success('Monitoring status updated');
      loadFiles();
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle monitoring');
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to stop monitoring this file?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/fim?id=${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to remove file');

      toast.success('File monitoring removed');
      loadFiles();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove file');
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
      case 'intact': return 'text-green-600 bg-green-50';
      case 'modified': return 'text-red-600 bg-red-50';
      case 'deleted': return 'text-gray-600 bg-gray-50';
      case 'new': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Total Files</p>
          <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Intact</p>
          <p className="text-2xl font-bold text-green-600">{stats?.intact || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Modified</p>
          <p className="text-2xl font-bold text-red-600">{stats?.modified || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Critical</p>
          <p className="text-2xl font-bold text-orange-600">{stats?.critical || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Last Scan</p>
          <p className="text-sm font-medium text-gray-900">
            {stats?.lastScan ? new Date(stats.lastScan).toLocaleString() : 'Never'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleScan}
              disabled={scanning}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {scanning ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Scanning...
                </>
              ) : (
                <>
                  <span>🔍</span>
                  Run Integrity Scan
                </>
              )}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <span>➕</span>
              Add File
            </button>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="intact">Intact</option>
              <option value="modified">Modified</option>
              <option value="deleted">Deleted</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="system">System</option>
              <option value="application">Application</option>
              <option value="configuration">Configuration</option>
              <option value="logs">Logs</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
      </div>

      {/* Files List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Monitored Files</h2>
          <p className="text-sm text-gray-600 mt-1">Track integrity of critical system files</p>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-4xl mb-2">📁</p>
            <p>No files being monitored</p>
            <p className="text-sm mt-1">Add files to start monitoring their integrity</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Checked</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {files.map((file) => (
                  <tr key={file._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{file.fileName}</p>
                        <p className="text-sm text-gray-500 truncate max-w-md">{file.filePath}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(file.status)}`}>
                        {file.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 capitalize">{file.category}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(file.severity)}`}>
                        {file.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(file.lastChecked).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {file.status === 'modified' && (
                          <button
                            onClick={() => handleAcceptChange(file._id)}
                            className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100"
                            title="Accept change"
                          >
                            ✓ Accept
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedFile(file)}
                          className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                          title="View details"
                        >
                          👁️ Details
                        </button>
                        <button
                          onClick={() => handleToggleMonitoring(file._id)}
                          className={`text-xs px-2 py-1 rounded ${
                            file.monitoringEnabled 
                              ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100' 
                              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                          }`}
                          title={file.monitoringEnabled ? 'Pause monitoring' : 'Resume monitoring'}
                        >
                          {file.monitoringEnabled ? '⏸️' : '▶️'}
                        </button>
                        <button
                          onClick={() => handleRemoveFile(file._id)}
                          className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100"
                          title="Remove"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add File Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Add File to Monitor</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddFile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File Path</label>
                <input
                  type="text"
                  value={newFile.filePath}
                  onChange={(e) => setNewFile({ ...newFile, filePath: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="/etc/passwd"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File Name</label>
                <input
                  type="text"
                  value={newFile.fileName}
                  onChange={(e) => setNewFile({ ...newFile, fileName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="passwd"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File Size (bytes)</label>
                <input
                  type="number"
                  value={newFile.fileSize}
                  onChange={(e) => setNewFile({ ...newFile, fileSize: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newFile.category}
                  onChange={(e) => setNewFile({ ...newFile, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="system">System</option>
                  <option value="application">Application</option>
                  <option value="configuration">Configuration</option>
                  <option value="logs">Logs</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={newFile.severity}
                  onChange={(e) => setNewFile({ ...newFile, severity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="alertOnChange"
                  checked={newFile.alertOnChange}
                  onChange={(e) => setNewFile({ ...newFile, alertOnChange: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="alertOnChange" className="text-sm text-gray-700">
                  Alert on change
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Details Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">File Details</h3>
              <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">File Path</p>
                <p className="text-sm text-gray-900 mt-1 font-mono bg-gray-50 p-2 rounded">{selectedFile.filePath}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedFile.status)}`}>
                    {selectedFile.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Severity</p>
                  <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(selectedFile.severity)}`}>
                    {selectedFile.severity.toUpperCase()}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600">Baseline Hash (SHA256)</p>
                <p className="text-xs text-gray-900 mt-1 font-mono bg-gray-50 p-2 rounded break-all">{selectedFile.baselineHash}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600">Current Hash (SHA256)</p>
                <p className="text-xs text-gray-900 mt-1 font-mono bg-gray-50 p-2 rounded break-all">{selectedFile.currentHash}</p>
              </div>

              {selectedFile.changeHistory && selectedFile.changeHistory.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Change History</p>
                  <div className="space-y-2">
                    {selectedFile.changeHistory.slice(-5).reverse().map((change, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">{change.action.toUpperCase()}</span>
                          <span className="text-xs text-gray-500">{new Date(change.timestamp).toLocaleString()}</span>
                        </div>
                        {change.details && (
                          <p className="text-xs text-gray-600">{change.details}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setSelectedFile(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
