/**
 * SIEM Configuration — single resource
 * GET    /api/siem/[id]  — fetch one config
 * PUT    /api/siem/[id]  — update config
 * DELETE /api/siem/[id]  — remove config
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import SIEMConfig from '@/models/SIEMConfig';

interface Params {
  params: { id: string };
}

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const config = await SIEMConfig.findOne({
      _id: params.id,
      createdBy: auth.userId,
    }).select('-splunkConfig.token -elkConfig.apiKey -elkConfig.password -qradarConfig.apiToken -syslogConfig.tlsKey');

    if (!config) {
      return NextResponse.json({ error: 'SIEM config not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error('[SIEM] GET by ID error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

// ── PUT ──────────────────────────────────────────────────────────────────────

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    await connectDB();

    const config = await SIEMConfig.findOneAndUpdate(
      { _id: params.id, createdBy: auth.userId },
      {
        $set: {
          name: body.name,
          description: body.description,
          enabled: body.enabled,
          ...(body.splunkConfig && { splunkConfig: body.splunkConfig }),
          ...(body.elkConfig && { elkConfig: body.elkConfig }),
          ...(body.qradarConfig && { qradarConfig: body.qradarConfig }),
          ...(body.syslogConfig && { syslogConfig: body.syslogConfig }),
          ...(body.forwardingRules && { forwardingRules: body.forwardingRules }),
          ...(body.batchSize !== undefined && { batchSize: body.batchSize }),
          ...(body.retryAttempts !== undefined && { retryAttempts: body.retryAttempts }),
          ...(body.retryDelayMs !== undefined && { retryDelayMs: body.retryDelayMs }),
        },
      },
      { new: true }
    );

    if (!config) {
      return NextResponse.json({ error: 'SIEM config not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error('[SIEM] PUT error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

// ── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const config = await SIEMConfig.findOneAndDelete({
      _id: params.id,
      createdBy: auth.userId,
    });

    if (!config) {
      return NextResponse.json({ error: 'SIEM config not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'SIEM configuration deleted' });
  } catch (error: any) {
    console.error('[SIEM] DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
