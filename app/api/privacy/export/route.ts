import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { maskObjectPII } from '@/lib/piiDetector';

/**
 * Export user's personal data (GDPR/CCPA compliance)
 * POST /api/privacy/export
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

    // Get user data (excluding sensitive auth fields)
    const user = await User.findById(decoded.id).select('-password -twoFactorSecret -backupCodes');
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prepare comprehensive data export
    const exportData = {
      exportDate: new Date().toISOString(),
      exportType: 'Personal Data Export',
      requestedBy: user.email,
      dataCategories: {
        accountInformation: {
          userId: user._id,
          name: user.name,
          email: user.email,
          accountCreated: user.createdAt,
          emailVerified: user.isVerified,
          verifiedAt: user.verifiedAt,
        },
        securitySettings: {
          twoFactorEnabled: user.twoFactorEnabled,
          twoFactorEnabledAt: user.twoFactorEnabledAt,
          lastPasswordChange: user.lastPasswordChange || 'Never',
        },
        devices: user.trustedDevices || [],
        preferences: {
          // Add any user preferences here
        },
        activityLog: {
          lastLogin: user.lastLogin || 'N/A',
          loginCount: user.loginCount || 0,
        },
      },
      legalNotice: {
        gdprCompliance: true,
        ccpaCompliance: true,
        dataRetentionPolicy: 'Data is retained for the duration of account activity. You may request deletion at any time.',
        rightsInformation: 'You have the right to access, rectify, delete, and port your personal data.',
      },
    };

    // Convert to JSON string with formatting
    const jsonData = JSON.stringify(exportData, null, 2);
    
    // Create response with downloadable file
    return new NextResponse(jsonData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="personal_data_export_${Date.now()}.json"`,
      },
    });
  } catch (error: any) {
    console.error('Data export error:', error);
    return NextResponse.json(
      { error: 'Failed to export personal data' },
      { status: 500 }
    );
  }
}
