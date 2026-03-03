/**
 * GET /api/cloud-security/stats
 * Aggregated stats across all cloud integrations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import CloudSecurityConfig from '@/models/CloudSecurityConfig';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const configs = await CloudSecurityConfig.find({ createdBy: auth.userId });

    const stats = {
      total: configs.length,
      active: configs.filter(c => c.status === 'active').length,
      error: configs.filter(c => c.status === 'error').length,
      totalFindings: configs.reduce((s, c) => s + (c.findingsCount || 0), 0),
      totalEventsIngested: configs.reduce((s, c) => s + (c.eventsIngested || 0), 0),
      byProvider: {
        aws: configs.filter(c => c.provider === 'aws').length,
        azure: configs.filter(c => c.provider === 'azure').length,
        gcp: configs.filter(c => c.provider === 'gcp').length,
      },
    };

    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
