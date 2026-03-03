/**
 * POST /api/cloud-security/[id]/test
 * Test connectivity to the configured cloud provider.
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

    await CloudSecurityConfig.findByIdAndUpdate(params.id, { status: 'testing' });

    const result = await CloudSecurityManager.testConnection(config);

    await CloudSecurityConfig.findByIdAndUpdate(params.id, {
      status: result.success ? 'active' : 'error',
      ...(result.success && { lastSyncAt: new Date(), lastError: null }),
      ...(!result.success && { lastError: result.message }),
    });

    return NextResponse.json({ success: result.success, result });
  } catch (error: any) {
    console.error('[CloudSecurity] Test error:', error);
    try {
      await connectDB();
      await CloudSecurityConfig.findByIdAndUpdate(params.id, { status: 'error', lastError: error.message });
    } catch (_) {}
    return NextResponse.json({ error: error.message || 'Test failed' }, { status: 500 });
  }
}
