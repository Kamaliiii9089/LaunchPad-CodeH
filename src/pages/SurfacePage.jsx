import React, { useState } from 'react';
import {
  FiGlobe,
  FiActivity,
  FiAlertTriangle,
  FiZap,
  FiRefreshCw,
  FiAlertCircle,
  FiShield,
  FiSearch,
  FiDatabase,
  FiEye,
  FiTarget
} from 'react-icons/fi';
import DashboardLayout from '../components/DashboardLayout';
import './SurfacePage.css';

const SurfacePage = () => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [scanInput, setScanInput] = useState('');
  const [scanResults, setScanResults] = useState(null);
  const [detailedResults, setDetailedResults] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);

  const handleQuickScan = async () => {
    if (!scanInput.trim()) {
      setError('Please enter a domain to scan');
      return;
    }

    try {
      setScanning(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/surface/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ domain: scanInput.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Surface scan failed`);
      }

      const result = await response.json();
      
      // The API returns { success: true, data: {...} }
      const scanData = result.data || result;
      setScanResults(scanData);
      
      // Add to scan history
      setScanHistory(prev => [scanData, ...prev.slice(0, 4)]);
      
    } catch (error) {
      console.error('Surface scan error:', error);
      setError(error.message || 'Failed to scan domain');
    } finally {
      setScanning(false);
    }
  };

  const handleDetailedScan = async () => {
    if (!scanInput.trim()) {
      setError('Please enter a domain to scan');
      return;
    }

    try {
      setScanning(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/surface/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ domain: scanInput.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Detailed scan failed`);
      }

      const result = await response.json();
      
      // The API returns { success: true, data: {...} }
      const scanData = result.data || result;
      setDetailedResults(scanData);
      
    } catch (error) {
      console.error('Detailed scan error:', error);
      setError(error.message || 'Failed to perform detailed scan');
    } finally {
      setScanning(false);
    }
  };

  const getRiskColor = (score) => {
    if (score >= 8) return '#ea4335'; // High risk - red
    if (score >= 5) return '#fbbc04'; // Medium risk - yellow
    return '#34a853'; // Low risk - green
  };

  const getRiskLabel = (score) => {
    if (score >= 8) return 'High Risk';
    if (score >= 5) return 'Medium Risk';
    return 'Low Risk';
  };

  return (
    <DashboardLayout>
      <div className="surface-page">
        {/* Header */}
        <div className="surface-header">
          <div className="header-content">
            <h1>
              <FiGlobe className="header-icon" />
              API Surface Scanner
            </h1>
            <p className="header-subtitle">
              Discover and analyze API endpoints, subdomains, and security vulnerabilities across any domain
            </p>
          </div>
        </div>

        {/* Scan Input Section */}
        <div className="scan-section">
          <div className="scan-card">
            <div className="scan-input-area">
              <div className="input-group">
                <div className="input-wrapper">
                  <FiGlobe className="input-icon" />
                  <input
                    type="text"
                    placeholder="Enter domain to scan (e.g., example.com)"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    className="domain-input"
                    onKeyPress={(e) => e.key === 'Enter' && handleQuickScan()}
                  />
                </div>
                <div className="scan-buttons">
                  <button
                    className={`btn btn-primary ${scanning ? 'loading' : ''}`}
                    onClick={handleQuickScan}
                    disabled={scanning || !scanInput.trim()}
                  >
                    {scanning ? (
                      <>
                        <FiRefreshCw className="spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <FiZap />
                        Quick Scan
                      </>
                    )}
                  </button>
                  <button
                    className={`btn btn-secondary ${scanning ? 'loading' : ''}`}
                    onClick={handleDetailedScan}
                    disabled={scanning || !scanInput.trim()}
                  >
                    {scanning ? (
                      <>
                        <FiRefreshCw className="spin" />
                        Deep Scanning...
                      </>
                    ) : (
                      <>
                        <FiSearch />
                        Deep Scan
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="alert alert-error">
                <FiAlertCircle />
                {error}
                <button className="btn btn-sm" onClick={() => setError(null)}>
                  ×
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Scan Results */}
        {scanResults && (
          <div className="results-section">
            <div className="section-header">
              <h3>Quick Scan Results</h3>
              <div className="scan-timestamp">
                {new Date(scanResults.timestamp).toLocaleString()}
              </div>
            </div>

            <div className="quick-results-grid">
              <div className="result-card overview">
                <div className="card-header">
                  <h4>
                    <FiTarget />
                    Domain Overview
                  </h4>
                </div>
                <div className="overview-stats">
                  <div className="overview-stat">
                    <FiGlobe />
                    <div className="stat-info">
                      <span className="stat-label">Subdomains</span>
                      <span className="stat-value">{scanResults.subdomains}</span>
                    </div>
                  </div>
                  <div className="overview-stat">
                    <FiActivity />
                    <div className="stat-info">
                      <span className="stat-label">Endpoints</span>
                      <span className="stat-value">{scanResults.endpoints}</span>
                    </div>
                  </div>
                  <div className="overview-stat">
                    <FiAlertTriangle />
                    <div className="stat-info">
                      <span className="stat-label">Vulnerabilities</span>
                      <span className="stat-value">{scanResults.vulnerabilities}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="result-card risk-assessment">
                <div className="card-header">
                  <h4>
                    <FiShield />
                    Risk Assessment
                  </h4>
                </div>
                <div className="risk-score-display">
                  <div 
                    className="risk-score"
                    style={{ color: getRiskColor(scanResults.riskScore) }}
                  >
                    {scanResults.riskScore}/10
                  </div>
                  <div className="risk-label">
                    {getRiskLabel(scanResults.riskScore)}
                  </div>
                </div>
                {scanResults.severityBreakdown && (
                  <div className="severity-breakdown">
                    <div className="severity-item high">
                      <span className="severity-count">{scanResults.severityBreakdown.high}</span>
                      <span className="severity-label">High</span>
                    </div>
                    <div className="severity-item medium">
                      <span className="severity-count">{scanResults.severityBreakdown.medium}</span>
                      <span className="severity-label">Medium</span>
                    </div>
                    <div className="severity-item low">
                      <span className="severity-count">{scanResults.severityBreakdown.low}</span>
                      <span className="severity-label">Low</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {scanResults.topIssues && scanResults.topIssues.length > 0 && (
              <div className="top-issues-section">
                <h4>Critical Security Issues</h4>
                <div className="issues-list">
                  {scanResults.topIssues.map((issue, index) => (
                    <div key={index} className={`issue-item ${issue.severity}`}>
                      <div className="issue-header">
                        <FiAlertTriangle className={`issue-icon ${issue.severity}`} />
                        <span className="issue-title">{issue.title}</span>
                        <span className={`severity-badge ${issue.severity}`}>
                          {issue.severity}
                        </span>
                      </div>
                      <p className="issue-description">{issue.description}</p>
                      <div className="issue-recommendation">
                        <strong>Recommendation:</strong> {issue.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detailed Scan Results */}
        {detailedResults && (
          <div className="detailed-results-section">
            <div className="section-header">
              <h3>Detailed Scan Results</h3>
              <div className="scan-timestamp">
                Complete discovery for {detailedResults.domain || scanInput}
              </div>
            </div>

            <div className="detailed-results-grid">
              {detailedResults.subdomains && detailedResults.subdomains.length > 0 && (
                <div className="result-card">
                  <div className="card-header">
                    <h4>
                      <FiGlobe />
                      Discovered Subdomains ({detailedResults.subdomains.length})
                    </h4>
                  </div>
                  <div className="subdomains-list">
                    {detailedResults.subdomains.slice(0, 10).map((subdomain, index) => (
                      <div key={index} className="subdomain-item">
                        <div className="subdomain-info">
                          <span className="subdomain-name">{subdomain.subdomain}</span>
                          <span className={`status-badge ${subdomain.isActive ? 'active' : 'inactive'}`}>
                            {subdomain.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="subdomain-details">
                          <span className="protocol">{subdomain.protocol?.toUpperCase()}</span>
                          <span className="status-code">HTTP {subdomain.status}</span>
                        </div>
                      </div>
                    ))}
                    {detailedResults.subdomains.length > 10 && (
                      <div className="more-results">
                        +{detailedResults.subdomains.length - 10} more subdomains discovered
                      </div>
                    )}
                  </div>
                </div>
              )}

              {detailedResults.endpoints && detailedResults.endpoints.length > 0 && (
                <div className="result-card">
                  <div className="card-header">
                    <h4>
                      <FiActivity />
                      API Endpoints ({detailedResults.endpoints.length})
                    </h4>
                  </div>
                  <div className="endpoints-list">
                    {detailedResults.endpoints.slice(0, 10).map((endpoint, index) => (
                      <div key={index} className="endpoint-item">
                        <div className="endpoint-info">
                          <span className="endpoint-method">{endpoint.method}</span>
                          <span className="endpoint-path">{endpoint.path}</span>
                        </div>
                        <div className="endpoint-details">
                          <span className={`status-code ${endpoint.responseCode < 400 ? 'success' : 'error'}`}>
                            {endpoint.responseCode}
                          </span>
                          <span className={`auth-status ${endpoint.requiresAuth ? 'protected' : 'public'}`}>
                            {endpoint.requiresAuth ? 'Protected' : 'Public'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {detailedResults.endpoints.length > 10 && (
                      <div className="more-results">
                        +{detailedResults.endpoints.length - 10} more endpoints discovered
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <div className="history-section">
            <div className="section-header">
              <h3>
                <FiDatabase />
                Recent Scans
              </h3>
            </div>
            <div className="history-grid">
              {scanHistory.map((scan, index) => (
                <div key={index} className="history-item" onClick={() => setScanResults(scan)}>
                  <div className="history-header">
                    <span className="domain-name">{scan.domain}</span>
                    <span className="scan-time">
                      {new Date(scan.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="history-stats">
                    <span className="stat">{scan.subdomains} subdomains</span>
                    <span className="stat">{scan.endpoints} endpoints</span>
                    <span 
                      className="risk-indicator"
                      style={{ color: getRiskColor(scan.riskScore) }}
                    >
                      Risk: {scan.riskScore}/10
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SurfacePage;
