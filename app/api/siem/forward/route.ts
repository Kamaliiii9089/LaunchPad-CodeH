/**
 * SIEM Event Forwarding
 * POST /api/siem/forward — forward security events to all enabled SIEM connectors
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import SIEMConfig from '@/models/SIEMConfig';
import { SIEMIntegrationManager, SecurityEventPayload } from '@/lib/siemIntegration';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { events, configId } = body as {
      events: SecurityEventPayload[];
      configId?: string;
    };

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'events array is required and must not be empty' },
        { status: 400 }
      );
    }

    await connectDB();

    // Load configs — either a specific one or all enabled ones
    const query: Record<string, unknown> = { createdBy: auth.userId, enabled: true };
    if (configId) query._id = configId;

    const configs = await SIEMConfig.find(query);

    if (configs.length === 0) {
      return NextResponse.json(
        { error: 'No enabled SIEM configurations found' },
        { status: 404 }
      );
    }

    const results = await Promise.allSettled(
      configs.map(async (config) => {
        const result = await SIEMIntegrationManager.forwardEvents(events, config);

        // Persist metrics
        await SIEMConfig.findByIdAndUpdate(config._id, {
          $inc: {
            eventsForwarded: result.eventCount,
            eventsFailed: result.success ? 0 : events.length - result.eventCount,
          },
          lastForwardedAt: new Date(),
          ...(result.error && { lastError: result.error, status: 'error' }),
          ...(result.success && { status: 'active', lastError: null }),
        });

        return { configId: config._id, name: config.name, ...result };
      })
    );

    const summary = results.map((r) =>
      r.status === 'fulfilled' ? r.value : { success: false, error: (r as PromiseRejectedResult).reason?.message }
    );

    const overallSuccess = summary.every((r) => r.success);

    return NextResponse.json({
      success: overallSuccess,
      forwarded: summary.filter((r) => r.success).length,
      failed: summary.filter((r) => !r.success).length,
      results: summary,
    });
  } catch (error: any) {
    console.error('[SIEM] Forward events error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to forward events' },
      { status: 500 }
    );
  }
}
