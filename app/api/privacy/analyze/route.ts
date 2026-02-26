import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { analyzePrivacy } from '@/lib/piiDetector';

/**
 * Analyze user data for PII and privacy compliance
 * POST /api/privacy/analyze
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Get user data
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prepare user data for analysis
    const userData = {
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      isVerified: user.isVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      // Add any other non-sensitive fields you want to analyze
    };

    // Analyze the data for PII
    const analysis = analyzePrivacy(userData);

    return NextResponse.json({
      success: true,
      analysis,
      message: 'Privacy analysis completed successfully',
    });
  } catch (error: any) {
    console.error('Privacy analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze privacy data' },
      { status: 500 }
    );
  }
}
