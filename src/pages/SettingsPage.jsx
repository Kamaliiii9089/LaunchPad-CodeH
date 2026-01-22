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

  // 2FA State
  const [twoFactorData, setTwoFactorData] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [recoveryCodesStatus, setRecoveryCodesStatus] = useState(null);
  const [regenerateCode, setRegenerateCode] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

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

  const addRule = () => {
    if (!ruleInput.trim()) return;
    const list = activeRuleTab;
    const currentList = preferencesForm[list] || [];
    if (currentList.includes(ruleInput.trim())) return;

    setPreferencesForm({
      ...preferencesForm,
      [list]: [...currentList, ruleInput.trim()]
    });
    setRuleInput('');
  };

  const removeRule = (list, item) => {
    setPreferencesForm({
      ...preferencesForm,
      [list]: (preferencesForm[list] || []).filter(i => i !== item)
    });
  };



  const initiate2FA = async () => {
    try {
      const res = await api.post('/auth/2fa/setup');
      setTwoFactorData(res.data);
      setShow2FASetup(true);
      setError('');
    } catch (err) {
      setError('Failed to initiate 2FA setup');
    }
  };

  const confirm2FA = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!twoFactorCode || twoFactorCode.length !== 6) {
        setError('Please enter a valid 6-digit code');
        setLoading(false);
        return;
      }

      console.log('Verifying 2FA with code:', twoFactorCode);
      const response = await api.post('/auth/2fa/verify', { token: twoFactorCode });
      console.log('2FA verification response:', response.data);
      
      // Store recovery codes if returned
      if (response.data.recoveryCodes) {
        setRecoveryCodes(response.data.recoveryCodes);
        setShowRecoveryCodes(true);
      }
      
      setMessage('2FA Enabled Successfully! Please save your recovery codes.');
      setShow2FASetup(false);
      setTwoFactorData(null);
      setTwoFactorCode('');
      
      // Don't reload immediately so user can see recovery codes
    } catch (err) {
      console.error('2FA verification error:', err);
      console.error('Error response:', err.response?.data);
      setError('Invalid code: ' + (err.response?.data?.message || 'Try again'));
    } finally {
      setLoading(false);
    }
  };

  const downloadRecoveryCodes = () => {
    const content = `LaunchPad Recovery Codes\n\nGenerated: ${new Date().toLocaleString()}\n\nRecovery Codes:\n${recoveryCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}\n\nImportant:\n- Keep these codes in a safe place\n- Each code can only be used once\n- Use these codes if you lose access to your authenticator app\n- Generate new codes if you lose these`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `launchpad-recovery-codes-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const closeRecoveryCodes = () => {
    setShowRecoveryCodes(false);
    setRecoveryCodes([]);
    window.location.reload();
  };

  const fetchRecoveryCodesStatus = async () => {
    try {
      const response = await authAPI.getRecoveryCodesStatus();
      setRecoveryCodesStatus(response.data);
    } catch (err) {
      console.error('Failed to fetch recovery codes status:', err);
    }
  };

  const regenerateRecoveryCodes = async () => {
    try {
      const response = await authAPI.regenerateRecoveryCodes(regenerateCode);
      setRecoveryCodes(response.data.recoveryCodes);
      setShowRecoveryCodes(true);
      setIsRegenerating(false);
      setRegenerateCode('');
      setMessage('Recovery codes regenerated successfully');
      fetchRecoveryCodesStatus();
    } catch (err) {
      setError('Failed to regenerate recovery codes: ' + (err.response?.data?.message || 'Try again'));
    }
  };

  // Fetch recovery codes status when user has 2FA enabled
  React.useEffect(() => {
    if (user?.is2FAEnabled) {
      fetchRecoveryCodesStatus();
    }
  }, [user?.is2FAEnabled]);

  const disable2FA = async () => {
    try {
      await api.post('/auth/2fa/disable', { token: disableCode });
      setMessage('2FA Disabled');
      setIsDisabling(false);
      window.location.reload();
    } catch (err) {
      setError('Invalid code: ' + (err.response?.data?.message || 'Try again'));
    }
  };

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
                  <div>
                    <div className="security-status enabled" style={{ padding: '1rem', background: '#f0fff4', borderRadius: '8px', border: '1px solid #c6f6d5', color: '#2f855a', marginBottom: '1rem' }}>
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

                    {/* Recovery Codes Section */}
                    <div className="recovery-codes-section" style={{ padding: '1rem', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                      <h4 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FiKey /> Recovery Codes
                      </h4>
                      <p style={{ color: '#78350f', fontSize: '0.875rem', marginBottom: '1rem' }}>
                        Recovery codes can be used to access your account if you lose your authenticator device. Each code can only be used once.
                      </p>
                      {recoveryCodesStatus && (
                        <div style={{ marginBottom: '1rem' }}>
                          <p style={{ fontWeight: 'bold', color: recoveryCodesStatus.remainingCodes < 3 ? '#dc2626' : '#059669' }}>
                            Remaining codes: {recoveryCodesStatus.remainingCodes} / 10
                          </p>
                          {recoveryCodesStatus.remainingCodes < 3 && (
                            <p style={{ color: '#dc2626', fontSize: '0.875rem' }}>
                              ⚠️ Warning: You have less than 3 recovery codes remaining. Consider regenerating them.
                            </p>
                          )}
                        </div>
                      )}
                      {isRegenerating ? (
                        <div className="verify-box">
                          <p style={{ marginBottom: '0.5rem', color: '#2d3748', fontSize: '0.875rem' }}>
                            Enter your authenticator code to regenerate recovery codes:
                          </p>
                          <div className="input-group" style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                              className="form-control"
                              value={regenerateCode}
                              onChange={e => setRegenerateCode(e.target.value)}
                              placeholder="000000"
                              maxLength={6}
                              style={{ fontSize: '0.875rem' }}
                            />
                            <button onClick={regenerateRecoveryCodes} className="btn btn-primary btn-sm">
                              Regenerate
                            </button>
                            <button onClick={() => setIsRegenerating(false)} className="btn btn-secondary btn-sm">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setIsRegenerating(true)} className="btn btn-warning btn-sm">
                          Regenerate Recovery Codes
                        </button>
                      )}
                    </div>
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
                    <div className="setup-2fa-box" style={{ 
                      padding: '1.5rem', 
                      background: '#ffffff', 
                      borderRadius: '8px', 
                      border: '2px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      <h4 style={{ marginTop: 0, color: '#2d3748', fontSize: '1.25rem' }}>Scan QR Code</h4>
                      <p style={{ color: '#4a5568', marginBottom: '0.5rem' }}>1. Open Google Authenticator or Authy app.</p>
                      <p style={{ color: '#4a5568', marginBottom: '1rem' }}>2. Scan the image below:</p>

                      <div style={{ 
                        margin: '1.5rem 0', 
                        background: 'white', 
                        padding: '1.5rem', 
                        display: 'inline-block', 
                        borderRadius: '8px',
                        border: '3px solid #667eea',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)'
                      }}>
                        <img src={twoFactorData?.qrCode} alt="QR Code" style={{ width: '180px', height: '180px', display: 'block' }} />
                      </div>

                      <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#718096', fontWeight: '500' }}>Or enter secret manually:</p>
                        <div style={{ 
                          background: '#edf2f7', 
                          padding: '0.75rem 1rem', 
                          borderRadius: '6px', 
                          border: '2px solid #cbd5e0',
                          fontFamily: 'monospace',
                          fontSize: '1rem',
                          fontWeight: 'bold',
                          color: '#2d3748',
                          letterSpacing: '0.1em',
                          wordBreak: 'break-all',
                          userSelect: 'all',
                          cursor: 'text'
                        }}>
                          {twoFactorData?.secret}
                        </div>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#a0aec0', fontStyle: 'italic' }}>
                          Click to select and copy
                        </p>
                      </div>

                      <p style={{ color: '#4a5568', fontWeight: '500', marginBottom: '0.75rem' }}>3. Enter the 6-digit code to verify:</p>
                      <div className="input-group" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'stretch' }}>
                        <input
                          className="form-control"
                          value={twoFactorCode}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (val.length <= 6) setTwoFactorCode(val);
                          }}
                          placeholder="000000"
                          maxLength={6}
                          disabled={loading}
                          style={{
                            fontSize: '1.25rem',
                            fontWeight: 'bold',
                            letterSpacing: '0.3em',
                            textAlign: 'center',
                            fontFamily: 'monospace',
                            padding: '0.75rem'
                          }}
                        />
                        <button 
                          onClick={confirm2FA} 
                          className="btn btn-success" 
                          style={{ minWidth: '140px' }}
                          disabled={loading || twoFactorCode.length !== 6}
                        >
                          {loading ? <LoadingSpinner size="small" color="white" /> : 'Verify & Enable'}
                        </button>
                      </div>
                      <button onClick={() => setShow2FASetup(false)} className="btn btn-secondary btn-sm" disabled={loading}>Cancel Setup</button>
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

        {/* Recovery Codes Modal */}
        {showRecoveryCodes && recoveryCodes.length > 0 && (
          <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}>
            <div className="modal-content" style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FiKey /> Recovery Codes
              </h2>
              
              <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <p style={{ margin: 0, color: '#78350f', fontWeight: 'bold' }}>
                  ⚠️ Important: Save these codes in a safe place!
                </p>
                <p style={{ margin: '0.5rem 0 0 0', color: '#78350f', fontSize: '0.875rem' }}>
                  Each code can only be used once. You won't be able to see them again.
                </p>
              </div>

              <div style={{
                background: '#f8fafc',
                padding: '1.5rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                fontFamily: 'monospace'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {recoveryCodes.map((code, index) => (
                    <div key={index} style={{
                      background: 'white',
                      padding: '0.75rem',
                      borderRadius: '4px',
                      border: '1px solid #e2e8f0',
                      textAlign: 'center',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      letterSpacing: '0.05em'
                    }}>
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button onClick={downloadRecoveryCodes} className="btn btn-secondary">
                  Download Codes
                </button>
                <button onClick={closeRecoveryCodes} className="btn btn-primary">
                  I've Saved These Codes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
