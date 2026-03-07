/**
 * POST /api/password-health/check
 *
 * Accepts a plaintext password from the authenticated user, runs a full
 * health assessment (strength + HIBP breach + reuse detection), persists
 * the derived metrics (no raw password stored), and returns the result.
 *
 * Security notes:
 *  - The request body is validated immediately; the password is never logged.
 *  - The password is used in-memory only for hashing / HIBP check.
 *  - Only the calling user's own record is updated.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, generateErrorResponse } from '@/lib/auth';
import { assessPasswordHealth } from '@/lib/passwordHealthEngine';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json(generateErrorResponse('Authentication required'), { status: 401 });
    }

    // 2. Parse body
    const body = await req.json() as { password?: unknown };
    const password = body?.password;

    if (typeof password !== 'string' || password.length === 0) {
      return NextResponse.json(
        generateErrorResponse('A non-empty password string is required'),
        { status: 400 },
      );
    }

    if (password.length > 1024) {
      // Reject abnormally long inputs — prevents denial-of-service via HIBP calls
      return NextResponse.json(
        generateErrorResponse('Password too long (max 1024 characters)'),
        { status: 400 },
      );
    }

    // 3. Retrieve user email (for storing in the health record)
    await connectDB();
    const user = await User.findById(auth.userId).select('email').lean() as any;
    if (!user) {
      return NextResponse.json(generateErrorResponse('User not found'), { status: 404 });
    }

    // 4. Run full assessment (no raw password escaped from this scope)
    const assessment = await assessPasswordHealth(
      auth.userId,
      user.email as string,
      password,
      true, // checkBreachOnline
    );

    // 5. Return result — no raw password, no reuse hash, no SHA-1 in response
    return NextResponse.json({
      success: true,
      assessment: {
        strength: {
          score: assessment.strength.score,
          label: assessment.strength.strength,
          length: assessment.strength.length,
          hasUppercase: assessment.strength.hasUppercase,
          hasLowercase: assessment.strength.hasLowercase,
          hasNumbers: assessment.strength.hasNumbers,
          hasSpecialChars: assessment.strength.hasSpecialChars,
          isCommonPattern: assessment.strength.isCommonPattern,
          isDictionaryWord: assessment.strength.isDictionaryWord,
          entropy: assessment.strength.entropy,
        },
        breach: {
          isBreached: assessment.breach.isBreached,
          breachCount: assessment.breach.breachCount,
          checkedAt: assessment.breach.checkedAt,
          source: assessment.breach.source,
        },
        reuse: {
          isReused: assessment.isReused,
          affectedAccounts: assessment.reuseCount,
        },
        overallRisk: assessment.overallRisk,
        overallRiskScore: assessment.overallRiskScore,
        daysSincePasswordChange: assessment.daysSincePasswordChange,
        issues: assessment.issues,
        recommendations: assessment.recommendations,
      },
    });
  } catch (error) {
    console.error('[password-health/check] Error:', error);
    return NextResponse.json(generateErrorResponse('Internal server error'), { status: 500 });
  }
}
