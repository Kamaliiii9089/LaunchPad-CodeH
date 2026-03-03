/**
 * OAuth Authorization Endpoint
 * Initiates OAuth flow with configured provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import SSOConfig from '@/models/SSOConfig';
import { generateOAuthState, buildAuthorizationUrl, generatePKCE } from '@/lib/oauth';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const { provider } = params;

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find SSO configuration for provider
    const ssoConfig = await SSOConfig.findOne({
      provider: provider.toLowerCase(),
      type: 'oauth',
      enabled: true,
    });

    if (!ssoConfig) {
      return NextResponse.json(
        { error: `OAuth provider '${provider}' is not configured or not enabled` },
        { status: 404 }
      );
    }

    // Generate state for CSRF protection
    const state = generateOAuthState();

    // Generate PKCE for enhanced security
    const { codeVerifier, codeChallenge } = generatePKCE();

    // Store state and code verifier in session cookie
    const cookieStore = cookies();
    cookieStore.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });
    cookieStore.set('oauth_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
    });
    cookieStore.set('oauth_provider', provider.toLowerCase(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
    });

    // Build authorization URL
    const authUrl = buildAuthorizationUrl(provider.toLowerCase(), state, { codeChallenge });

    // Redirect to OAuth provider
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('OAuth authorization error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}
