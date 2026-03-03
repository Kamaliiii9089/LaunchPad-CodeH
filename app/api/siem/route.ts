/**
 * SIEM Configuration API
 * GET  /api/siem  — list all configs for authenticated user
 * POST /api/siem  — create a new SIEM connector config
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import SIEMConfig from '@/models/SIEMConfig';

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const configs = await SIEMConfig.find({ createdBy: auth.userId })
      .select('-splunkConfig.token -elkConfig.apiKey -elkConfig.password -qradarConfig.apiToken -syslogConfig.tlsKey')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, configs });
  } catch (error: any) {
    console.error('[SIEM] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch SIEM configurations' },
      { status: 500 }
    );
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      type,
      enabled,
      splunkConfig,
      elkConfig,
      qradarConfig,
      syslogConfig,
      forwardingRules,
      batchSize,
      retryAttempts,
      retryDelayMs,
    } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'name and type are required' },
        { status: 400 }
      );
    }

    const validTypes = ['splunk', 'elk', 'qradar', 'syslog'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    await connectDB();

    const config = await SIEMConfig.create({
      name,
      description,
      type,
      enabled: enabled ?? true,
      splunkConfig,
      elkConfig,
      qradarConfig,
      syslogConfig,
      forwardingRules: forwardingRules ?? {
        severities: ['critical', 'high', 'medium', 'low'],
        eventTypes: [],
        statuses: ['active', 'investigating'],
        enabled: true,
      },
      batchSize: batchSize ?? 100,
      retryAttempts: retryAttempts ?? 3,
      retryDelayMs: retryDelayMs ?? 1000,
      status: 'inactive',
      eventsForwarded: 0,
      eventsFailed: 0,
      createdBy: auth.userId,
    });

    return NextResponse.json({ success: true, config }, { status: 201 });
  } catch (error: any) {
    console.error('[SIEM] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create SIEM configuration' },
      { status: 500 }
    );
  }
}
