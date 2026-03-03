/**
 * SIEM Statistics
 * GET /api/siem/stats — aggregated forwarding stats for the dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import SIEMConfig from '@/models/SIEMConfig';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const configs = await SIEMConfig.find({ createdBy: auth.userId });

    const stats = {
      total: configs.length,
      active: configs.filter((c) => c.status === 'active').length,
      inactive: configs.filter((c) => c.status === 'inactive').length,
      error: configs.filter((c) => c.status === 'error').length,
      totalEventsForwarded: configs.reduce((sum, c) => sum + (c.eventsForwarded || 0), 0),
      totalEventsFailed: configs.reduce((sum, c) => sum + (c.eventsFailed || 0), 0),
      byType: {
        splunk: configs.filter((c) => c.type === 'splunk').length,
        elk: configs.filter((c) => c.type === 'elk').length,
        qradar: configs.filter((c) => c.type === 'qradar').length,
        syslog: configs.filter((c) => c.type === 'syslog').length,
      },
    };

    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    console.error('[SIEM] Stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch SIEM stats' },
      { status: 500 }
    );
  }
}
