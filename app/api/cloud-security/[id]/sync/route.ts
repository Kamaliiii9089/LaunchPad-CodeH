/**
 * POST /api/cloud-security/[id]/sync
 * Pull latest findings from the cloud provider.
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import CloudSecurityConfig from '@/models/CloudSecurityConfig';
import { CloudSecurityManager } from '@/lib/cloudSecurityIntegration';

interface Params { params: { id: string } }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const config = await CloudSecurityConfig.findOne({ _id: params.id, createdBy: auth.userId });
    if (!config) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (!config.enabled) {
      return NextResponse.json({ error: 'This integration is disabled' }, { status: 400 });
    }

    const result = await CloudSecurityManager.sync(config);

    await CloudSecurityConfig.findByIdAndUpdate(params.id, {
      $inc: {
        eventsIngested: result.findingsCount,
        findingsCount: result.findingsCount,
      },
      lastSyncAt: new Date(),
      status: result.success ? 'active' : 'error',
      ...(result.error && { lastError: result.error }),
      ...(!result.error && { lastError: null }),
    });

    return NextResponse.json({
      success: result.success,
      findingsCount: result.findingsCount,
      sources: result.sources,
      durationMs: result.durationMs,
      // Return top 20 findings in response (full set stored elsewhere / forwarded to SIEM)
      findings: result.findings.slice(0, 20),
    });
  } catch (error: any) {
    console.error('[CloudSecurity] Sync error:', error);
    try {
      await connectDB();
      await CloudSecurityConfig.findByIdAndUpdate(params.id, { status: 'error', lastError: error.message });
    } catch (_) {}
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 });
  }
}
