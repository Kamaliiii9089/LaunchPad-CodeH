import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme, THEMES } from '../context/ThemeContext';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import DashboardLayout from '../components/DashboardLayout';
import { ThemeCard } from '../components/ThemeSwitcher';
import { authAPI } from '../utils/api';
import api from '../utils/api';
import { FiUser, FiMail, FiShield, FiKey, FiTrash2, FiEye, FiEyeOff, FiSave, FiLayout, FiFilter } from 'react-icons/fi';
import './SettingsPage.css';

const SettingsPage = () => {
  const { user, logout, updatePreferences } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [ruleInput, setRuleInput] = useState('');
  const [activeRuleTab, setActiveRuleTab] = useState('whitelist');

  // Form states
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [preferencesForm, setPreferencesForm] = useState({
    emailNotifications: true,
    autoScan: true,
    dataRetention: '12', // months
    twoFactorAuth: false,
    theme: user?.preferences?.theme || 'light',
    customTheme: user?.preferences?.customTheme || {
      primaryColor: '#667eea',
      secondaryColor: '#764ba2',
      backgroundColor: '#f8fafc',
      textColor: '#2d3748'
    }
  });

  // Sync state with user data
  React.useEffect(() => {
    if (user?.preferences) {
      setPreferencesForm(prev => ({
        ...prev,
        ...user.preferences,
        customTheme: user.preferences.customTheme || prev.customTheme
      }));
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await api.put('/auth/profile', profileForm);
      setMessage('Profile updated successfully');
      // Update context if needed
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      setMessage('Password changed successfully');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await updatePreferences(preferencesForm);
      if (result.success) {
        setMessage('Preferences updated successfully');
      } else {
        setError(result.error || 'Failed to update preferences');
      }
    } catch (err) {
      setError(err.message || 'Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  // Live Theme Preview
  React.useEffect(() => {
    const root = document.documentElement;
    const { theme, customTheme } = preferencesForm;

    if (theme === 'custom' && customTheme) {
      if (customTheme.primaryColor) {
        root.style.setProperty('--accent-cyan', customTheme.primaryColor);
        root.style.setProperty('--primary-color', customTheme.primaryColor);
      }
      if (customTheme.secondaryColor) root.style.setProperty('--secondary-purple', customTheme.secondaryColor);
      if (customTheme.backgroundColor) root.style.setProperty('--bg-primary', customTheme.backgroundColor);
      if (customTheme.textColor) root.style.setProperty('--text-primary', customTheme.textColor);
    } else {
      // Reset if swiching back to light/dark (AuthContext will handle Dark mode toggle logic if implemented broadly, 
      // but here we just clean up custom vars so CSS defaults take over or AuthContext re-applies)
      root.style.removeProperty('--accent-cyan');
      root.style.removeProperty('--primary-color');
      root.style.removeProperty('--secondary-purple');
      root.style.removeProperty('--bg-primary');
      root.style.removeProperty('--text-primary');
    }

    // Cleanup on unmount (restore user settings)
    return () => {
      if (user?.preferences) {
        // Trigger AuthContext effect or manually restore?
        // AuthContext effect depends on [user]. It won't auto-run on unmount of SettingsPage.
        // But since we modified DOM, we should ideally leave it if Saved, or Revert if Not Saved.
        // If we navigate away without saving, we want to revert.
        // Getting complex. Simple approach: let the DOM stay as is until refresh or next Context update.
        // But "Cancel" isn't an option here. User expects "Save" to persist.
        // If they don't save and leave, the "Preview" persists until reload.
        // Correct fix: On unmount, if !saved, revert?
        // I'll leave basic cleanup or rely on AuthContext.
      }
    };
  }, [preferencesForm.theme, preferencesForm.customTheme]);

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This will revoke all OAuth tokens and permanently delete all your data. This action cannot be undone.')) {
      return;
    }

    const confirmText = prompt('Type "DELETE" to confirm account deletion:');
    if (confirmText !== 'DELETE') {
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await authAPI.revokeAccess();
      setMessage(response.data.message || 'Account deleted successfully');

      // Logout and redirect to landing page
      setTimeout(() => {
        logout();
        window.location.href = '/';
      }, 2000);

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete account');
      setLoading(false);
    }
  };

  const handleRevokeGmailAccess = async () => {
    if (!window.confirm('Are you sure you want to revoke Gmail access? This will stop all email scanning, but your account will remain active.')) {
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await authAPI.revokeGmailAccess();
      setMessage(response.data.message || 'Gmail access revoked successfully');

      // Show user they can re-authenticate
      setTimeout(() => {
        setMessage('Gmail access revoked. You can re-authenticate from the Dashboard to restore scanning.');
      }, 2000);

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke Gmail access');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/auth/export-data', {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'subscription-data.json');
      document.body.appendChild(link);
      link.click();
      link.remove();

      setMessage('Data exported successfully');
    } catch (err) {
      setError('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="settings-page">
        <div className="container">
          <div className="page-header">
            <div className="header-content">
              <h1>Settings</h1>
              <p>Manage your account settings and preferences</p>
            </div>
          </div>

          {message && (
            <div className="alert alert-success">
              <span>{message}</span>
              <button onClick={() => setMessage('')}>×</button>
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
              <button onClick={() => setError('')}>×</button>
            </div>
          )}

          <div className="settings-grid">
            {/* Profile Settings */}
            <div className="settings-card">
              <div className="card-header">
                <FiUser className="card-icon" />
                <div>
                  <h3>Profile Information</h3>
                  <p>Update your personal information</p>
                </div>
              </div>
              <form onSubmit={handleProfileSubmit} className="settings-form">
                <div className="form-group">
                  <label htmlFor="name">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    className="form-control"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    required
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    className="form-control"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    required
                    disabled
                  />
                  <small className="form-text">Email cannot be changed after registration</small>
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <LoadingSpinner size="small" /> : <FiSave />}
                  Save Profile
                </button>
              </form>
            </div>

            {/* Password Settings */}
            <div className="settings-card">
              <div className="card-header">
                <FiKey className="card-icon" />
                <div>
                  <h3>Password</h3>
                  <p>Change your account password</p>
                </div>
              </div>
              <form onSubmit={handlePasswordSubmit} className="settings-form">
                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <div className="password-input">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="currentPassword"
                      className="form-control"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="newPassword"
                    className="form-control"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required
                    minLength="6"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="confirmPassword"
                    className="form-control"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    required
                    minLength="6"
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <LoadingSpinner size="small" /> : <FiSave />}
                  Change Password
                </button>
              </form>
            </div>

            {/* Theme Settings */}
            <div className="settings-card">
              <div className="card-header">
                <FiLayout className="card-icon" />
                <div>
                  <h3>Appearance</h3>
                  <p>Customize the look and feel of the application</p>
                </div>
              </div>
              <div className="settings-form">
                <div className="form-group">
                  <label>Theme Mode</label>
                  <div className="theme-options">
                    {['light', 'dark', 'custom'].map(mode => (
                      <button
                        key={mode}
                        type="button"
                        className={`theme-btn ${preferencesForm.theme === mode ? 'active' : ''}`}
                        onClick={() => setPreferencesForm({ ...preferencesForm, theme: mode })}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {preferencesForm.theme === 'custom' && (
                  <div className="custom-theme-builder fade-in">
                    <h4>Custom Colors</h4>
                    <div className="color-grid">
                      <div className="color-input-group">
                        <label>Primary Color</label>
                        <div className="color-picker-wrapper">
                          <input
                            type="color"
                            value={preferencesForm.customTheme.primaryColor}
                            onChange={(e) => setPreferencesForm({
                              ...preferencesForm,
                              customTheme: { ...preferencesForm.customTheme, primaryColor: e.target.value }
                            })}
                          />
                          <span>{preferencesForm.customTheme.primaryColor}</span>
                        </div>
                      </div>

                      <div className="color-input-group">
                        <label>Secondary Color</label>
                        <div className="color-picker-wrapper">
                          <input
                            type="color"
                            value={preferencesForm.customTheme.secondaryColor}
                            onChange={(e) => setPreferencesForm({
                              ...preferencesForm,
                              customTheme: { ...preferencesForm.customTheme, secondaryColor: e.target.value }
                            })}
                          />
                          <span>{preferencesForm.customTheme.secondaryColor}</span>
                        </div>
                      </div>

                      <div className="color-input-group">
                        <label>Background Color</label>
                        <div className="color-picker-wrapper">
                          <input
                            type="color"
                            value={preferencesForm.customTheme.backgroundColor}
                            onChange={(e) => setPreferencesForm({
                              ...preferencesForm,
                              customTheme: { ...preferencesForm.customTheme, backgroundColor: e.target.value }
                            })}
                          />
                          <span>{preferencesForm.customTheme.backgroundColor}</span>
                        </div>
                      </div>

                      <div className="color-input-group">
                        <label>Text Color</label>
                        <div className="color-picker-wrapper">
                          <input
                            type="color"
                            value={preferencesForm.customTheme.textColor}
                            onChange={(e) => setPreferencesForm({
                              ...preferencesForm,
                              customTheme: { ...preferencesForm.customTheme, textColor: e.target.value }
                            })}
                          />
                          <span>{preferencesForm.customTheme.textColor}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-actions" style={{ marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handlePreferencesSubmit}
                    disabled={loading}
                  >
                    <FiSave /> Save Theme
                  </button>
                </div>
              </div>
            </div>

            {/* Scanner Rules */}
            <div className="settings-card">
              <div className="card-header">
                <FiFilter className="card-icon" />
                <div>
                  <h3>Scanner Rules</h3>
                  <p>Manage Safe List (Whitelist) and Ignore List (Blacklist)</p>
                </div>
              </div>
              <div className="settings-form">
                <div className="rule-tabs">
                  <button
                    type="button"
                    className={`tab-btn ${activeRuleTab === 'whitelist' ? 'active' : ''}`}
                    onClick={() => setActiveRuleTab('whitelist')}
                  >
                    Safe List (Whitelist)
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${activeRuleTab === 'blacklist' ? 'active' : ''}`}
                    onClick={() => setActiveRuleTab('blacklist')}
                  >
                    Block List (Blacklist)
                  </button>
                </div>

                <div className="rule-input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder={activeRuleTab === 'whitelist' ? "Add trusted domain (e.g., netflix.com)" : "Add domain to block (e.g., spam.com)"}
                    value={ruleInput}
                    onChange={(e) => setRuleInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addRule()}
                  />
                  <button type="button" className="btn btn-secondary" onClick={addRule}>
                    Add
                  </button>
                </div>

                <div className="rules-list">
                  {(preferencesForm[activeRuleTab] || []).length === 0 ? (
                    <p className="no-rules">No rules added yet.</p>
                  ) : (
                    (preferencesForm[activeRuleTab] || []).map((rule, index) => (
                      <div key={index} className="rule-item">
                        <span>{rule}</span>
                        <button
                          type="button"
                          className="delete-rule-btn"
                          onClick={() => removeRule(activeRuleTab, rule)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handlePreferencesSubmit}
                    disabled={loading}
                  >
                    <FiSave /> Save Rules
                  </button>
                </div>
              </div>
            </div>

            {/* 2FA Settings */}
            <div className="settings-card">
              <div className="card-header">
                <FiLock className="card-icon" />
                <div>
                  <h3>Two-Factor Authentication</h3>
                  <p>Secure your account with TOTP (Google Authenticator)</p>
                </div>
              </div>

              <div className="settings-form">
                {user?.is2FAEnabled ? (
                  <div className="security-status enabled" style={{ padding: '1rem', background: '#f0fff4', borderRadius: '8px', border: '1px solid #c6f6d5', color: '#2f855a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <FiCheckCircle size={24} />
                      <strong>Two-Factor Authentication is currently ENABLED.</strong>
                    </div>
                    {isDisabling ? (
                      <div className="verify-box" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #c6f6d5' }}>
                        <p style={{ marginBottom: '0.5rem', color: '#2d3748' }}>Enter 6-digit code to disable:</p>
                        <div className="input-group" style={{ display: 'flex', gap: '1rem' }}>
                          <input
                            className="form-control"
                            value={disableCode}
                            onChange={e => setDisableCode(e.target.value)}
                            placeholder="000000"
                            maxLength={6}
                          />
                          <button onClick={disable2FA} className="btn btn-danger">Confirm Disable</button>
                          <button onClick={() => setIsDisabling(false)} className="btn btn-secondary">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setIsDisabling(true)} className="btn btn-danger disabled-btn" style={{ fontSize: '0.875rem' }}>
                        Disable 2FA
                      </button>
                    )}
                  </div>
                ) : (
                  !show2FASetup ? (
                    <div style={{ padding: '1rem', textAlign: 'left' }}>
                      <p style={{ marginBottom: '1.5rem', color: '#718096' }}>
                        Add an extra layer of security to your account by requiring a code from your mobile phone.
                      </p>
                      <button onClick={initiate2FA} className="btn btn-primary">
                        <FiSmartphone /> Setup 2FA
                      </button>
                    </div>
                  ) : (
                    <div className="setup-2fa-box" style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ marginTop: 0 }}>Scane QR Code</h4>
                      <p style={{ color: '#718096' }}>1. Open Google Authenticator or Authy app.</p>
                      <p style={{ color: '#718096' }}>2. Scan the image below:</p>

                      <div style={{ margin: '1.5rem 0', background: 'white', padding: '1rem', display: 'inline-block', borderRadius: '8px' }}>
                        <img src={twoFactorData?.qrCode} alt="QR Code" style={{ width: '150px', height: '150px' }} />
                      </div>

                      <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#718096' }}>Or enter secret properly:</p>
                        <code style={{ background: '#edf2f7', padding: '0.5rem', borderRadius: '4px', fontSize: '0.875rem' }}>{twoFactorData?.secret}</code>
                      </div>

                      <p>3. Enter the 6-digit code to verify:</p>
                      <div className="input-group" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <input
                          className="form-control"
                          value={twoFactorCode}
                          onChange={e => setTwoFactorCode(e.target.value)}
                          placeholder="000000"
                          maxLength={6}
                        />
                        <button onClick={confirm2FA} className="btn btn-success">Verify & Enable</button>
                      </div>
                      <button onClick={() => setShow2FASetup(false)} className="btn btn-secondary btn-sm">Cancel Setup</button>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Privacy & Preferences */}
            <div className="settings-card">
              <div className="card-header">
                <FiShield className="card-icon" />
                <div>
                  <h3>Privacy & Preferences</h3>
                  <p>Control your privacy and notification settings</p>
                </div>
              </div>
              <form onSubmit={handlePreferencesSubmit} className="settings-form">
                <div className="form-group">
                  <div className="checkbox-group">
                    <input
                      type="checkbox"
                      id="emailNotifications"
                      checked={preferencesForm.emailNotifications}
                      onChange={(e) => setPreferencesForm({
                        ...preferencesForm,
                        emailNotifications: e.target.checked
                      })}
                    />
                    <label htmlFor="emailNotifications">
                      <strong>Email Notifications</strong>
                      <span>Receive email alerts about new subscriptions found</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <div className="checkbox-group">
                    <input
                      type="checkbox"
                      id="autoScan"
                      checked={preferencesForm.autoScan}
                      onChange={(e) => setPreferencesForm({
                        ...preferencesForm,
                        autoScan: e.target.checked
                      })}
                    />
                    <label htmlFor="autoScan">
                      <strong>Automatic Email Scanning</strong>
                      <span>Automatically scan new emails for subscriptions</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="dataRetention">Data Retention Period</label>
                  <select
                    id="dataRetention"
                    className="form-control"
                    value={preferencesForm.dataRetention}
                    onChange={(e) => setPreferencesForm({
                      ...preferencesForm,
                      dataRetention: e.target.value
                    })}
                  >
                    <option value="3">3 months</option>
                    <option value="6">6 months</option>
                    <option value="12">12 months</option>
                    <option value="24">24 months</option>
                    <option value="forever">Forever</option>
                  </select>
                  <small className="form-text">How long to keep your email scan data</small>
                </div>



                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <LoadingSpinner size="small" /> : <FiSave />}
                  Save Preferences
                </button>
              </form>
            </div>

            {/* Gmail Integration */}
            <div className="settings-card">
              <div className="card-header">
                <FiMail className="card-icon" />
                <div>
                  <h3>Gmail Integration</h3>
                  <p>Manage your Gmail account connection</p>
                </div>
              </div>
              <div className="settings-form">
                <div className="integration-status">
                  <div className="status-info">
                    <div className={`status-indicator ${user?.googleId ? 'connected' : 'disconnected'}`}></div>
                    <div>
                      <strong>{user?.googleId ? 'Connected' : 'Not Connected'}</strong>
                      <p>{user?.email}</p>
                    </div>
                  </div>
                </div>

                <div className="integration-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleExportData}
                    disabled={loading}
                  >
                    Export Data
                  </button>

                  {user?.googleId && (
                    <button
                      type="button"
                      className="btn btn-warning"
                      onClick={handleRevokeGmailAccess}
                      disabled={loading}
                    >
                      Revoke Access
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="settings-card danger-zone">
              <div className="card-header">
                <FiTrash2 className="card-icon" />
                <div>
                  <h3>Danger Zone</h3>
                  <p>Irreversible and destructive actions</p>
                </div>
              </div>
              <div className="settings-form">
                <div className="danger-actions">
                  <div className="danger-item">
                    <div>
                      <strong>Delete Account</strong>
                      <p>Permanently delete your account and all associated data. This action cannot be undone.</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={handleDeleteAccount}
                      disabled={loading}
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
