import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import BreachCheck from '../components/BreachCheck/BreachCheck.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import DashboardLayout from '../components/DashboardLayout';
import { breachCheckAPI } from '../utils/api';
import './BreachCheckPage.css';

const BreachCheckPage = () => {
  const { user } = useContext(AuthContext);
  const [subscriptions, setSubscriptions] = useState([]);
  const [breachStatus, setBreachStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBreachStatus();
  }, []);

  const fetchBreachStatus = async () => {
    try {
      setLoading(true);
      const response = await breachCheckAPI.getStatus();

      if (response.data.success) {
        setSubscriptions(response.data.data.subscriptions);
        setBreachStatus(response.data.data);
      } else {
        setError(response.data.message || 'Failed to load breach status');
      }
    } catch (err) {
      console.error('Error fetching breach status:', err);
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  const handleBreachCheckComplete = (results) => {
    // Refresh the breach status to get updated data
    fetchBreachStatus();
  };

  const getStatusColor = (isBreached) => {
    return isBreached ? '#dc3545' : '#28a745';
  };

  const getSeverityBadge = (severity) => {
    const severityConfig = {
      high: { icon: '🚨', color: '#dc3545', label: 'HIGH RISK' },
      medium: { icon: '⚠️', color: '#fd7e14', label: 'MEDIUM RISK' },
      low: { icon: '🟡', color: '#6c757d', label: 'LOW RISK' }
    };
    
    return severityConfig[severity] || { icon: '✅', color: '#28a745', label: 'SAFE' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="breach-check-page">
          <div className="loading-container">
            <LoadingSpinner />
            <h2>Loading Breach Check Status...</h2>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="breach-check-page">
          <div className="error-container">
            <h2>❌ Error Loading Breach Check</h2>
            <p>{error}</p>
            <button onClick={fetchBreachStatus} className="retry-btn">
              Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="breach-check-page">
      <div className="page-header">
        <div className="header-content">
          <h1>🔐 Data Breach Security Center</h1>
          <p>Monitor and protect your digital accounts from security breaches</p>
          
          {breachStatus?.lastChecked && (
            <div className="last-check-info">
              <span className="last-check-label">Last security scan:</span>
              <span className="last-check-date">{formatDate(breachStatus.lastChecked)}</span>
              {breachStatus.securityScore && (
                <span 
                  className="security-score-badge"
                  style={{ '--score-color': breachStatus.securityScore >= 80 ? '#28a745' : breachStatus.securityScore >= 60 ? '#fd7e14' : '#dc3545' }}
                >
                  Security Score: {breachStatus.securityScore}/100
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      {breachStatus && (
        <div className="quick-stats">
          <div className="stat-item">
            <span className="stat-number">{breachStatus.totalSubscriptions}</span>
            <span className="stat-label">Total Services</span>
          </div>
          <div className="stat-item safe">
            <span className="stat-number">{breachStatus.safeSubscriptions}</span>
            <span className="stat-label">Safe Services</span>
          </div>
          <div className="stat-item breached">
            <span className="stat-number">{breachStatus.breachedSubscriptions}</span>
            <span className="stat-label">Breached Services</span>
          </div>
        </div>
      )}

      {/* Main Breach Check Component */}
      <BreachCheck 
        subscriptions={subscriptions}
        onBreachCheckComplete={handleBreachCheckComplete}
      />

      {/* Services List with Breach Status */}
      {subscriptions.length > 0 && (
        <div className="services-list">
          <div className="list-header">
            <h2>📊 Your Services Security Status</h2>
            <p>Review the security status of all your connected services</p>
          </div>

          <div className="services-grid">
            {subscriptions.map((service) => (
              <div 
                key={service.id} 
                className={`service-card ${service.breachStatus?.isBreached ? 'breached' : 'safe'}`}
              >
                <div className="service-header">
                  <div className="service-info">
                    <h3>{service.serviceName}</h3>
                    <span className="service-domain">{service.domain}</span>
                  </div>
                  <div className="status-indicator">
                    <div 
                      className="status-dot"
                      style={{ backgroundColor: getStatusColor(service.breachStatus?.isBreached) }}
                    ></div>
                  </div>
                </div>

                <div className="service-details">
                  <div className="detail-row">
                    <span className="detail-label">Category:</span>
                    <span className="detail-value">{service.category}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Emails:</span>
                    <span className="detail-value">{service.emailCount}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Last Email:</span>
                    <span className="detail-value">{formatDate(service.lastEmail)}</span>
                  </div>
                </div>

                {service.breachStatus?.isBreached && (
                  <div className="breach-alert">
                    <div className="breach-severity">
                      {(() => {
                        const badge = getSeverityBadge(service.breachStatus.severity);
                        return (
                          <span 
                            className="severity-badge"
                            style={{ color: badge.color }}
                          >
                            {badge.icon} {badge.label}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="breach-info">
                      <strong>{service.breachStatus.breachName}</strong>
                      <p>Breached: {formatDate(service.breachStatus.breachDate)}</p>
                    </div>
                    {service.breachStatus.dataClasses && service.breachStatus.dataClasses.length > 0 && (
                      <div className="exposed-data">
                        <span className="exposed-label">Data exposed:</span>
                        <div className="data-chips">
                          {service.breachStatus.dataClasses.slice(0, 3).map((dataClass, index) => (
                            <span key={index} className="data-chip">{dataClass}</span>
                          ))}
                          {service.breachStatus.dataClasses.length > 3 && (
                            <span className="data-chip more">+{service.breachStatus.dataClasses.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!service.breachStatus?.isBreached && (
                  <div className="safe-indicator">
                    <span className="safe-icon">✅</span>
                    <span className="safe-text">No known breaches detected</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Tips */}
      <div className="security-tips">
        <h2>🛡️ Security Best Practices</h2>
        <div className="tips-grid">
          <div className="tip-card">
            <span className="tip-icon">🔑</span>
            <h3>Use Unique Passwords</h3>
            <p>Create strong, unique passwords for each service to limit breach impact.</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon">📱</span>
            <h3>Enable 2FA</h3>
            <p>Add two-factor authentication wherever possible for extra security.</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon">🔍</span>
            <h3>Regular Monitoring</h3>
            <p>Check for breaches regularly and act quickly when they're discovered.</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon">🗑️</span>
            <h3>Clean Up Unused Accounts</h3>
            <p>Delete accounts you no longer use to reduce your attack surface.</p>
          </div>
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
};

export default BreachCheckPage;
