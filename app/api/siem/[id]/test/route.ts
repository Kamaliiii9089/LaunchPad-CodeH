/**
 * SIEM Connection Test
 * POST /api/siem/[id]/test — test connectivity for a specific SIEM config
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import SIEMConfig from '@/models/SIEMConfig';
import { SIEMIntegrationManager } from '@/lib/siemIntegration';

interface Params {
  params: { id: string };
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const config = await SIEMConfig.findOne({
      _id: params.id,
      createdBy: auth.userId,
    });

    if (!config) {
      return NextResponse.json({ error: 'SIEM config not found' }, { status: 404 });
    }

    // Update status to 'testing'
    await SIEMConfig.findByIdAndUpdate(params.id, { status: 'testing' });

    const result = await SIEMIntegrationManager.testConnection(config);

    // Update status based on result
    await SIEMConfig.findByIdAndUpdate(params.id, {
      status: result.success ? 'active' : 'error',
      lastConnectedAt: result.success ? new Date() : config.lastConnectedAt,
      lastError: result.success ? null : result.message,
    });

    return NextResponse.json({
      success: result.success,
      result,
      message: result.message,
    });
  } catch (error: any) {
    console.error('[SIEM] Test connection error:', error);

    // Reset status on unexpected error
    try {
      await connectDB();
      await SIEMConfig.findByIdAndUpdate(params.id, {
        status: 'error',
        lastError: error.message,
      });
    } catch (_) {}

    return NextResponse.json(
      { error: error.message || 'Test failed' },
      { status: 500 }
    );
  }
}
