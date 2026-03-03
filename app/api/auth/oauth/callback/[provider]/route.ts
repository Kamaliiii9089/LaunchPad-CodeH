/**
 * OAuth Callback Endpoint
 * Handles OAuth provider callback and creates/updates user session
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import SSOConfig from '@/models/SSOConfig';
import UserSSO from '@/models/UserSSO';
import User from '@/models/User';
import {
  validateOAuthState,
  exchangeCodeForToken,
  fetchUserProfile,
} from '@/lib/oauth';
import { generateToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth error
    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=invalid_callback`
      );
    }

    // Retrieve stored state and code verifier from cookies
    const cookieStore = cookies();
    const storedState = cookieStore.get('oauth_state')?.value;
    const codeVerifier = cookieStore.get('oauth_code_verifier')?.value;
    const storedProvider = cookieStore.get('oauth_provider')?.value;

    // Validate state
    if (!storedState || !validateOAuthState(state, storedState)) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=invalid_state`
      );
    }

    // Validate provider matches
    if (storedProvider !== params.provider.toLowerCase()) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=provider_mismatch`
      );
    }

    await connectDB();

    // Find SSO configuration
    const ssoConfig = await SSOConfig.findOne({
      provider: params.provider.toLowerCase(),
      type: 'oauth',
      enabled: true,
    });

    if (!ssoConfig) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=provider_not_configured`
      );
    }

    // Exchange code for access token
    const tokenResponse = await exchangeCodeForToken(
      params.provider.toLowerCase(),
      code,
      codeVerifier
    );

    // Fetch user profile from provider
    const profile = await fetchUserProfile(
      params.provider.toLowerCase(),
      tokenResponse.access_token
    );

    // Check domain restrictions
    if (ssoConfig.domainRestrictions && ssoConfig.domainRestrictions.length > 0) {
      const emailDomain = profile.email.split('@')[1];
      if (!ssoConfig.domainRestrictions.includes(emailDomain)) {
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/login?error=domain_not_allowed`
        );
      }
    }

    // Find existing UserSSO record
    let userSSO = await UserSSO.findByProvider(
      params.provider.toLowerCase(),
      profile.providerAccountId
    );

    let user;

    if (userSSO) {
      // Existing SSO connection - get user
      user = await User.findById(userSSO.userId);
      
      if (!user) {
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/login?error=user_not_found`
        );
      }

      // Update tokens and profile
      await userSSO.updateTokens(
        tokenResponse.access_token,
        tokenResponse.refresh_token,
        tokenResponse.expires_in
      );
      userSSO.profile = {
        name: profile.name,
        picture: profile.picture,
      };
      await userSSO.recordLogin();
    } else {
      // New SSO connection
      if (ssoConfig.autoProvision) {
        // Auto-create user
        user = await User.findOne({ email: profile.email.toLowerCase() });
        
        if (!user) {
          // Create new user
          user = new User({
            name: profile.name,
            email: profile.email.toLowerCase(),
            emailVerified: profile.emailVerified || false,
            authMethod: 'sso',
            role: ssoConfig.defaultRole || 'user',
          });
          await user.save();
        }

        // Create UserSSO record
        userSSO = new UserSSO({
          userId: user._id,
          ssoConfigId: ssoConfig._id,
          provider: params.provider.toLowerCase(),
          providerUserId: profile.providerAccountId,
          providerUsername: profile.id,
          providerEmail: profile.email,
          profile: {
            name: profile.name,
            picture: profile.picture,
          },
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          tokenExpiry: tokenResponse.expires_in
            ? new Date(Date.now() + tokenResponse.expires_in * 1000)
            : undefined,
        });
        await userSSO.save();
        await userSSO.recordLogin();
      } else {
        // Auto-provision disabled - user must exist
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/login?error=user_not_provisioned`
        );
      }
    }

    // Record SSO config usage
    await (ssoConfig as any).recordUsage();

    // Generate JWT token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
    });

    // Clear OAuth cookies
    cookieStore.delete('oauth_state');
    cookieStore.delete('oauth_code_verifier');
    cookieStore.delete('oauth_provider');

    // Set auth token cookie
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Redirect to dashboard with token
    const redirectUrl = new URL('/dashboard', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    redirectUrl.searchParams.set('token', token);
    redirectUrl.searchParams.set('sso', 'success');

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=${encodeURIComponent(error.message)}`
    );
  }
}
