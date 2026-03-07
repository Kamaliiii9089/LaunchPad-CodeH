/**
 * POST /api/password-health/scan
 *
 * Admin-only endpoint that triggers a full platform scan:
 *  1. Reuse rescan – re-evaluates all password reuse flags across the platform
 *  2. Stale password update – recalculates daysSincePasswordChange for all users
 *  3. Returns summary statistics about the scan
 *
 * Note: This endpoint does NOT perform live HIBP checks in bulk since we
 * do not have access to users' plaintext passwords after they're hashed.
 * HIBP checks are performed individually when users submit their password
 * via the /check endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, generateErrorResponse } from '@/lib/auth';
import { runBulkReuseRescan, getPasswordHealthStats } from '@/lib/passwordHealthEngine';
import { connectDB } from '@/lib/mongodb';
import PasswordHealth from '@/models/PasswordHealth';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json(generateErrorResponse('Authentication required'), { status: 401 });
    }

    // 2. Admin-only guard
    await connectDB();
    const requestingUser = await User.findById(auth.userId).select('role').lean() as any;
    if (!requestingUser || requestingUser.role !== 'admin') {
      return NextResponse.json(
        generateErrorResponse('Admin access required'),
        { status: 403 },
      );
    }

    const scanStart = Date.now();

    // 3. Run reuse rescan (this also updates stale password counters)
    const recordsUpdated = await runBulkReuseRescan();

    // 4. Count stale passwords
    const stalePasswordThreshold = 90; // days
    const now = new Date();
    const staleCount = await PasswordHealth.countDocuments({
      daysSincePasswordChange: { $gt: stalePasswordThreshold },
    });

    // 5. Count reuse groups (each group = set of accounts sharing a password)
    const reuseGroups = await PasswordHealth.aggregate([
      { $match: { isReused: true } },
      { $group: { _id: '$passwordHashForReuse', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]);

    // 6. Count accounts not yet scanned
    const totalUsers = await User.countDocuments({
      authMethod: { $ne: 'sso' },
      isDeleted: { $ne: true },
    });
    const scannedUsers = await PasswordHealth.countDocuments();
    const unscannedUsers = Math.max(0, totalUsers - scannedUsers);

    // 7. Get post-scan stats
    const stats = await getPasswordHealthStats();

    const duration = Date.now() - scanStart;

    return NextResponse.json({
      success: true,
      scan: {
        completedAt: new Date(),
        durationMs: duration,
        recordsUpdated,
        stalePasswordsFound: staleCount,
        reuseGroupsFound: reuseGroups.length,
        totalAccountsScanned: scannedUsers,
        unscannedAccounts: unscannedUsers,
      },
      stats,
      message: `Scan complete. Updated ${recordsUpdated} records in ${duration}ms. ` +
        `Found ${reuseGroups.length} password reuse group(s) and ${staleCount} stale password(s).`,
    });
  } catch (error) {
    console.error('[password-health/scan] Error:', error);
    return NextResponse.json(generateErrorResponse('Internal server error'), { status: 500 });
  }
}

/**
 * GET /api/password-health/scan
 * Returns current scan stats without triggering a new one.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json(generateErrorResponse('Authentication required'), { status: 401 });
    }

    await connectDB();
    const requestingUser = await User.findById(auth.userId).select('role').lean() as any;
    if (!requestingUser || requestingUser.role !== 'admin') {
      return NextResponse.json(generateErrorResponse('Admin access required'), { status: 403 });
    }

    const stats = await getPasswordHealthStats();
    const latestScan = await PasswordHealth.findOne({})
      .sort({ lastScannedAt: -1 })
      .select('lastScannedAt')
      .lean() as any;

    return NextResponse.json({
      success: true,
      stats,
      lastScanAt: latestScan?.lastScannedAt || null,
    });
  } catch (error) {
    console.error('[password-health/scan GET] Error:', error);
    return NextResponse.json(generateErrorResponse('Internal server error'), { status: 500 });
  }
}
