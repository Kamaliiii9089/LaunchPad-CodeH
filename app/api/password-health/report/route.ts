/**
 * GET /api/password-health/report
 *
 * Returns the platform-wide password health report (admin only).
 * Supports pagination for the per-user breakdown.
 * No actual passwords are exposed in any response.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, generateErrorResponse } from '@/lib/auth';
import { generatePlatformHealthReport } from '@/lib/passwordHealthEngine';
import { connectDB } from '@/lib/mongodb';
import PasswordHealth from '@/models/PasswordHealth';
import User from '@/models/User';

export async function GET(req: NextRequest) {
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

    // 3. Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const riskFilter = searchParams.get('risk') || '';
    const includeBreached = searchParams.get('breached') === 'true';
    const includeReused = searchParams.get('reused') === 'true';
    const sortBy = searchParams.get('sort') || 'risk'; // 'risk' | 'strength' | 'lastScanned'

    // 4. Generate platform summary
    const report = await generatePlatformHealthReport();

    // 5. Per-user paginated breakdown (admin view — no passwords)
    const baseQuery: Record<string, any> = {};
    if (riskFilter && ['critical', 'high', 'medium', 'low', 'none'].includes(riskFilter)) {
      baseQuery.overallRisk = riskFilter;
    }
    if (includeBreached) baseQuery.isBreached = true;
    if (includeReused) baseQuery.isReused = true;

    let sortSpec: Record<string, 1 | -1>;
    if (sortBy === 'strength') sortSpec = { strengthScore: 1 };
    else if (sortBy === 'lastScanned') sortSpec = { lastScannedAt: -1 };
    else sortSpec = { overallRiskScore: -1 };

    const totalCount = await PasswordHealth.countDocuments(baseQuery);
    const userRecords = await PasswordHealth.find(baseQuery)
      .sort(sortSpec)
      .skip((page - 1) * limit)
      .limit(limit)
      .select(
        // Explicitly exclude any sensitive-adjacent fields; keep only aggregated metrics
        'userId email strength strengthScore overallRisk overallRiskScore ' +
        'isBreached breachCount isReused reuseCount daysSincePasswordChange ' +
        'lastScannedAt issues recommendations passwordLength ' +
        'hasUppercase hasLowercase hasNumbers hasSpecialChars isCommonPattern isDictionaryWord',
      )
      .lean();

    return NextResponse.json({
      success: true,
      report,
      users: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        records: userRecords,
      },
    });
  } catch (error) {
    console.error('[password-health/report] Error:', error);
    return NextResponse.json(generateErrorResponse('Internal server error'), { status: 500 });
  }
}
