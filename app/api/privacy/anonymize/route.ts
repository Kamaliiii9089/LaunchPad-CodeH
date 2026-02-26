import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { generatePseudonym, maskPII } from '@/lib/piiDetector';

/**
 * Anonymize user's personal data
 * POST /api/privacy/anonymize
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

    // Get user
    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Track how many fields were anonymized
    let fieldsAnonymized = 0;

    // Anonymize name with pseudonym
    if (user.name && !user.name.startsWith('user_')) {
      user.name = generatePseudonym(user.name + user._id);
      fieldsAnonymized++;
    }

    // Anonymize email (keep functional but anonymized)
    if (user.email && !user.email.includes('anonymized')) {
      const domain = user.email.split('@')[1] || 'example.com';
      user.email = `anonymized_${generatePseudonym(user.email)}@${domain}`;
      fieldsAnonymized++;
    }

    // Anonymize device information
    if (user.trustedDevices && user.trustedDevices.length > 0) {
      user.trustedDevices = user.trustedDevices.map((device: any) => ({
        ...device,
        deviceName: 'Anonymized Device',
        ip: device.ip ? maskPII(device.ip, 'ipv4') : undefined,
        location: 'Anonymized Location',
      }));
      fieldsAnonymized++;
    }

    // Mark user as anonymized
    user.isAnonymized = true;
    user.anonymizedAt = new Date();

    // Save changes
    await user.save();

    return NextResponse.json({
      success: true,
      fieldsAnonymized,
      message: `Successfully anonymized ${fieldsAnonymized} data fields`,
    });
  } catch (error: any) {
    console.error('Data anonymization error:', error);
    return NextResponse.json(
      { error: 'Failed to anonymize data' },
      { status: 500 }
    );
  }
}
