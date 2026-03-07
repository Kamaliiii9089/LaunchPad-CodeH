/**
 * GET  /api/geofencing/logs?limit=50&verdict=BLOCKED&page=1
 *
 * Returns paginated geo-login log entries.
 * Supports filtering by verdict (ALLOWED | CHALLENGED | BLOCKED),
 * countryCode, email, isProxy, and date range.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import GeoLoginLog from '@/models/GeoLoginLog';

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const { searchParams } = req.nextUrl;
    const verdict = searchParams.get('verdict');       // ALLOWED | CHALLENGED | BLOCKED
    const countryCode = searchParams.get('countryCode'); // e.g. CN, RU
    const email = searchParams.get('email');
    const isProxy = searchParams.get('isProxy');        // 'true' | 'false'
    const since = searchParams.get('since');            // ISO date string
    const until = searchParams.get('until');            // ISO date string
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    // Build MongoDB query
    const query: Record<string, any> = {};

    if (verdict && ['ALLOWED', 'CHALLENGED', 'BLOCKED'].includes(verdict)) {
      query.verdict = verdict;
    }
    if (countryCode) {
      query.countryCode = countryCode.toUpperCase();
    }
    if (email) {
      query.email = { $regex: email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }
    if (isProxy === 'true') {
      query.isProxy = true;
    } else if (isProxy === 'false') {
      query.isProxy = false;
    }

    // Date range
    const dateFilter: Record<string, Date> = {};
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) dateFilter.$gte = sinceDate;
    }
    if (until) {
      const untilDate = new Date(until);
      if (!isNaN(untilDate.getTime())) dateFilter.$lte = untilDate;
    }
    if (Object.keys(dateFilter).length > 0) {
      query.timestamp = dateFilter;
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      GeoLoginLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      GeoLoginLog.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error: any) {
    console.error('[geofencing/logs GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch logs' },
      { status: 500 },
    );
  }
}

// DELETE /api/geofencing/logs?olderThanDays=90  – purge old logs
export async function DELETE(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const { searchParams } = req.nextUrl;
    const days = parseInt(searchParams.get('olderThanDays') || '90', 10);

    if (days < 1) {
      return NextResponse.json(
        { success: false, error: 'olderThanDays must be >= 1' },
        { status: 422 },
      );
    }

    const cutoff = new Date(Date.now() - days * 86_400_000);
    const result = await GeoLoginLog.deleteMany({ timestamp: { $lt: cutoff } });

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount ?? 0,
    });
  } catch (error: any) {
    console.error('[geofencing/logs DELETE]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to purge logs' },
      { status: 500 },
    );
  }
}
