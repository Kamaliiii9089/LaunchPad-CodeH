import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme, THEMES } from '../context/ThemeContext';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import DashboardLayout from '../components/DashboardLayout';
import { ThemeCard } from '../components/ThemeSwitcher';
import { authAPI } from '../utils/api';
import api from '../utils/api';
import { FiUser, FiMail, FiShield, FiKey, FiTrash2, FiEye, FiEyeOff, FiSave, FiSun } from 'react-icons/fi';
import './SettingsPage.css';

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme, resetTheme, availableThemes } = useTheme();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
    twoFactorAuth: false
  });

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
      await api.put('/auth/preferences', preferencesForm);
      setMessage('Preferences updated successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

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

            {/* Theme Customizer */}
            <div className="settings-card theme-customizer-card">
              <div className="card-header">
                <FiSun className="card-icon" />
                <div>
                  <h3>Theme Customizer</h3>
                  <p>Personalize your BreachBuddy experience</p>
                </div>
              </div>
              <div className="settings-form">
                <div className="theme-grid">
                  {Object.keys(availableThemes).map((themeId) => (
                    <ThemeCard
                      key={themeId}
                      themeId={themeId}
                      onSelect={setTheme}
                    />
                  ))}
                </div>
                <div className="theme-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={resetTheme}
                  >
                    Reset to Default
                  </button>
                </div>
              </div>
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

                <div className="form-group">
                  <div className="checkbox-group">
                    <input
                      type="checkbox"
                      id="twoFactorAuth"
                      checked={preferencesForm.twoFactorAuth}
                      onChange={(e) => setPreferencesForm({
                        ...preferencesForm,
                        twoFactorAuth: e.target.checked
                      })}
                    />
                    <label htmlFor="twoFactorAuth">
                      <strong>Two-Factor Authentication</strong>
                      <span>Enable 2FA for enhanced account security</span>
                    </label>
                  </div>
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
