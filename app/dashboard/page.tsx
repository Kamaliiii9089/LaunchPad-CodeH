'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { useRouter } from 'next/navigation';
import TwoFactorSetup from '@/components/TwoFactorSetup';
import { useToast } from '@/components/ToastContainer';
import FormInput from '@/components/FormInput';
import { useFormValidation, validationPatterns } from '@/lib/validation';
import Pagination from '@/components/Pagination';
import EventsList from '@/components/EventsList';

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
  const toast = useToast();
  const { errors, touched, validate, setFieldTouched, resetValidation } = useFormValidation();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'threats' | 'analytics' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [disable2FACode, setDisable2FACode] = useState('');
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [regeneratingCodes, setRegeneratingCodes] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token) {
      // No token found, redirect to login
      window.location.href = '/login';
      return;
    }

    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setTwoFactorEnabled(parsedUser.twoFactorEnabled || false);
    }
    setLoading(false);
  }, []);

  const securityEvents: SecurityEvent[] = [
    { id: 1, type: 'Brute Force Attack', severity: 'critical', description: 'Multiple failed login attempts detected from IP 192.168.1.100', timestamp: '2 minutes ago', status: 'investigating' },
    { id: 2, type: 'Malware Detected', severity: 'high', description: 'Suspicious file activity in /system/temp/', timestamp: '15 minutes ago', status: 'active' },
    { id: 3, type: 'Unauthorized Access', severity: 'high', description: 'Attempt to access restricted directory', timestamp: '1 hour ago', status: 'resolved' },
    { id: 4, type: 'Port Scan', severity: 'medium', description: 'Port scanning activity from external IP', timestamp: '2 hours ago', status: 'resolved' },
    { id: 5, type: 'SSL Certificate', severity: 'low', description: 'SSL certificate expiring in 30 days', timestamp: '3 hours ago', status: 'active' },
    { id: 6, type: 'SQL Injection Attempt', severity: 'critical', description: 'SQL injection attack blocked on login form', timestamp: '4 hours ago', status: 'resolved' },
    { id: 7, type: 'DDoS Attack', severity: 'high', description: 'Distributed denial of service attack detected', timestamp: '5 hours ago', status: 'investigating' },
    { id: 8, type: 'Phishing Email', severity: 'medium', description: 'Suspicious email detected and quarantined', timestamp: '6 hours ago', status: 'resolved' },
    { id: 9, type: 'Firewall Breach', severity: 'critical', description: 'Attempted firewall bypass from unknown IP', timestamp: '7 hours ago', status: 'active' },
    { id: 10, type: 'Data Exfiltration', severity: 'high', description: 'Unusual data transfer activity detected', timestamp: '8 hours ago', status: 'investigating' },
    { id: 11, type: 'Ransomware Detected', severity: 'critical', description: 'Ransomware activity blocked by antivirus', timestamp: '9 hours ago', status: 'resolved' },
    { id: 12, type: 'Password Spray', severity: 'medium', description: 'Password spray attack on multiple accounts', timestamp: '10 hours ago', status: 'active' },
    { id: 13, type: 'Privilege Escalation', severity: 'high', description: 'Unauthorized privilege escalation attempt', timestamp: '11 hours ago', status: 'investigating' },
    { id: 14, type: 'Zero-Day Exploit', severity: 'critical', description: 'Zero-day vulnerability exploitation detected', timestamp: '12 hours ago', status: 'active' },
    { id: 15, type: 'API Abuse', severity: 'medium', description: 'Rate limiting triggered on API endpoint', timestamp: '13 hours ago', status: 'resolved' },
    { id: 16, type: 'Cross-Site Scripting', severity: 'high', description: 'XSS attempt blocked on user input form', timestamp: '14 hours ago', status: 'resolved' },
    { id: 17, type: 'Insider Threat', severity: 'critical', description: 'Suspicious activity from internal user account', timestamp: '15 hours ago', status: 'investigating' },
    { id: 18, type: 'Crypto Mining', severity: 'medium', description: 'Unauthorized cryptocurrency mining detected', timestamp: '16 hours ago', status: 'active' },
    { id: 19, type: 'DNS Spoofing', severity: 'high', description: 'DNS spoofing attack prevented', timestamp: '17 hours ago', status: 'resolved' },
    { id: 20, type: 'Man-in-the-Middle', severity: 'critical', description: 'MITM attack detected on network traffic', timestamp: '18 hours ago', status: 'investigating' },
    { id: 21, type: 'Keylogger Detected', severity: 'high', description: 'Keylogger software found and removed', timestamp: '19 hours ago', status: 'resolved' },
    { id: 22, type: 'Social Engineering', severity: 'medium', description: 'Social engineering attempt reported by user', timestamp: '20 hours ago', status: 'active' },
    { id: 23, type: 'Trojan Horse', severity: 'critical', description: 'Trojan malware detected in downloaded file', timestamp: '21 hours ago', status: 'resolved' },
    { id: 24, type: 'Backdoor Access', severity: 'high', description: 'Backdoor access attempt blocked', timestamp: '22 hours ago', status: 'investigating' },
    { id: 25, type: 'Botnet Activity', severity: 'critical', description: 'System attempting to join botnet', timestamp: '23 hours ago', status: 'active' },
  ];

  // Calculate pagination
  const totalPages = Math.ceil(securityEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEvents = securityEvents.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setEventsLoading(true);
    setCurrentPage(page);
    // Simulate loading delay
    setTimeout(() => setEventsLoading(false), 300);
  };

  const handleInvestigate = (event: SecurityEvent) => {
    toast.info(`Investigating: ${event.type}`);
  };

  const handleResolve = (event: SecurityEvent) => {
    toast.success(`Marked as resolved: ${event.type}`);
  };

  const systemMetrics: SystemMetric[] = [
    { label: 'Total Threats Blocked', value: '1,247', change: '+12%', trend: 'up', icon: '🛡️' },
    { label: 'Active Vulnerabilities', value: '23', change: '-8%', trend: 'down', icon: '⚠️' },
    { label: 'System Health', value: '98.5%', change: '+2.1%', trend: 'up', icon: '💚' },
    { label: 'Active Monitors', value: '156', change: '+5', trend: 'up', icon: '👁️' },
  ];



  const handle2FAComplete = () => {
    setTwoFactorEnabled(true);
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      parsedUser.twoFactorEnabled = true;
      localStorage.setItem('user', JSON.stringify(parsedUser));
      setUser(parsedUser);
    }
  };

  const handleDisable2FA = async () => {
    // Validate the 2FA code
    const isValid = validate('disable2FACode', disable2FACode, {
      required: true,
      pattern: validationPatterns.sixDigits,
      minLength: 6,
      maxLength: 6,
    });

    if (!isValid) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    try {
      setDisabling2FA(true);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ code: disable2FACode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable 2FA');
      }

      setTwoFactorEnabled(false);
      setShowDisable2FA(false);
      setDisable2FACode('');
      resetValidation();

      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        parsedUser.twoFactorEnabled = false;
        localStorage.setItem('user', JSON.stringify(parsedUser));
        setUser(parsedUser);
      }

      toast.success('2FA has been disabled successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to disable 2FA');
    } finally {
      setDisabling2FA(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!confirm('Are you sure you want to regenerate backup codes? Your old codes will no longer work.')) {
      return;
    }

    try {
      setRegeneratingCodes(true);

      const token = localStorage.getItem('token');
      const code = prompt('Enter your 2FA code to confirm:');

      if (!code) {
        return;
      }

      const response = await fetch('/api/auth/2fa/backup-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate backup codes');
      }

      setNewBackupCodes(data.backupCodes);
      toast.success('New backup codes generated! Make sure to save them securely.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to regenerate backup codes');
    } finally {
      setRegeneratingCodes(false);
    }
  };

  const handleDownloadBackupCodes = () => {
    const text = newBackupCodes.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'breachbuddy-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setNewBackupCodes([]);
  };

  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'Security Report',
          filters: {
            // You can customize filters here
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Get the PDF blob
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `security_report_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Report generated and downloaded successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          format: 'csv',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `security_events_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export data');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Security Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">Welcome back, {user?.name || 'User'}!</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900 rounded-lg">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-sm font-medium text-green-700 dark:text-green-300">System Online</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-4 mt-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 font-medium transition-colors ${activeTab === 'overview'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('threats')}
              className={`px-4 py-2 font-medium transition-colors ${activeTab === 'threats'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
              Threats
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 font-medium transition-colors ${activeTab === 'analytics'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 font-medium transition-colors ${activeTab === 'settings'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
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
                <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{metric.label}</p>
                      <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{metric.value}</h3>
                      <p className={`text-sm mt-2 flex items-center gap-1 ${metric.trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
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
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 transition-all text-left">
                  <div className="text-2xl mb-2">🔍</div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Run Security Scan</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Perform a full system scan</p>
                </button>
                <button
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-2xl mb-2">📊</div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {generatingReport ? 'Generating...' : 'Generate Report'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Create security audit report</p>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 transition-all text-left"
                >
                  <div className="text-2xl mb-2">📥</div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Export Data</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Download security events as CSV</p>
                </button>
              </div>
            </div>

            {/* Recent Security Events */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex justify-between items-center p-6 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Security Events</h2>
                  <p className="text-sm text-gray-600 mt-1">Showing {securityEvents.length} total events</p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={15}>15 per page</option>
                    <option value={25}>25 per page</option>
                  </select>
                </div>
              </div>
              <div className="px-6 pb-6">
                <EventsList
                  events={paginatedEvents}
                  isLoading={eventsLoading}
                  showActions={false}
                />
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={securityEvents.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                isLoading={eventsLoading}
              />
            </div>
          </div>
        )}

        {/* Threats Tab */}
        {activeTab === 'threats' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex justify-between items-center p-6 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Active Threats</h2>
                  <p className="text-sm text-gray-600 mt-1">Manage and investigate security threats</p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={15}>15 per page</option>
                    <option value={25}>25 per page</option>
                  </select>
                </div>
              </div>
              <div className="px-6 pb-6">
                <EventsList
                  events={paginatedEvents}
                  isLoading={eventsLoading}
                  showActions={true}
                  onInvestigate={handleInvestigate}
                  onResolve={handleResolve}
                />
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={securityEvents.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                isLoading={eventsLoading}
              />
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Threat Distribution</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Malware</span>
                    <div className="flex items-center gap-2">
                      <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: '65%' }}></div>
                      </div>
                      <span className="text-sm font-medium">65%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Phishing</span>
                    <div className="flex items-center gap-2">
                      <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500" style={{ width: '45%' }}></div>
                      </div>
                      <span className="text-sm font-medium">45%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Brute Force</span>
                    <div className="flex items-center gap-2">
                      <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500" style={{ width: '35%' }}></div>
                      </div>
                      <span className="text-sm font-medium">35%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">DDoS</span>
                    <div className="flex items-center gap-2">
                      <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: '25%' }}></div>
                      </div>
                      <span className="text-sm font-medium">25%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Weekly Activity</h2>
                <div className="flex items-end justify-between h-48 gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                    const height = [60, 45, 75, 55, 85, 40, 30][index];
                    return (
                      <div key={day} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full bg-blue-600 rounded-t hover:bg-blue-700 transition-colors cursor-pointer"
                          style={{ height: `${height}%` }}
                          title={`${day}: ${Math.round(height * 1.5)} threats`}>
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-300">{day}</span>
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
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Account Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
                  <input
                    type="text"
                    value={user?.name || ''}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    readOnly
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Security Preferences</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Real-time Monitoring</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Get instant alerts for security threats</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Email Notifications</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Receive security updates via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Auto-block Threats</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Automatically block detected threats</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Two-Factor Authentication Section */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Two-Factor Authentication</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {twoFactorEnabled
                        ? '2FA is enabled. Your account is protected with an extra layer of security.'
                        : 'Add an extra layer of security to your account by enabling 2FA.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {twoFactorEnabled ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        ✓ Enabled
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium">
                        Disabled
                      </span>
                    )}
                  </div>
                </div>

                {twoFactorEnabled ? (
                  <div className="space-y-3">
                    <button
                      onClick={handleRegenerateBackupCodes}
                      disabled={regeneratingCodes}
                      className="w-full px-4 py-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition-colors disabled:opacity-50"
                    >
                      {regeneratingCodes ? 'Generating...' : '🔄 Regenerate Backup Codes'}
                    </button>
                    <button
                      onClick={() => setShowDisable2FA(true)}
                      className="w-full px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors"
                    >
                      Disable Two-Factor Authentication
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShow2FASetup(true)}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    Enable Two-Factor Authentication
                  </button>
                )}

                {/* New backup codes display */}
                {newBackupCodes.length > 0 && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-3">
                      ⚠️ New Backup Codes - Save these immediately!
                    </p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {newBackupCodes.map((code, index) => (
                        <div
                          key={index}
                          className="font-mono text-sm bg-white dark:bg-gray-900 p-2 rounded border border-yellow-300 dark:border-yellow-700 text-center text-gray-900 dark:text-white"
                        >
                          {code}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleDownloadBackupCodes}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                    >
                      📥 Download Codes
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-red-200 dark:border-red-900/50">
              <h2 className="text-xl font-bold text-red-600 mb-4">Danger Zone</h2>
              <div className="space-y-3">
                <button className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 font-medium transition-colors text-left">
                  Reset Security Settings
                </button>
                <button className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 font-medium transition-colors text-left">
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

      {/* 2FA Setup Modal */}
      {show2FASetup && (
        <TwoFactorSetup
          onClose={() => setShow2FASetup(false)}
          onComplete={handle2FAComplete}
        />
      )}

      {/* Disable 2FA Modal */}
      {showDisable2FA && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl border border-transparent dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Disable Two-Factor Authentication
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              To disable 2FA, please enter your current 2FA code from your authenticator app.
            </p>

            <div className="mb-6">
              <FormInput
                label="2FA Code"
                type="text"
                value={disable2FACode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setDisable2FACode(value);
                  if (value.length > 0) {
                    setFieldTouched('disable2FACode');
                  }
                }}
                onBlur={() => setFieldTouched('disable2FACode')}
                placeholder="000000"
                className="text-center text-2xl font-mono tracking-widest"
                maxLength={6}
                required
                error={errors.disable2FACode}
                touched={touched.disable2FACode}
                success={disable2FACode.length === 6}
                helperText="Enter the 6-digit code from your authenticator app"
              />
            </div>

            <div className="space-y-3">
              <button
                onClick={handleDisable2FA}
                disabled={disabling2FA || disable2FACode.length !== 6}
                className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {disabling2FA ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Disabling...
                  </span>
                ) : (
                  'Disable 2FA'
                )}
              </button>
              <button
                onClick={() => {
                  setShowDisable2FA(false);
                  setDisable2FACode('');
                  resetValidation();
                }}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


