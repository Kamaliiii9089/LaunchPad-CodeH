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
import HelpIcon from '@/components/HelpIcon';
import { getTrustedDevices, removeDevice, verifyCurrentDevice, performBrowserSecurityCheck } from '@/lib/deviceSecurity';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'threats' | 'analytics' | 'settings' | 'privacy' | 'help'>('overview');
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

  // Device management state
  const [trustedDevices, setTrustedDevices] = useState<any[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [currentDevice, setCurrentDevice] = useState<any>(null);
  const [browserSecurityScore, setBrowserSecurityScore] = useState<number>(100);
  const [browserWarnings, setBrowserWarnings] = useState<string[]>([]);

  // Privacy management state
  const [privacyAnalysis, setPrivacyAnalysis] = useState<any>(null);
  const [analyzingData, setAnalyzingData] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [anonymizingData, setAnonymizingData] = useState(false);
  const [deletingData, setDeletingData] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');

  // Help & Support state
  const [showChatSupport, setShowChatSupport] = useState(false);
  const [showTroubleshooter, setShowTroubleshooter] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([
    { id: 1, sender: 'support', text: 'Hello! How can I help you today?', timestamp: new Date() }
  ]);
  const [chatInput, setChatInput] = useState('');

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
    
    // Perform browser security check
    const securityCheck = performBrowserSecurityCheck();
    setBrowserSecurityScore(securityCheck.score);
    setBrowserWarnings(securityCheck.warnings);
    
    // Load trusted devices
    loadTrustedDevices();
    
    // Verify current device
    verifyDevice();
    
    setLoading(false);
  }, []);
  
  const loadTrustedDevices = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    setLoadingDevices(true);
    const result = await getTrustedDevices(token);
    
    if (result.success && result.devices) {
      setTrustedDevices(result.devices);
    } else if (result.error) {
      toast.error(result.error);
    }
    setLoadingDevices(false);
  };
  
  const verifyDevice = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const result = await verifyCurrentDevice(token);
    
    if (result.success && result.device) {
      setCurrentDevice(result.device);
      
      if (result.device.isNewDevice) {
        toast.info(`New device detected: ${result.device.deviceName}`);
      }
      
      if (result.device.suspiciousFlags.length > 0) {
        toast.warning(`Security warning: ${result.device.suspiciousFlags.join(', ')}`);
      }
    }
  };
  
  const handleRemoveDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to remove this device? You will need to verify it again on next login.')) {
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const result = await removeDevice(token, deviceId);
    
    if (result.success) {
      toast.success('Device removed successfully');
      loadTrustedDevices();
    } else {
      toast.error(result.error || 'Failed to remove device');
    }
  };

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

  // Privacy Management Functions
  const handleAnalyzePrivacy = async () => {
    try {
      setAnalyzingData(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/privacy/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to analyze data');
      }

      const data = await response.json();
      setPrivacyAnalysis(data.analysis);
      toast.success('Privacy analysis complete!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to analyze privacy data');
    } finally {
      setAnalyzingData(false);
    }
  };

  const handleExportPersonalData = async () => {
    try {
      setExportingData(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/privacy/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export personal data');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `my_data_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Your personal data has been exported!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export personal data');
    } finally {
      setExportingData(false);
    }
  };

  const handleAnonymizeData = async () => {
    if (!confirm('Are you sure you want to anonymize your data? This will remove personally identifiable information.')) {
      return;
    }

    try {
      setAnonymizingData(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/privacy/anonymize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to anonymize data');
      }

      const data = await response.json();
      toast.success(`Anonymized ${data.fieldsAnonymized} fields successfully!`);
      
      // Refresh privacy analysis
      handleAnalyzePrivacy();
    } catch (error: any) {
      toast.error(error.message || 'Failed to anonymize data');
    } finally {
      setAnonymizingData(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (!deleteConfirmPassword) {
      toast.error('Please enter your password to confirm');
      return;
    }

    try {
      setDeletingData(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/privacy/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password: deleteConfirmPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete data');
      }

      toast.success('All your data has been deleted. Logging out...');
      
      // Clear local storage and redirect
      setTimeout(() => {
        localStorage.clear();
        window.location.href = '/';
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete data');
      setDeletingData(false);
    }
  };

  // Help & Support Functions
  const handleSendChatMessage = () => {
    if (!chatInput.trim()) return;

    const newMessage = {
      id: chatMessages.length + 1,
      sender: 'user',
      text: chatInput,
      timestamp: new Date(),
    };

    setChatMessages([...chatMessages, newMessage]);
    setChatInput('');

    // Simulate support response
    setTimeout(() => {
      const supportResponse = {
        id: chatMessages.length + 2,
        sender: 'support',
        text: generateSupportResponse(chatInput),
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, supportResponse]);
    }, 1000);
  };

  const generateSupportResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    if (message.includes('2fa') || message.includes('two factor')) {
      return 'For 2FA setup, go to Settings → Two-Factor Authentication. You\'ll need an authenticator app like Google Authenticator or Authy.';
    } else if (message.includes('device') || message.includes('trust')) {
      return 'Trusted devices are managed in Settings → Trusted Devices. You can remove devices that you don\'t recognize.';
    } else if (message.includes('privacy') || message.includes('data')) {
      return 'Visit the Privacy tab to analyze, export, anonymize, or delete your personal data. All actions comply with GDPR and CCPA regulations.';
    } else if (message.includes('threat') || message.includes('security')) {
      return 'Check the Threats tab for active security events. You can investigate or resolve threats from there.';
    } else if (message.includes('report')) {
      return 'You can generate security reports from the Overview tab using the "Generate Report" quick action button.';
    } else {
      return 'I\'m here to help! You can ask about: 2FA setup, device management, privacy settings, security threats, or report generation. Or browse our FAQ section below.';
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
            <button
              onClick={() => setActiveTab('privacy')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'privacy'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Privacy
            </button>
            <button
              onClick={() => setActiveTab('help')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'help'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Help
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

            {/* Browser Security Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Browser Security</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-gray-900">Security Score</h3>
                    <p className="text-sm text-gray-600">Current browser security rating</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="#e5e7eb"
                          strokeWidth="8"
                          fill="none"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke={browserSecurityScore >= 80 ? '#10b981' : browserSecurityScore >= 60 ? '#f59e0b' : '#ef4444'}
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${(browserSecurityScore / 100) * 176} 176`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-gray-900">{browserSecurityScore}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {browserWarnings.length > 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                      <span>⚠️</span>
                      Security Warnings
                    </h4>
                    <ul className="space-y-1">
                      {browserWarnings.map((warning, index) => (
                        <li key={index} className="text-sm text-yellow-700">
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {currentDevice && (
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Current Device</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Device:</span>
                        <span className="font-medium">{currentDevice.deviceName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Trust Score:</span>
                        <span className={`font-medium ${
                          currentDevice.trustScore >= 70 ? 'text-green-600' : 
                          currentDevice.trustScore >= 40 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {currentDevice.trustScore}/100
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          currentDevice.isTrusted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {currentDevice.isTrusted ? '✓ Trusted' : '⚠ Not Trusted'}
                        </span>
                      </div>
                      {currentDevice.suspiciousFlags && currentDevice.suspiciousFlags.length > 0 && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          <span className="text-xs text-red-700 font-medium">
                            Suspicious Activity: {currentDevice.suspiciousFlags.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Trusted Devices Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900">Trusted Devices</h2>
                  <HelpIcon content="Trusted devices are automatically recognized and don't require additional verification. Remove devices you no longer use." />
                </div>
                <button
                  onClick={loadTrustedDevices}
                  disabled={loadingDevices}
                  className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                >
                  {loadingDevices ? 'Loading...' : '🔄 Refresh'}
                </button>
              </div>
              
              {loadingDevices ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading devices...</p>
                </div>
              ) : trustedDevices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No trusted devices found</p>
                  <p className="text-sm mt-2">Devices will appear here after you log in from them</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trustedDevices.map((device: any) => (
                    <div key={device.deviceId} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">
                              {device.deviceType === 'mobile' ? '📱' : 
                               device.deviceType === 'tablet' ? '📱' : '💻'}
                            </span>
                            <div>
                              <h3 className="font-semibold text-gray-900">{device.deviceName}</h3>
                              <p className="text-sm text-gray-600">{device.browser} • {device.os}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                            <div>
                              <span className="text-gray-600">Last used:</span>
                              <span className="ml-2 font-medium">
                                {new Date(device.lastUsed).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Trust score:</span>
                              <span className={`ml-2 font-medium ${
                                device.trustScore >= 70 ? 'text-green-600' : 
                                device.trustScore >= 40 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {device.trustScore}/100
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">First seen:</span>
                              <span className="ml-2 font-medium">
                                {new Date(device.firstSeen).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Logins:</span>
                              <span className="ml-2 font-medium">{device.loginCount || 0}</span>
                            </div>
                          </div>
                          {device.ip && (
                            <p className="text-xs text-gray-500 mt-2">IP: {device.ip}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          {device.isTrusted ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium whitespace-nowrap">
                              ✓ Trusted
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium whitespace-nowrap">
                              ⚠ Unverified
                            </span>
                          )}
                          <button
                            onClick={() => handleRemoveDevice(device.deviceId)}
                            className="px-3 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                <p className="font-medium">💡 Tip:</p>
                <p>Removing a device will require re-verification on the next login from that device. Trusted devices provide a smoother login experience.</p>
              </div>
            </div>

            {/* Two-Factor Authentication Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-6">
                <h2 className="text-xl font-bold text-gray-900">Two-Factor Authentication</h2>
                <HelpIcon content="2FA adds an extra layer of security by requiring a code from your authenticator app in addition to your password." />
              </div>
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

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            {/* Privacy Overview */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900">Privacy Dashboard</h2>
                    <HelpIcon content="Analyze, export, anonymize, or delete your personal data in compliance with GDPR and CCPA regulations." />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Manage your personal data and privacy settings</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleAnalyzePrivacy}
                    disabled={analyzingData}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {analyzingData ? 'Analyzing...' : '🔍 Analyze My Data'}
                  </button>
                </div>
              </div>

              {/* Privacy Analysis Results */}
              {privacyAnalysis && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Total Data Points</p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">{privacyAnalysis.totalDataPoints}</p>
                      </div>
                      <span className="text-3xl">📊</span>
                    </div>
                  </div>
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-yellow-600 font-medium">PII Fields Detected</p>
                        <p className="text-2xl font-bold text-yellow-900 mt-1">{privacyAnalysis.piiFields}</p>
                      </div>
                      <span className="text-3xl">🔐</span>
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 font-medium">Anonymized Fields</p>
                        <p className="text-2xl font-bold text-green-900 mt-1">{privacyAnalysis.anonymizedFields}</p>
                      </div>
                      <span className="text-3xl">✅</span>
                    </div>
                  </div>
                </div>
              )}

              {privacyAnalysis && privacyAnalysis.piiDetected && privacyAnalysis.piiDetected.length > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                    <span>⚠️</span>
                    Personally Identifiable Information (PII) Detected
                  </h3>
                  <div className="space-y-2">
                    {privacyAnalysis.piiDetected.map((pii: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded border border-yellow-300">
                        <div>
                          <p className="font-medium text-gray-900">{pii.field}</p>
                          <p className="text-sm text-gray-600">{pii.type} - {pii.value}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          pii.masked ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {pii.masked ? 'Masked' : 'Exposed'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Data Access Requests */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Data Access Requests</h2>
              <p className="text-gray-600 mb-6">
                Exercise your right to access your personal data. Export all information we have stored about you.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">📥</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">Export Personal Data</h3>
                      <p className="text-sm text-gray-600">Download all your data in JSON format</p>
                    </div>
                  </div>
                  <button
                    onClick={handleExportPersonalData}
                    disabled={exportingData}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {exportingData ? 'Exporting...' : 'Export My Data'}
                  </button>
                </div>

                <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">📋</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">Data Processing Report</h3>
                      <p className="text-sm text-gray-600">See how we process your data</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toast.info('Data processing report will be sent to your email')}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Request Report
                  </button>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <p className="text-blue-700">
                  <strong>💡 GDPR Compliance:</strong> You have the right to access, rectify, and delete your personal data. 
                  Exports include all data we have collected and stored about you.
                </p>
              </div>
            </div>

            {/* Data Anonymization */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Data Anonymization</h2>
              <p className="text-gray-600 mb-6">
                Anonymize your personally identifiable information (PII) while keeping your account active.
              </p>

              <div className="space-y-4">
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    <span>🎭</span>
                    What gets anonymized?
                  </h3>
                  <ul className="space-y-1 text-sm text-purple-700">
                    <li>• Email addresses → Hashed identifiers</li>
                    <li>• Names → Pseudonymized usernames</li>
                    <li>• IP addresses → Generalized location data</li>
                    <li>• Device identifiers → Anonymized fingerprints</li>
                    <li>• PII in logs and events → Masked values</li>
                  </ul>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                    <span>⚠️</span>
                    Important Notice
                  </h3>
                  <p className="text-sm text-yellow-700">
                    Anonymization is irreversible. Your original data cannot be recovered after this process. 
                    You will still be able to use the service, but some personalized features may be limited.
                  </p>
                </div>

                <button
                  onClick={handleAnonymizeData}
                  disabled={anonymizingData}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors disabled:opacity-50"
                >
                  {anonymizingData ? 'Anonymizing...' : '🎭 Anonymize My Data'}
                </button>
              </div>
            </div>

            {/* Right to Deletion */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200">
              <h2 className="text-xl font-bold text-red-600 mb-4">Right to Deletion</h2>
              <p className="text-gray-600 mb-6">
                Permanently delete all your data and close your account. This action cannot be undone.
              </p>

              {!showDeleteConfirm ? (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                      <span>🗑️</span>
                      What will be deleted?
                    </h3>
                    <ul className="space-y-1 text-sm text-red-700 mb-3">
                      <li>• Your account and authentication credentials</li>
                      <li>• All personal information and profile data</li>
                      <li>• All security events and logs associated with your account</li>
                      <li>• Device trust records and session data</li>
                      <li>• All reports and audit trails</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                  >
                    ⚠️ Request Account Deletion
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h3 className="font-semibold text-red-900 mb-2">⚠️ Final Confirmation Required</h3>
                    <p className="text-sm text-red-700 mb-4">
                      This action is permanent and cannot be undone. Please enter your password to confirm account deletion.
                    </p>
                    <FormInput
                      label="Confirm Password"
                      type="password"
                      value={deleteConfirmPassword}
                      onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleDeleteAllData}
                      disabled={deletingData || !deleteConfirmPassword}
                      className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50"
                    >
                      {deletingData ? 'Deleting...' : '🗑️ Delete All My Data'}
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmPassword('');
                      }}
                      disabled={deletingData}
                      className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                <p className="text-gray-700">
                  <strong>📋 Legal Notice:</strong> Per GDPR and CCPA regulations, you have the right to request deletion 
                  of your personal data. We will process your request within 30 days. Some data may be retained for legal 
                  compliance purposes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Help Tab */}
        {activeTab === 'help' && (
          <div className="space-y-6">
            {/* Help Overview */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Help & Support Center</h2>
                  <p className="text-sm text-gray-600 mt-1">Get help, browse FAQs, or contact support</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowChatSupport(!showChatSupport)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    💬 {showChatSupport ? 'Close Chat' : 'Chat Support'}
                  </button>
                  <button
                    onClick={() => setShowTroubleshooter(!showTroubleshooter)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    🔧 Troubleshooter
                  </button>
                </div>
              </div>

              {/* Quick Help Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer">
                  <div className="text-3xl mb-2">📚</div>
                  <h3 className="font-semibold text-gray-900 mb-1">Documentation</h3>
                  <p className="text-sm text-gray-600">Browse our comprehensive guides</p>
                </div>
                <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all cursor-pointer">
                  <div className="text-3xl mb-2">🎥</div>
                  <h3 className="font-semibold text-gray-900 mb-1">Video Tutorials</h3>
                  <p className="text-sm text-gray-600">Watch step-by-step guides</p>
                </div>
                <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all cursor-pointer">
                  <div className="text-3xl mb-2">👥</div>
                  <h3 className="font-semibold text-gray-900 mb-1">Community</h3>
                  <p className="text-sm text-gray-600">Connect with other users</p>
                </div>
              </div>
            </div>

            {/* Live Chat Support */}
            {showChatSupport && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-2xl">
                        💬
                      </div>
                      <div>
                        <h3 className="font-semibold">Live Support Chat</h3>
                        <p className="text-sm text-blue-100">Usually responds within minutes</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowChatSupport(false)}
                      className="text-white hover:bg-blue-800 rounded-full p-2"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                
                <div className="h-96 overflow-y-auto p-4 bg-gray-50">
                  <div className="space-y-4">
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs px-4 py-2 rounded-lg ${
                            message.sender === 'user'
                              ? 'bg-blue-600 text-white rounded-br-none'
                              : 'bg-white border border-gray-200 rounded-bl-none'
                          }`}
                        >
                          <p className="text-sm">{message.text}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {new Date(message.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="p-4 bg-white border-t border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={handleSendChatMessage}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Troubleshooter */}
            {showTroubleshooter && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">🔧 Troubleshooting Wizard</h2>
                  <button
                    onClick={() => setShowTroubleshooter(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕ Close
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-all cursor-pointer">
                    <h3 className="font-semibold text-gray-900 mb-2">🔐 Can't enable 2FA</h3>
                    <p className="text-sm text-gray-600 mb-3">Follow these steps to resolve 2FA setup issues:</p>
                    <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
                      <li>Ensure your authenticator app is up to date</li>
                      <li>Check that device time is synchronized</li>
                      <li>Try scanning the QR code again</li>
                      <li>If issues persist, use manual key entry</li>
                    </ol>
                  </div>

                  <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-all cursor-pointer">
                    <h3 className="font-semibold text-gray-900 mb-2">📱 Device not recognized</h3>
                    <p className="text-sm text-gray-600 mb-3">Steps to verify your device:</p>
                    <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
                      <li>Clear your browser cache and cookies</li>
                      <li>Check email for device verification link</li>
                      <li>Ensure JavaScript is enabled</li>
                      <li>Try using a different browser</li>
                    </ol>
                  </div>

                  <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-all cursor-pointer">
                    <h3 className="font-semibold text-gray-900 mb-2">⚠️ Seeing false security alerts</h3>
                    <p className="text-sm text-gray-600 mb-3">Reduce false positives:</p>
                    <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
                      <li>Review your trusted devices list</li>
                      <li>Whitelist your regular IP addresses</li>
                      <li>Adjust sensitivity in Settings</li>
                      <li>Report false positives to improve detection</li>
                    </ol>
                  </div>

                  <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-all cursor-pointer">
                    <h3 className="font-semibold text-gray-900 mb-2">📊 Reports not generating</h3>
                    <p className="text-sm text-gray-600 mb-3">Fix report generation issues:</p>
                    <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
                      <li>Check your internet connection</li>
                      <li>Ensure you have data to report</li>
                      <li>Try generating a smaller date range</li>
                      <li>Clear browser cache and retry</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* FAQ Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">📋 Frequently Asked Questions</h2>
              
              <div className="space-y-3">
                <details className="group border border-gray-200 rounded-lg">
                  <summary className="cursor-pointer p-4 font-semibold text-gray-900 hover:bg-gray-50 flex justify-between items-center">
                    <span>How do I enable Two-Factor Authentication (2FA)?</span>
                    <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="p-4 pt-0 text-sm text-gray-600 border-t border-gray-200 mt-2">
                    <p className="mb-2">To enable 2FA:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Go to Settings → Two-Factor Authentication</li>
                      <li>Click "Enable Two-Factor Authentication"</li>
                      <li>Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)</li>
                      <li>Enter the 6-digit code from your app</li>
                      <li>Save your backup codes in a secure location</li>
                    </ol>
                  </div>
                </details>

                <details className="group border border-gray-200 rounded-lg">
                  <summary className="cursor-pointer p-4 font-semibold text-gray-900 hover:bg-gray-50 flex justify-between items-center">
                    <span>What are trusted devices and how do they work?</span>
                    <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="p-4 pt-0 text-sm text-gray-600 border-t border-gray-200 mt-2">
                    <p className="mb-2">Trusted devices are devices you've logged in from before. Once trusted, you won't need to verify your identity each time you log in from that device.</p>
                    <p className="mb-2">Key features:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Trust scores based on usage patterns</li>
                      <li>Automatic detection of new devices</li>
                      <li>Ability to remove devices remotely</li>
                      <li>Security warnings for suspicious activity</li>
                    </ul>
                  </div>
                </details>

                <details className="group border border-gray-200 rounded-lg">
                  <summary className="cursor-pointer p-4 font-semibold text-gray-900 hover:bg-gray-50 flex justify-between items-center">
                    <span>How can I export my personal data?</span>
                    <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="p-4 pt-0 text-sm text-gray-600 border-t border-gray-200 mt-2">
                    <p className="mb-2">You have the right to access all your personal data:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Navigate to the Privacy tab</li>
                      <li>Click "Export Personal Data"</li>
                      <li>Your data will be downloaded as a JSON file</li>
                      <li>This file contains all account information, settings, and activity logs</li>
                    </ol>
                    <p className="mt-2">This complies with GDPR Article 15 and CCPA Section 1798.100 (Right to Know).</p>
                  </div>
                </details>

                <details className="group border border-gray-200 rounded-lg">
                  <summary className="cursor-pointer p-4 font-semibold text-gray-900 hover:bg-gray-50 flex justify-between items-center">
                    <span>What's the difference between anonymization and deletion?</span>
                    <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="p-4 pt-0 text-sm text-gray-600 border-t border-gray-200 mt-2">
                    <p className="mb-2"><strong>Anonymization:</strong></p>
                    <ul className="list-disc list-inside space-y-1 mb-3">
                      <li>Removes PII but keeps your account active</li>
                      <li>Converts data to pseudonyms and hashes</li>
                      <li>Irreversible process</li>
                      <li>Some features may be limited</li>
                    </ul>
                    <p className="mb-2"><strong>Deletion:</strong></p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Permanently deletes all your data</li>
                      <li>Closes your account</li>
                      <li>Cannot be undone</li>
                      <li>Complies with "Right to be Forgotten"</li>
                    </ul>
                  </div>
                </details>

                <details className="group border border-gray-200 rounded-lg">
                  <summary className="cursor-pointer p-4 font-semibold text-gray-900 hover:bg-gray-50 flex justify-between items-center">
                    <span>How do I interpret threat severity levels?</span>
                    <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="p-4 pt-0 text-sm text-gray-600 border-t border-gray-200 mt-2">
                    <p className="mb-2">Threats are categorized into four severity levels:</p>
                    <ul className="space-y-2">
                      <li><strong className="text-red-600">🔴 Critical:</strong> Immediate action required. Active exploitation or severe vulnerability.</li>
                      <li><strong className="text-orange-600">🟠 High:</strong> Requires prompt attention. Potential for significant impact.</li>
                      <li><strong className="text-yellow-600">🟡 Medium:</strong> Should be addressed soon. Moderate risk level.</li>
                      <li><strong className="text-blue-600">🔵 Low:</strong> Minor issues. Can be addressed during routine maintenance.</li>
                    </ul>
                  </div>
                </details>

                <details className="group border border-gray-200 rounded-lg">
                  <summary className="cursor-pointer p-4 font-semibold text-gray-900 hover:bg-gray-50 flex justify-between items-center">
                    <span>How often should I generate security reports?</span>
                    <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="p-4 pt-0 text-sm text-gray-600 border-t border-gray-200 mt-2">
                    <p className="mb-2">Report frequency depends on your needs:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Daily:</strong> High-security environments or regulated industries</li>
                      <li><strong>Weekly:</strong> Standard business operations</li>
                      <li><strong>Monthly:</strong> Personal use or low-traffic systems</li>
                      <li><strong>On-demand:</strong> After security incidents or for audits</li>
                    </ul>
                    <p className="mt-2">You can schedule automated reports in Settings.</p>
                  </div>
                </details>

                <details className="group border border-gray-200 rounded-lg">
                  <summary className="cursor-pointer p-4 font-semibold text-gray-900 hover:bg-gray-50 flex justify-between items-center">
                    <span>What should I do if I lose my 2FA device?</span>
                    <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="p-4 pt-0 text-sm text-gray-600 border-t border-gray-200 mt-2">
                    <p className="mb-2">If you lose access to your 2FA authenticator:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Use one of your backup codes to log in</li>
                      <li>Once logged in, go to Settings → Two-Factor Authentication</li>
                      <li>Disable 2FA (you'll need a backup code)</li>
                      <li>Re-enable 2FA with your new device</li>
                      <li>Generate and save new backup codes</li>
                    </ol>
                    <p className="mt-2 text-yellow-700"><strong>Important:</strong> Always keep your backup codes in a secure location!</p>
                  </div>
                </details>

                <details className="group border border-gray-200 rounded-lg">
                  <summary className="cursor-pointer p-4 font-semibold text-gray-900 hover:bg-gray-50 flex justify-between items-center">
                    <span>Is my data encrypted?</span>
                    <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="p-4 pt-0 text-sm text-gray-600 border-t border-gray-200 mt-2">
                    <p className="mb-2">Yes, we use industry-standard encryption:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>In transit:</strong> TLS 1.3 encryption for all data transmission</li>
                      <li><strong>At rest:</strong> AES-256 encryption for stored data</li>
                      <li><strong>Passwords:</strong> Bcrypt hashing with salt</li>
                      <li><strong>2FA secrets:</strong> Encrypted storage</li>
                    </ul>
                  </div>
                </details>
              </div>
            </div>

            {/* Community Forums */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">👥 Community Forums</h2>
              <p className="text-gray-600 mb-6">
                Connect with other users, share experiences, and get help from the community.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">💡</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">General Discussion</h3>
                      <p className="text-sm text-gray-600 mb-2">Share ideas and best practices</p>
                      <span className="text-xs text-blue-600">2,456 topics • 12,389 posts</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">🔧</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Technical Support</h3>
                      <p className="text-sm text-gray-600 mb-2">Get help with technical issues</p>
                      <span className="text-xs text-blue-600">1,234 topics • 5,678 posts</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">🎓</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Tutorials & Guides</h3>
                      <p className="text-sm text-gray-600 mb-2">Learn from community experts</p>
                      <span className="text-xs text-blue-600">567 topics • 2,345 posts</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">🚀</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Feature Requests</h3>
                      <p className="text-sm text-gray-600 mb-2">Suggest new features</p>
                      <span className="text-xs text-blue-600">890 topics • 4,123 posts</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Community Guidelines</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Be respectful and professional</li>
                  <li>• Search before posting to avoid duplicates</li>
                  <li>• Provide context and details in your questions</li>
                  <li>• Mark solved threads as resolved</li>
                  <li>• Help others when you can</li>
                </ul>
              </div>
            </div>

            {/* Contact Support */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📧 Contact Support</h2>
              <p className="text-gray-600 mb-6">
                Can't find what you're looking for? Reach out to our support team.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border border-gray-200 rounded-lg">
                  <div className="text-3xl mb-2">📧</div>
                  <h3 className="font-semibold text-gray-900 mb-1">Email Support</h3>
                  <p className="text-sm text-gray-600 mb-2">support@breachbuddy.com</p>
                  <p className="text-xs text-gray-500">Response within 24 hours</p>
                </div>

                <div className="text-center p-4 border border-gray-200 rounded-lg">
                  <div className="text-3xl mb-2">💬</div>
                  <h3 className="font-semibold text-gray-900 mb-1">Live Chat</h3>
                  <p className="text-sm text-gray-600 mb-2">Available 24/7</p>
                  <p className="text-xs text-gray-500">Average response: 2 minutes</p>
                </div>

                <div className="text-center p-4 border border-gray-200 rounded-lg">
                  <div className="text-3xl mb-2">📞</div>
                  <h3 className="font-semibold text-gray-900 mb-1">Phone Support</h3>
                  <p className="text-sm text-gray-600 mb-2">1-800-BREACH-1</p>
                  <p className="text-xs text-gray-500">Mon-Fri, 9am-5pm EST</p>
                </div>
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


