/**
 * SSO Configuration Test Endpoint
 * Test SSO connections before saving configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getOAuthProvider } from '@/lib/oauth';
import { validateSAMLCertificate, createConfigFromMetadata } from '@/lib/saml';
import { testLDAPConnection, validateLDAPConfig } from '@/lib/ldap';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request as any);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, provider, config } = body;

    if (!type || !provider) {
      return NextResponse.json(
        { error: 'Type and provider are required' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'oauth':
        result = await testOAuthConfig(provider, config);
        break;

      case 'saml':
        result = await testSAMLConfig(config);
        break;

      case 'ldap':
        result = await testLDAPConfig(config);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid type. Must be one of: oauth, saml, ldap' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('SSO test error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to test SSO configuration' },
      { status: 500 }
    );
  }
}

async function testOAuthConfig(provider: string, config: any) {
  try {
    // Check if environment variables are set
    const envPrefix = provider.toUpperCase();
    const clientId = process.env[`${envPrefix}_CLIENT_ID`];
    const clientSecret = process.env[`${envPrefix}_CLIENT_SECRET`];

    if (!clientId || !clientSecret) {
      return {
        success: false,
        message: `OAuth provider '${provider}' is not configured in environment variables. Set ${envPrefix}_CLIENT_ID and ${envPrefix}_CLIENT_SECRET.`,
      };
    }

    // Try to get provider configuration
    const providerConfig = getOAuthProvider(provider);

    return {
      success: true,
      message: `OAuth provider '${provider}' is configured correctly`,
      details: {
        provider: providerConfig.name,
        authorizationUrl: providerConfig.authorizationUrl,
        scope: providerConfig.scope,
        redirectUri: providerConfig.redirectUri,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
    };
  }
}

async function testSAMLConfig(config: any) {
  try {
    const errors: string[] = [];

    // Validate required fields
    if (!config.entryPoint) {
      errors.push('Entry point URL is required');
    }
    if (!config.issuer) {
      errors.push('Issuer is required');
    }
    if (!config.cert) {
      errors.push('Certificate is required');
    }

    if (errors.length > 0) {
      return {
        success: false,
        message: 'SAML configuration is incomplete',
        errors,
      };
    }

    // Validate certificate format
    if (!validateSAMLCertificate(config.cert)) {
      return {
        success: false,
        message: 'Invalid SAML certificate format. Certificate must be in PEM format.',
      };
    }

    // Try to fetch metadata if metadataUrl is provided
    let metadataDetails;
    if (config.metadataUrl) {
      try {
        metadataDetails = await createConfigFromMetadata(config.metadataUrl);
      } catch (error: any) {
        return {
          success: false,
          message: `Failed to fetch SAML metadata: ${error.message}`,
        };
      }
    }

    return {
      success: true,
      message: 'SAML configuration is valid',
      details: {
        entryPoint: config.entryPoint,
        issuer: config.issuer,
        certificateValid: true,
        metadataFetched: !!metadataDetails,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
    };
  }
}

async function testLDAPConfig(config: any) {
  try {
    // Validate configuration structure
    const validation = validateLDAPConfig(config);
    
    if (!validation.valid) {
      return {
        success: false,
        message: 'LDAP configuration is invalid',
        errors: validation.errors,
      };
    }

    // Test connection (if ldapjs is installed)
    try {
      const connectionTest = await testLDAPConnection(config);
      return {
        success: connectionTest.success,
        message: connectionTest.message,
        details: {
          url: config.url,
          searchBase: config.searchBase,
        },
      };
    } catch (error: any) {
      // ldapjs not installed
      if (error.message.includes('not implemented')) {
        return {
          success: true,
          message: 'LDAP configuration structure is valid. Install ldapjs package to test connection: npm install ldapjs',
          details: {
            url: config.url,
            searchBase: config.searchBase,
            note: 'Connection test skipped - ldapjs not installed',
          },
        };
      }
      throw error;
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
    };
  }
}
