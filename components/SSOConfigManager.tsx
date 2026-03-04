'use client';

import { useState, useEffect } from 'react';

interface SSOConfig {
  _id: string;
  name: string;
  type: 'oauth' | 'saml' | 'ldap';
  provider: string;
  enabled: boolean;
  oauthConfig?: any;
  samlConfig?: any;
  ldapConfig?: any;
  domainRestrictions?: string[];
  autoProvision: boolean;
  defaultRole: string;
  usageCount: number;
  lastUsed?: Date;
  createdAt: Date;
}

interface SSOConfigManagerProps {
  toast: any;
}

export default function SSOConfigManager({ toast }: SSOConfigManagerProps) {
  const [configs, setConfigs] = useState<SSOConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SSOConfig | null>(null);
  const [testingConfig, setTestingConfig] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'oauth' as 'oauth' | 'saml' | 'ldap',
    provider: '',
    enabled: true,
    autoProvision: true,
    defaultRole: 'user',
    domainRestrictions: '',
  });

  // OAuth form fields
  const [oauthConfig, setOauthConfig] = useState({
    clientId: '',
    clientSecret: '',
    scope: '',
  });

  // SAML form fields
  const [samlConfig, setSamlConfig] = useState({
    entryPoint: '',
    issuer: '',
    cert: '',
    metadataUrl: '',
  });

  // LDAP form fields
  const [ldapConfig, setLdapConfig] = useState({
    url: '',
    bindDN: '',
    bindCredentials: '',
    searchBase: '',
    searchFilter: '(uid={{username}})',
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/sso', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load SSO configurations');
      }

      const data = await response.json();
      setConfigs(data.configs || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load SSO configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      
      const payload = {
        ...formData,
        domainRestrictions: formData.domainRestrictions
          ? formData.domainRestrictions.split(',').map(d => d.trim())
          : [],
        ...(formData.type === 'oauth' && { oauthConfig }),
        ...(formData.type === 'saml' && { samlConfig }),
        ...(formData.type === 'ldap' && { ldapConfig }),
        ...(editingConfig && { id: editingConfig._id }),
      };

      const response = await fetch('/api/admin/sso', {
        method: editingConfig ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save configuration');
      }

      toast.success(
        editingConfig
          ? 'SSO configuration updated successfully'
          : 'SSO configuration created successfully'
      );

      setShowCreateModal(false);
      setEditingConfig(null);
      resetForm();
      loadConfigs();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this SSO configuration?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/sso?id=${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete configuration');
      }

      toast.success('SSO configuration deleted successfully');
      loadConfigs();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleTest = async (config: SSOConfig) => {
    try {
      setTestingConfig(config._id);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/admin/sso/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: config.type,
          provider: config.provider,
          config:
            config.type === 'oauth'
              ? config.oauthConfig
              : config.type === 'saml'
              ? config.samlConfig
              : config.ldapConfig,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || 'Test failed');
    } finally {
      setTestingConfig(null);
    }
  };

  const handleEdit = (config: SSOConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      type: config.type,
      provider: config.provider,
      enabled: config.enabled,
      autoProvision: config.autoProvision,
      defaultRole: config.defaultRole,
      domainRestrictions: config.domainRestrictions?.join(', ') || '',
    });

    if (config.type === 'oauth' && config.oauthConfig) {
      setOauthConfig(config.oauthConfig);
    } else if (config.type === 'saml' && config.samlConfig) {
      setSamlConfig(config.samlConfig);
    } else if (config.type === 'ldap' && config.ldapConfig) {
      setLdapConfig(config.ldapConfig);
    }

    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'oauth',
      provider: '',
      enabled: true,
      autoProvision: true,
      defaultRole: 'user',
      domainRestrictions: '',
    });
    setOauthConfig({ clientId: '', clientSecret: '', scope: '' });
    setSamlConfig({ entryPoint: '', issuer: '', cert: '', metadataUrl: '' });
    setLdapConfig({
      url: '',
      bindDN: '',
      bindCredentials: '',
      searchBase: '',
      searchFilter: '(uid={{username}})',
    });
  };

  const getProviderIcon = (type: string, provider: string) => {
    const icons: Record<string, string> = {
      google: '🔵',
      microsoft: '🟦',
      github: '⚫',
      gitlab: '🟠',
      oauth: '🔐',
      saml: '🏢',
      ldap: '📁',
    };
    return icons[provider] || icons[type] || '🔑';
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading SSO configurations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Single Sign-On (SSO)</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure OAuth, SAML, and LDAP authentication providers
          </p>
        </div>
        <button
          onClick={() => {
            setEditingConfig(null);
            resetForm();
            setShowCreateModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <span>➕</span>
          Add Provider
        </button>
      </div>

      {/* SSO Configurations List */}
      {configs.length === 0 ? (
        <div className="bg-white p-12 rounded-lg border border-gray-200 text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No SSO Providers Configured
          </h3>
          <p className="text-gray-600 mb-4">
            Get started by adding your first authentication provider
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Provider
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {configs.map((config) => (
            <div
              key={config._id}
              className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{getProviderIcon(config.type, config.provider)}</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{config.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {config.type.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">{config.provider}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {config.enabled ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      ✓ Enabled
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      Disabled
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex justify-between">
                  <span>Auto-provision:</span>
                  <span className="font-medium">
                    {config.autoProvision ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Default role:</span>
                  <span className="font-medium capitalize">{config.defaultRole}</span>
                </div>
                <div className="flex justify-between">
                  <span>Usage count:</span>
                  <span className="font-medium">{config.usageCount}</span>
                </div>
                {config.domainRestrictions && config.domainRestrictions.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-500">
                      Allowed domains: {config.domainRestrictions.join(', ')}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleTest(config)}
                  disabled={testingConfig === config._id}
                  className="flex-1 px-3 py-2 text-sm border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  {testingConfig === config._id ? 'Testing...' : 'Test'}
                </button>
                <button
                  onClick={() => handleEdit(config)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(config._id)}
                  className="flex-1 px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">
                {editingConfig ? 'Edit SSO Provider' : 'Add SSO Provider'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingConfig(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Basic Configuration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Configuration Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Company Google SSO"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e: any) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="oauth">OAuth 2.0</option>
                    <option value="saml">SAML 2.0</option>
                    <option value="ldap">LDAP / Active Directory</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider
                  </label>
                  {formData.type === 'oauth' ? (
                    <select
                      value={formData.provider}
                      onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      required
                    >
                      <option value="">Select provider</option>
                      <option value="google">Google</option>
                      <option value="microsoft">Microsoft</option>
                      <option value="github">GitHub</option>
                      <option value="gitlab">GitLab</option>
                    </select>
                  ) : formData.type === 'saml' ? (
                    <select
                      value={formData.provider}
                      onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      required
                    >
                      <option value="">Select provider</option>
                      <option value="azure">Azure AD</option>
                      <option value="okta">Okta</option>
                      <option value="onelogin">OneLogin</option>
                      <option value="generic">Generic SAML</option>
                    </select>
                  ) : (
                    <select
                      value={formData.provider}
                      onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      required
                    >
                      <option value="">Select provider</option>
                      <option value="activedirectory">Active Directory</option>
                      <option value="openldap">OpenLDAP</option>
                      <option value="generic">Generic LDAP</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Type-specific Configuration */}
              {formData.type === 'oauth' && (
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900">OAuth Configuration</h4>
                  <p className="text-xs text-gray-600">
                    Note: Client credentials should be set in environment variables:
                    {formData.provider.toUpperCase()}_CLIENT_ID and{' '}
                    {formData.provider.toUpperCase()}_CLIENT_SECRET
                  </p>
                </div>
              )}

              {formData.type === 'saml' && (
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900">SAML Configuration</h4>
                  <input
                    type="url"
                    placeholder="Metadata URL (optional)"
                    value={samlConfig.metadataUrl}
                    onChange={(e) => setSamlConfig({ ...samlConfig, metadataUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="url"
                    placeholder="Entry Point / SSO URL"
                    value={samlConfig.entryPoint}
                    onChange={(e) => setSamlConfig({ ...samlConfig, entryPoint: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    required={!samlConfig.metadataUrl}
                  />
                  <input
                    type="text"
                    placeholder="Issuer / Entity ID"
                    value={samlConfig.issuer}
                    onChange={(e) => setSamlConfig({ ...samlConfig, issuer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    required={!samlConfig.metadataUrl}
                  />
                  <textarea
                    placeholder="Certificate (PEM format)"
                    value={samlConfig.cert}
                    onChange={(e) => setSamlConfig({ ...samlConfig, cert: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-xs"
                    rows={4}
                    required={!samlConfig.metadataUrl}
                  />
                </div>
              )}

              {formData.type === 'ldap' && (
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900">LDAP Configuration</h4>
                  <input
                    type="text"
                    placeholder="LDAP URL (e.g., ldaps://ldap.example.com:636)"
                    value={ldapConfig.url}
                    onChange={(e) => setLdapConfig({ ...ldapConfig, url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Bind DN (e.g., cn=admin,dc=example,dc=com)"
                    value={ldapConfig.bindDN}
                    onChange={(e) => setLdapConfig({ ...ldapConfig, bindDN: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Bind Credentials"
                    value={ldapConfig.bindCredentials}
                    onChange={(e) =>
                      setLdapConfig({ ...ldapConfig, bindCredentials: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Search Base (e.g., ou=users,dc=example,dc=com)"
                    value={ldapConfig.searchBase}
                    onChange={(e) => setLdapConfig({ ...ldapConfig, searchBase: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Search Filter (e.g., (uid={{username}}))"
                    value={ldapConfig.searchFilter}
                    onChange={(e) =>
                      setLdapConfig({ ...ldapConfig, searchFilter: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              )}

              {/* General Settings */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">General Settings</h4>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="enabled" className="text-sm text-gray-700">
                    Enable this provider
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoProvision"
                    checked={formData.autoProvision}
                    onChange={(e) =>
                      setFormData({ ...formData, autoProvision: e.target.checked })
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="autoProvision" className="text-sm text-gray-700">
                    Auto-provision new users on first login
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Role for New Users
                  </label>
                  <select
                    value={formData.defaultRole}
                    onChange={(e) => setFormData({ ...formData, defaultRole: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Domain Restrictions (comma-separated, optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., company.com, example.com"
                    value={formData.domainRestrictions}
                    onChange={(e) =>
                      setFormData({ ...formData, domainRestrictions: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Only allow users with email addresses from these domains
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingConfig(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingConfig ? 'Update' : 'Create'} Provider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
