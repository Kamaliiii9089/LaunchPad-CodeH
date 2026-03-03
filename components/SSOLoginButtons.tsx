'use client';

import { useState, useEffect } from 'react';

interface SSOProvider {
  _id: string;
  name: string;
  type: 'oauth' | 'saml' | 'ldap';
  provider: string;
  enabled: boolean;
}

export default function SSOLoginButtons() {
  const [providers, setProviders] = useState<SSOProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      // This would be a public endpoint that lists available SSO providers
      const response = await fetch('/api/auth/sso/providers');
      
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
      }
    } catch (error) {
      console.error('Failed to load SSO providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSSOLogin = (provider: SSOProvider) => {
    // Redirect to OAuth/SAML/LDAP login endpoint
    if (provider.type === 'oauth') {
      window.location.href = `/api/auth/oauth/${provider.provider}`;
    } else if (provider.type === 'saml') {
      window.location.href = `/api/auth/saml/${provider.provider}`;
    } else if (provider.type === 'ldap') {
      // LDAP requires username/password, redirect to LDAP login form
      window.location.href = `/login/ldap?provider=${provider.provider}`;
    }
  };

  const getProviderIcon = (provider: string) => {
    const icons: Record<string, JSX.Element> = {
      google: (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      ),
      microsoft: (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#f25022" d="M0 0h11.5v11.5H0z" />
          <path fill="#00a4ef" d="M12.5 0H24v11.5H12.5z" />
          <path fill="#7fba00" d="M0 12.5h11.5V24H0z" />
          <path fill="#ffb900" d="M12.5 12.5H24V24H12.5z" />
        </svg>
      ),
      github: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      ),
      gitlab: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.955 13.587l-1.342-4.135-2.664-8.189a.455.455 0 0 0-.867 0L16.418 9.45H7.582L4.918 1.263a.455.455 0 0 0-.867 0L1.387 9.452.045 13.587a.924.924 0 0 0 .331 1.023L12 23.054l11.624-8.443a.92.92 0 0 0 .331-1.024" />
        </svg>
      ),
    };

    return icons[provider] || (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    );
  };

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      google: 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
      microsoft: 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
      github: 'bg-gray-900 border-gray-900 text-white hover:bg-gray-800',
      gitlab: 'bg-orange-500 border-orange-500 text-white hover:bg-orange-600',
    };

    return colors[provider] || 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700';
  };

  const getProviderName = (type: string, provider: string, name: string) => {
    const names: Record<string, string> = {
      google: 'Google',
      microsoft: 'Microsoft',
      github: 'GitHub',
      gitlab: 'GitLab',
      azure: 'Azure AD',
      okta: 'Okta',
      onelogin: 'OneLogin',
      activedirectory: 'Active Directory',
      openldap: 'OpenLDAP',
    };

    return names[provider] || name;
  };

  if (loading) {
    return null;
  }

  if (providers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      {/* SSO Provider Buttons */}
      <div className="space-y-2">
        {providers.map((provider) => (
          <button
            key={provider._id}
            onClick={() => handleSSOLogin(provider)}
            className={`w-full flex items-center justify-center gap-3 px-4 py-3 border rounded-lg transition-colors ${getProviderColor(
              provider.provider
            )}`}
          >
            {getProviderIcon(provider.provider)}
            <span className="font-medium">
              Continue with {getProviderName(provider.type, provider.provider, provider.name)}
            </span>
          </button>
        ))}
      </div>

      {/* Info Text */}
      <p className="text-xs text-center text-gray-500">
        By continuing with SSO, you agree to our terms of service and privacy policy
      </p>
    </div>
  );
}
