import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { emailAPI, subscriptionAPI, authAPI, reportAPI } from '../utils/api';
import {
  FiRefreshCw,
  FiAlertCircle,
  FiAlertTriangle,
  FiSearch,
  FiMail,
  FiUsers,
  FiBarChart,
  FiCheckCircle,
  FiXCircle,
  FiExternalLink,
  FiShield,
  FiShieldOff,
  FiDollarSign,
  FiCreditCard,
  FiPieChart
} from 'react-icons/fi';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import DashboardLayout from '../components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import './Dashboard.css';

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [error, setError] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [stats, setStats] = useState({
    uniqueCompanies: 0
  });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load subscriptions and overview
      const [subscriptionResponse, overviewResponse] = await Promise.all([
        subscriptionAPI.getSubscriptions({ limit: 1000 }),
        subscriptionAPI.getOverview ? subscriptionAPI.getOverview() : Promise.resolve({ data: { overview: {} } })
      ]);

      const subs = subscriptionResponse.data.subscriptions || [];
      setSubscriptions(subs);

      // Calculate stats from overview if available, otherwise from subscriptions
      const overview = overviewResponse.data.overview || {};
      const stats = {
        total: overview.totalSubscriptions || subs.length,
        active: overview.activeSubscriptions || subs.filter(s => s.status === 'active').length,
        revoked: overview.revokedSubscriptions || subs.filter(s => s.status === 'revoked').length,
        uniqueCompanies: overview.uniqueCompanies || 0
      };
      setStats(stats);

    } catch (error) {
      console.error('Dashboard load error:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleScanEmails = async () => {
    try {
      setScanning(true);
      setError(null);
      setScanProgress('Starting comprehensive email scan...');
      console.log('🔍 Starting comprehensive email scan...');

      const response = await emailAPI.scanEmails({ daysBack: 90 }); // Reduced to 90 days for faster scanning
      console.log('✅ Email scan completed:', response.data);

      setScanProgress('Scan completed! Refreshing dashboard...');

      // Reload dashboard data after scan
      await loadDashboardData();

      setScanProgress('');

    } catch (error) {
      console.error('Email scan error:', error);

      // Handle Gmail authentication required (both initial auth and reauth)
      if (error.response?.data?.code === 'GMAIL_REAUTH_REQUIRED' ||
        error.response?.data?.code === 'GMAIL_NOT_AUTHORIZED') {
        const authUrl = error.response.data.reauthUrl || error.response.data.authUrl;
        if (authUrl) {
          const isReauth = error.response.data.code === 'GMAIL_REAUTH_REQUIRED';
          const message = isReauth
            ? 'Gmail access requires additional permissions. Would you like to re-authorize now? This will redirect you to Google.'
            : 'Gmail access is required for email scanning. Would you like to authenticate with Google now?';

          const shouldAuth = window.confirm(message);
          if (shouldAuth) {
            window.location.href = authUrl;
          }
          return;
        }
      }

      const errorMessage = error.response?.data?.message || 'Email scan failed';
      setError(errorMessage);
    } finally {
      setScanning(false);
      setScanProgress('');
    }
  };

  const handleRevokeAccess = async (subscriptionId) => {
    try {
      await subscriptionAPI.revokeSubscription(subscriptionId);
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Revoke error:', error);
      setError('Failed to revoke access');
    }
  };

  const handleGrantAccess = async (subscriptionId) => {
    try {
      await subscriptionAPI.grantSubscription(subscriptionId);
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Grant error:', error);
      setError('Failed to grant access');
    }
  };

  const handleDownloadReport = async () => {
    try {
      setDownloading(true);
      const response = await reportAPI.download();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Security_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error(e);
      alert('Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'subscription': return <FiMail />;
      case 'newsletter': return <FiUsers />;
      case 'verification': return <FiCheckCircle />;
      case 'billing': return <FiBarChart />;
      default: return <FiMail />;
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      subscription: '#4285f4',
      newsletter: '#34a853',
      verification: '#fbbc04',
      billing: '#ea4335',
      login: '#9c27b0',
      signup: '#ff6d01',
      other: '#6c757d'
    };
    return colors[category] || colors.other;
  };

  const calculateFinancials = () => {
    let monthly = 0;
    const byCategory = {};
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

    subscriptions.forEach(sub => {
      const cost = sub.financials?.cost || 0;
      if (cost > 0) {
        const isYearly = sub.financials.period === 'yearly';
        const monthlyCost = isYearly ? cost / 12 : cost;

        monthly += monthlyCost;

        if (!byCategory[sub.category]) byCategory[sub.category] = 0;
        byCategory[sub.category] += monthlyCost;
      }
    });

    const pieData = Object.keys(byCategory).map((k, i) => ({
      name: k.charAt(0).toUpperCase() + k.slice(1),
      value: parseFloat(byCategory[k].toFixed(2)),
      color: COLORS[i % COLORS.length]
    }));

    return {
      monthly: monthly.toFixed(2),
      yearly: (monthly * 12).toFixed(2),
      pieData
    };
  };

  const financials = calculateFinancials();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="dashboard-page">
          <div className="container">
            <LoadingSpinner text="Loading your dashboard..." />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="dashboard-page">
          <div className="container">
            <div className="alert alert-error">
              <FiAlertCircle />
              {error}
              <button className="btn btn-sm btn-primary" onClick={() => setError(null)}>
                Clear Error
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="dashboard-page">
        <div className="container">
          {/* Header */}
          <div className="dashboard-header">
            <div className="header-content">
              <h1>{t('dashboard.welcome', { name: user?.name?.split(' ')[0] || 'User' })}!</h1>
              <p className="header-subtitle">
                {t('dashboard.overview')}
              </p>
            </div>
            <div className="header-actions">
              <button
                className={`btn btn-primary ${scanning ? 'loading' : ''}`}
                onClick={handleScanEmails}
                disabled={scanning}
              >
                {scanning ? (
                  <>
                    <FiRefreshCw className="spin" />
                    {scanProgress || 'Scanning All Emails...'}
                  </>
                ) : (
                  <>
                    <FiSearch />
                    Deep Scan Emails
                  </>
                )}
              </button>
              <button
                className="btn btn-secondary"
                onClick={loadDashboardData}
              >
                <FiRefreshCw />
                Refresh
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <FiMail />
              </div>
              <div className="stat-content">
                <h3>Unique Company</h3>
                <span className="stat-number">{stats.uniqueCompanies}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <FiUsers />
              </div>
              <div className="stat-content">
                <h3>Total Services</h3>
                <span className="stat-number">{stats.total}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon active">
                <FiCheckCircle />
              </div>
              <div className="stat-content">
                <h3>{t('dashboard.activeSubs')}</h3>
                <span className="stat-number active">{stats.active}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon revoked">
                <FiXCircle />
              </div>
              <div className="stat-content">
                <h3>Revoked</h3>
                <span className="stat-number revoked">{stats.revoked}</span>
              </div>
            </div>
          </div>

          {/* Services List */}
          <div className="services-section">
            <div className="section-header">
              <h3>Your Services & Subscriptions</h3>
              <p>Manage access to services that have your email</p>
            </div>

            {subscriptions.length > 0 ? (
              <div className="services-grid">
                {subscriptions.map((subscription) => (
                  <div key={subscription._id} className="service-card">
                    <div className="service-header">
                      <div className="service-info">
                        <div
                          className="service-icon"
                          style={{ backgroundColor: getCategoryColor(subscription.category) }}
                        >
                          {getCategoryIcon(subscription.category)}
                        </div>
                        <div className="service-details">
                          <h4 className="service-name">{subscription.serviceName}</h4>
                          <p className="service-domain">{subscription.domain}</p>
                          <span
                            className={`category-badge ${subscription.category}`}
                            style={{ backgroundColor: getCategoryColor(subscription.category) }}
                          >
                            {subscription.category}
                          </span>
                        </div>
                      </div>
                      <div className={`status-indicator ${subscription.status}`}>
                        {subscription.status === 'active' ? <FiShield /> : <FiShieldOff />}
                        {subscription.status}
                      </div>
                    </div>

                    <div className="service-stats">
                      <div className="stat-item">
                        <span className="stat-label">Emails</span>
                        <span className="stat-value">{subscription.emailCount}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">First Detected</span>
                        <span className="stat-value">
                          {new Date(subscription.firstDetected).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Last Email</span>
                        <span className="stat-value">
                          {subscription.lastEmailReceived
                            ? new Date(subscription.lastEmailReceived).toLocaleDateString()
                            : 'Unknown'
                          }
                        </span>
                      </div>
                    </div>

                    <div className="service-actions">
                      {subscription.status === 'active' ? (
                        <button
                          className="btn btn-danger"
                          onClick={() => handleRevokeAccess(subscription._id)}
                        >
                          <FiShieldOff />
                          Revoke Access
                        </button>
                      ) : (
                        <button
                          className="btn btn-success"
                          onClick={() => handleGrantAccess(subscription._id)}
                        >
                          <FiShield />
                          Grant Access
                        </button>
                      )}

                      {subscription.unsubscribeUrl && (
                        <a
                          href={subscription.unsubscribeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline"
                        >
                          <FiExternalLink />
                          Unsubscribe
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <FiMail />
                </div>
                <h3>No services found</h3>
                <p>Click "Scan Emails" to discover services and subscriptions from your Gmail inbox.</p>
                <button
                  className="btn btn-primary"
                  onClick={handleScanEmails}
                  disabled={scanning}
                >
                  <FiSearch />
                  Start Scanning
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
