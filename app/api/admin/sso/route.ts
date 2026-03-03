/**
 * SSO Configuration Management
 * Admin API for managing SSO providers
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import SSOConfig from '@/models/SSOConfig';

// GET: List all SSO configurations
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request as any);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (you may need to implement role checking)
    // if (auth.role !== 'admin') {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    await connectDB();

    const configs = await SSOConfig.find({ createdBy: auth.userId })
      .select('-oauthConfig.clientSecret -samlConfig.privateKey -ldapConfig.bindCredentials')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      configs,
    });
  } catch (error: any) {
    console.error('Failed to fetch SSO configs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch SSO configurations' },
      { status: 500 }
    );
  }
}

// POST: Create new SSO configuration
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request as any);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      type,
      provider,
      enabled,
      oauthConfig,
      samlConfig,
      ldapConfig,
      domainRestrictions,
      autoProvision,
      roleMapping,
      defaultRole,
    } = body;

    // Validate required fields
    if (!name || !type || !provider) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, provider' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['oauth', 'saml', 'ldap'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be one of: oauth, saml, ldap' },
        { status: 400 }
      );
    }

    // Validate appropriate config exists
    if (type === 'oauth' && !oauthConfig) {
      return NextResponse.json(
        { error: 'OAuth configuration is required for OAuth type' },
        { status: 400 }
      );
    }
    if (type === 'saml' && !samlConfig) {
      return NextResponse.json(
        { error: 'SAML configuration is required for SAML type' },
        { status: 400 }
      );
    }
    if (type === 'ldap' && !ldapConfig) {
      return NextResponse.json(
        { error: 'LDAP configuration is required for LDAP type' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check for duplicate provider name
    const existing = await SSOConfig.findOne({
      provider: provider.toLowerCase(),
      createdBy: auth.userId,
    });

    if (existing) {
      return NextResponse.json(
        { error: `SSO configuration for provider '${provider}' already exists` },
        { status: 409 }
      );
    }

    // Create SSO config
    const config = new SSOConfig({
      name,
      type,
      provider: provider.toLowerCase(),
      enabled: enabled !== false,
      oauthConfig,
      samlConfig,
      ldapConfig,
      domainRestrictions,
      autoProvision: autoProvision !== false,
      roleMapping,
      defaultRole: defaultRole || 'user',
      createdBy: auth.userId,
    });

    await config.save();

    // Remove sensitive data before returning
    const responseConfig = config.toObject();
    if (responseConfig.oauthConfig) {
      delete responseConfig.oauthConfig.clientSecret;
    }
    if (responseConfig.samlConfig) {
      delete responseConfig.samlConfig.privateKey;
    }
    if (responseConfig.ldapConfig) {
      delete responseConfig.ldapConfig.bindCredentials;
    }

    return NextResponse.json({
      success: true,
      message: 'SSO configuration created successfully',
      config: responseConfig,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create SSO config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create SSO configuration' },
      { status: 500 }
    );
  }
}

// PUT: Update SSO configuration
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request as any);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const config = await SSOConfig.findOne({
      _id: id,
      createdBy: auth.userId,
    });

    if (!config) {
      return NextResponse.json(
        { error: 'SSO configuration not found' },
        { status: 404 }
      );
    }

    // Update fields
    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) {
        (config as any)[key] = updates[key];
      }
    });

    await config.save();

    // Remove sensitive data
    const responseConfig = config.toObject();
    if (responseConfig.oauthConfig) {
      delete responseConfig.oauthConfig.clientSecret;
    }
    if (responseConfig.samlConfig) {
      delete responseConfig.samlConfig.privateKey;
    }
    if (responseConfig.ldapConfig) {
      delete responseConfig.ldapConfig.bindCredentials;
    }

    return NextResponse.json({
      success: true,
      message: 'SSO configuration updated successfully',
      config: responseConfig,
    });
  } catch (error: any) {
    console.error('Failed to update SSO config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update SSO configuration' },
      { status: 500 }
    );
  }
}

// DELETE: Remove SSO configuration
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request as any);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const config = await SSOConfig.findOneAndDelete({
      _id: id,
      createdBy: auth.userId,
    });

    if (!config) {
      return NextResponse.json(
        { error: 'SSO configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'SSO configuration deleted successfully',
    });
  } catch (error: any) {
    console.error('Failed to delete SSO config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete SSO configuration' },
      { status: 500 }
    );
  }
}
