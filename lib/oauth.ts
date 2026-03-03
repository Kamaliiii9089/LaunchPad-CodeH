/**
 * OAuth 2.0 Integration Library
 * 
 * Supports multiple OAuth providers for SSO authentication:
 * - Google
 * - Microsoft (Azure AD)
 * - GitHub
 * - GitLab
 */

import crypto from 'crypto';

// OAuth Provider Configuration Types
export interface OAuthProvider {
  id: string;
  name: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

export interface OAuthUserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: string;
  providerAccountId: string;
  emailVerified?: boolean;
}

// OAuth Provider Configurations
export const OAUTH_PROVIDERS: Record<string, Omit<OAuthProvider, 'clientId' | 'clientSecret' | 'redirectUri'>> = {
  google: {
    id: 'google',
    name: 'Google',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scope: 'openid email profile',
  },
  microsoft: {
    id: 'microsoft',
    name: 'Microsoft',
    authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scope: 'openid email profile User.Read',
  },
  github: {
    id: 'github',
    name: 'GitHub',
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scope: 'read:user user:email',
  },
  gitlab: {
    id: 'gitlab',
    name: 'GitLab',
    authorizationUrl: 'https://gitlab.com/oauth/authorize',
    tokenUrl: 'https://gitlab.com/oauth/token',
    userInfoUrl: 'https://gitlab.com/api/v4/user',
    scope: 'read_user openid email profile',
  },
};

/**
 * Generate a secure random state parameter for CSRF protection
 */
export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate PKCE code verifier and challenge for enhanced security
 */
export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  return { codeVerifier, codeChallenge };
}

/**
 * Get OAuth provider configuration
 */
export function getOAuthProvider(providerId: string): OAuthProvider {
  const providerConfig = OAUTH_PROVIDERS[providerId];
  if (!providerConfig) {
    throw new Error(`Unknown OAuth provider: ${providerId}`);
  }

  const envPrefix = providerId.toUpperCase();
  const clientId = process.env[`${envPrefix}_CLIENT_ID`] || '';
  const clientSecret = process.env[`${envPrefix}_CLIENT_SECRET`] || '';
  const redirectUri = process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/oauth/callback/${providerId}`
    : `http://localhost:3000/api/auth/oauth/callback/${providerId}`;

  if (!clientId || !clientSecret) {
    throw new Error(`OAuth credentials not configured for ${providerId}. Set ${envPrefix}_CLIENT_ID and ${envPrefix}_CLIENT_SECRET environment variables.`);
  }

  return {
    ...providerConfig,
    clientId,
    clientSecret,
    redirectUri,
  };
}

/**
 * Build OAuth authorization URL
 */
export function buildAuthorizationUrl(
  providerId: string,
  state: string,
  pkce?: { codeChallenge: string }
): string {
  const provider = getOAuthProvider(providerId);
  const params = new URLSearchParams({
    client_id: provider.clientId,
    redirect_uri: provider.redirectUri,
    response_type: 'code',
    scope: provider.scope,
    state,
  });

  // Add PKCE if provided (recommended for public clients)
  if (pkce) {
    params.append('code_challenge', pkce.codeChallenge);
    params.append('code_challenge_method', 'S256');
  }

  // Microsoft-specific parameters
  if (providerId === 'microsoft') {
    params.append('response_mode', 'query');
  }

  return `${provider.authorizationUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  providerId: string,
  code: string,
  codeVerifier?: string
): Promise<OAuthTokenResponse> {
  const provider = getOAuthProvider(providerId);

  const body = new URLSearchParams({
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
    code,
    redirect_uri: provider.redirectUri,
    grant_type: 'authorization_code',
  });

  // Add PKCE verifier if provided
  if (codeVerifier) {
    body.append('code_verifier', codeVerifier);
  }

  const response = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Fetch user profile from OAuth provider
 */
export async function fetchUserProfile(
  providerId: string,
  accessToken: string
): Promise<OAuthUserProfile> {
  const provider = getOAuthProvider(providerId);

  const response = await fetch(provider.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch user profile: ${error}`);
  }

  const data = await response.json();

  // Normalize user profile across different providers
  return normalizeUserProfile(providerId, data);
}

/**
 * Normalize user profile data from different providers
 */
function normalizeUserProfile(providerId: string, data: any): OAuthUserProfile {
  switch (providerId) {
    case 'google':
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        picture: data.picture,
        provider: 'google',
        providerAccountId: data.id,
        emailVerified: data.email_verified,
      };

    case 'microsoft':
      return {
        id: data.id,
        email: data.mail || data.userPrincipalName,
        name: data.displayName,
        picture: null, // Microsoft Graph requires separate call for photo
        provider: 'microsoft',
        providerAccountId: data.id,
        emailVerified: true, // Microsoft users are pre-verified
      };

    case 'github':
      return {
        id: String(data.id),
        email: data.email,
        name: data.name || data.login,
        picture: data.avatar_url,
        provider: 'github',
        providerAccountId: String(data.id),
        emailVerified: data.email ? true : false,
      };

    case 'gitlab':
      return {
        id: String(data.id),
        email: data.email,
        name: data.name || data.username,
        picture: data.avatar_url,
        provider: 'gitlab',
        providerAccountId: String(data.id),
        emailVerified: data.confirmed_at ? true : false,
      };

    default:
      throw new Error(`Unsupported provider: ${providerId}`);
  }
}

/**
 * Refresh OAuth access token (if supported)
 */
export async function refreshAccessToken(
  providerId: string,
  refreshToken: string
): Promise<OAuthTokenResponse> {
  const provider = getOAuthProvider(providerId);

  const body = new URLSearchParams({
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return response.json();
}

/**
 * Revoke OAuth access token (if supported)
 */
export async function revokeAccessToken(
  providerId: string,
  token: string
): Promise<boolean> {
  const revokeUrls: Record<string, string> = {
    google: 'https://oauth2.googleapis.com/revoke',
    github: `https://api.github.com/applications/${process.env.GITHUB_CLIENT_ID}/token`,
    gitlab: 'https://gitlab.com/oauth/revoke',
  };

  const revokeUrl = revokeUrls[providerId];
  if (!revokeUrl) {
    return false; // Provider doesn't support revocation
  }

  try {
    if (providerId === 'github') {
      // GitHub uses DELETE with basic auth
      const provider = getOAuthProvider(providerId);
      const auth = Buffer.from(`${provider.clientId}:${provider.clientSecret}`).toString('base64');
      
      await fetch(revokeUrl, {
        method: 'DELETE',
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({ access_token: token }),
      });
    } else {
      // Google and GitLab use POST with token parameter
      const body = new URLSearchParams({ token });
      await fetch(revokeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });
    }
    return true;
  } catch (error) {
    console.error(`Failed to revoke token for ${providerId}:`, error);
    return false;
  }
}

/**
 * Validate OAuth state parameter to prevent CSRF attacks
 */
export function validateOAuthState(receivedState: string, storedState: string): boolean {
  if (!receivedState || !storedState) {
    return false;
  }
  return crypto.timingSafeEqual(
    Buffer.from(receivedState),
    Buffer.from(storedState)
  );
}
