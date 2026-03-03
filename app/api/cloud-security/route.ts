/**
 * Cloud Security Configurations
 * GET  /api/cloud-security  — list all configs
 * POST /api/cloud-security  — create new config
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import CloudSecurityConfig from '@/models/CloudSecurityConfig';

const SENSITIVE = '-awsConfig.secretAccessKey -azureConfig.clientSecret -gcpConfig.serviceAccountKey';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const configs = await CloudSecurityConfig.find({ createdBy: auth.userId })
      .select(SENSITIVE)
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, configs });
  } catch (error: any) {
    console.error('[CloudSecurity] GET error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, description, provider, enabled, awsConfig, azureConfig, gcpConfig, forwardingRules } = body;

    if (!name || !provider) {
      return NextResponse.json({ error: 'name and provider are required' }, { status: 400 });
    }

    if (!['aws', 'azure', 'gcp'].includes(provider)) {
      return NextResponse.json({ error: 'provider must be aws, azure, or gcp' }, { status: 400 });
    }

    await connectDB();

    const config = await CloudSecurityConfig.create({
      name,
      description,
      provider,
      enabled: enabled ?? true,
      awsConfig,
      azureConfig,
      gcpConfig,
      forwardingRules: forwardingRules ?? {
        severities: ['CRITICAL', 'HIGH', 'MEDIUM'],
        categories: [],
        enabled: true,
        pollIntervalMinutes: 15,
      },
      status: 'inactive',
      eventsIngested: 0,
      findingsCount: 0,
      createdBy: auth.userId,
    });

    return NextResponse.json({ success: true, config }, { status: 201 });
  } catch (error: any) {
    console.error('[CloudSecurity] POST error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
