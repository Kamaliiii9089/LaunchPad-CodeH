/**
 * GET  /api/geofencing/stats
 *
 * Returns summary statistics for the geofencing dashboard panel:
 * - 30-day totals (total, blocked, challenged, allowed)
 * - Unique country count
 * - Top blocked country
 * - Proxy / VPN attempt count
 * - Per-country breakdown (top 20 by attempt volume)
 * - Daily activity series for the last 14 days
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { getGeofencingSummary, getLoginLocationStats } from '@/lib/geofencingEngine';
import GeoLoginLog from '@/models/GeoLoginLog';

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const { searchParams } = req.nextUrl;
    const days = parseInt(searchParams.get('days') || '30', 10);

    // Parallel fetch
    const [summary, locationStats, dailySeries, topFlags] = await Promise.all([
      getGeofencingSummary(),
      getLoginLocationStats(days),
      getDailySeries(14),
      getTopFlags(30),
    ]);

    return NextResponse.json({
      success: true,
      summary,
      locationStats,
      dailySeries,
      topFlags,
    });
  } catch (error: any) {
    console.error('[geofencing/stats GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 },
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns an array of { date: 'YYYY-MM-DD', blocked, challenged, allowed }
 * for the last `days` calendar days (UTC).
 */
async function getDailySeries(
  days: number,
): Promise<Array<{ date: string; blocked: number; challenged: number; allowed: number }>> {
  const since = new Date(Date.now() - days * 86_400_000);

  const rows = await GeoLoginLog.aggregate([
    { $match: { timestamp: { $gte: since } } },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          verdict: '$verdict',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.date': 1 } },
  ]);

  // Build a map from date → { blocked, challenged, allowed }
  const byDate: Record<string, { blocked: number; challenged: number; allowed: number }> = {};

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = d.toISOString().split('T')[0];
    byDate[key] = { blocked: 0, challenged: 0, allowed: 0 };
  }

  for (const row of rows) {
    const { date, verdict } = row._id;
    if (!byDate[date]) byDate[date] = { blocked: 0, challenged: 0, allowed: 0 };
    if (verdict === 'BLOCKED') byDate[date].blocked = row.count;
    else if (verdict === 'CHALLENGED') byDate[date].challenged = row.count;
    else if (verdict === 'ALLOWED') byDate[date].allowed = row.count;
  }

  return Object.entries(byDate).map(([date, counts]) => ({ date, ...counts }));
}

/**
 * Returns the top N flag values seen in the last `days` days with their counts.
 */
async function getTopFlags(
  days: number,
): Promise<Array<{ flag: string; count: number }>> {
  const since = new Date(Date.now() - days * 86_400_000);

  const rows = await GeoLoginLog.aggregate([
    { $match: { timestamp: { $gte: since }, flags: { $exists: true, $not: { $size: 0 } } } },
    { $unwind: '$flags' },
    { $group: { _id: '$flags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 15 },
  ]);

  return rows.map((r: any) => ({ flag: r._id as string, count: r.count as number }));
}
