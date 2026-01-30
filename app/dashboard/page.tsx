'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { useRouter } from 'next/navigation';

interface SecurityEvent {
  id: number;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  timestamp: string;
  status: 'active' | 'resolved' | 'investigating';
}

interface SystemMetric {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: string;
}

export default function DashboardPage() {
  const { logout } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'threats' | 'analytics' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token) {
      // No token found, redirect to login
      window.location.href = '/login';
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const securityEvents: SecurityEvent[] = [
    { id: 1, type: 'Brute Force Attack', severity: 'critical', description: 'Multiple failed login attempts detected from IP 192.168.1.100', timestamp: '2 minutes ago', status: 'investigating' },
    { id: 2, type: 'Malware Detected', severity: 'high', description: 'Suspicious file activity in /system/temp/', timestamp: '15 minutes ago', status: 'active' },
    { id: 3, type: 'Unauthorized Access', severity: 'high', description: 'Attempt to access restricted directory', timestamp: '1 hour ago', status: 'resolved' },
    { id: 4, type: 'Port Scan', severity: 'medium', description: 'Port scanning activity from external IP', timestamp: '2 hours ago', status: 'resolved' },
    { id: 5, type: 'SSL Certificate', severity: 'low', description: 'SSL certificate expiring in 30 days', timestamp: '3 hours ago', status: 'active' },
  ];

  const systemMetrics: SystemMetric[] = [
    { label: 'Total Threats Blocked', value: '1,247', change: '+12%', trend: 'up', icon: '🛡️' },
    { label: 'Active Vulnerabilities', value: '23', change: '-8%', trend: 'down', icon: '⚠️' },
    { label: 'System Health', value: '98.5%', change: '+2.1%', trend: 'up', icon: '💚' },
    { label: 'Active Monitors', value: '156', change: '+5', trend: 'up', icon: '👁️' },
  ];

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
      case 'active': return 'bg-red-500';
      case 'investigating': return 'bg-yellow-500';
      case 'resolved': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Security Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {user?.name || 'User'}!</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-sm font-medium text-green-700">System Online</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-4 mt-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('threats')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'threats'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Threats
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Settings
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {systemMetrics.map((metric, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
                      <h3 className="text-3xl font-bold text-gray-900">{metric.value}</h3>
                      <p className={`text-sm mt-2 flex items-center gap-1 ${
                        metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <span>{metric.trend === 'up' ? '↑' : '↓'}</span>
                        {metric.change} from last week
                      </p>
                    </div>
                    <div className="text-4xl">{metric.icon}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left">
                  <div className="text-2xl mb-2">🔍</div>
                  <h3 className="font-semibold text-gray-900">Run Security Scan</h3>
                  <p className="text-sm text-gray-600 mt-1">Perform a full system scan</p>
                </button>
                <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left">
                  <div className="text-2xl mb-2">📊</div>
                  <h3 className="font-semibold text-gray-900">Generate Report</h3>
                  <p className="text-sm text-gray-600 mt-1">Create security audit report</p>
                </button>
                <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left">
                  <div className="text-2xl mb-2">⚙️</div>
                  <h3 className="font-semibold text-gray-900">Configure Firewall</h3>
                  <p className="text-sm text-gray-600 mt-1">Manage firewall rules</p>
                </button>
              </div>
            </div>

            {/* Recent Security Events */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Recent Security Events</h2>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All →</button>
              </div>
              <div className="space-y-3">
                {securityEvents.slice(0, 3).map((event) => (
                  <div key={event.id} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`w-3 h-3 rounded-full mt-1.5 ${getStatusColor(event.status)}`}></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{event.type}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityColor(event.severity)}`}>
                          {event.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{event.description}</p>
                      <p className="text-xs text-gray-500 mt-2">{event.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Threats Tab */}
        {activeTab === 'threats' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Active Threats</h2>
              <div className="space-y-4">
                {securityEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg">
                    <div className={`w-3 h-3 rounded-full mt-1.5 ${getStatusColor(event.status)}`}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{event.type}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityColor(event.severity)}`}>
                            {event.severity.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 capitalize">{event.status}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">{event.timestamp}</p>
                        <div className="flex gap-2">
                          <button className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                            Investigate
                          </button>
                          <button className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">
                            Resolve
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Threat Distribution</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Malware</span>
                    <div className="flex items-center gap-2">
                      <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: '65%' }}></div>
                      </div>
                      <span className="text-sm font-medium">65%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Phishing</span>
                    <div className="flex items-center gap-2">
                      <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500" style={{ width: '45%' }}></div>
                      </div>
                      <span className="text-sm font-medium">45%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Brute Force</span>
                    <div className="flex items-center gap-2">
                      <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500" style={{ width: '35%' }}></div>
                      </div>
                      <span className="text-sm font-medium">35%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">DDoS</span>
                    <div className="flex items-center gap-2">
                      <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: '25%' }}></div>
                      </div>
                      <span className="text-sm font-medium">25%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Weekly Activity</h2>
                <div className="flex items-end justify-between h-48 gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                    const height = [60, 45, 75, 55, 85, 40, 30][index];
                    return (
                      <div key={day} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full bg-blue-600 rounded-t hover:bg-blue-700 transition-colors cursor-pointer" 
                             style={{ height: `${height}%` }}
                             title={`${day}: ${Math.round(height * 1.5)} threats`}>
                        </div>
                        <span className="text-xs text-gray-600">{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Account Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={user?.name || ''}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    readOnly
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Security Preferences</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-gray-900">Real-time Monitoring</h3>
                    <p className="text-sm text-gray-600">Get instant alerts for security threats</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-gray-900">Email Notifications</h3>
                    <p className="text-sm text-gray-600">Receive security updates via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-gray-900">Auto-block Threats</h3>
                    <p className="text-sm text-gray-600">Automatically block detected threats</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200">
              <h2 className="text-xl font-bold text-red-600 mb-4">Danger Zone</h2>
              <div className="space-y-3">
                <button className="w-full px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors text-left">
                  Reset Security Settings
                </button>
                <button className="w-full px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors text-left">
                  Clear All Logs
                </button>
                <button
                  onClick={logout}
                  className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
