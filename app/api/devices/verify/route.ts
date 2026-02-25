import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
import { processFingerprint, calculateDeviceTrustScore, shouldTrustDevice, requiresAdditionalVerification } from '@/lib/deviceFingerprint';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * POST /api/devices/verify
 * Verify the current device and check if it's trusted
 */
export async function POST(req: NextRequest) {
  try {
    // Get token from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const body = await req.json();
    const { clientFingerprint } = body;

    if (!clientFingerprint) {
      return NextResponse.json(
        { error: 'Device fingerprint is required' },
        { status: 400 }
      );
    }

    // Get client IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               'unknown';

    // Process fingerprint with server-side analysis
    const fingerprint = processFingerprint(clientFingerprint, ip);

    await connectDB();
    const user = await User.findById(decoded.userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find existing device
    let existingDevice = (user.trustedDevices || []).find(
      (device: any) => device.deviceId === fingerprint.deviceId
    );

    let trustScore = 50;
    let isNewDevice = !existingDevice;

    if (existingDevice) {
      // Update trust score for existing device
      trustScore = calculateDeviceTrustScore({
        firstSeen: existingDevice.firstSeen,
        lastUsed: existingDevice.lastUsed,
        loginCount: existingDevice.loginCount || 0,
        failedAttempts: existingDevice.failedAttempts || 0,
        securityScore: fingerprint.securityScore,
      });

      // Update device info
      existingDevice.lastUsed = new Date();
      existingDevice.trustScore = trustScore;
      existingDevice.securityScore = fingerprint.securityScore;
      existingDevice.ip = ip;
      existingDevice.loginCount = (existingDevice.loginCount || 0) + 1;
      existingDevice.suspiciousFlags = fingerprint.suspiciousFlags;

      // Auto-trust if criteria met
      if (!existingDevice.isTrusted && shouldTrustDevice(fingerprint, trustScore)) {
        existingDevice.isTrusted = true;
      }
    } else {
      // New device
      const deviceName = `${fingerprint.browser.name} on ${fingerprint.os.name}`;
      
      existingDevice = {
        deviceId: fingerprint.deviceId,
        deviceName,
        deviceType: fingerprint.device.type,
        browser: `${fingerprint.browser.name} ${fingerprint.browser.version}`,
        os: `${fingerprint.os.name} ${fingerprint.os.version}`,
        firstSeen: new Date(),
        lastUsed: new Date(),
        trustScore,
        isTrusted: false,
        ip,
        location: fingerprint.location?.city || fingerprint.location?.country,
        securityScore: fingerprint.securityScore,
        suspiciousFlags: fingerprint.suspiciousFlags,
        loginCount: 1,
        failedAttempts: 0,
      };

      user.trustedDevices = user.trustedDevices || [];
      user.trustedDevices.push(existingDevice);
    }

    await user.save();

    // Determine if additional verification is needed
    const needAdditionalVerification = requiresAdditionalVerification(fingerprint);

    return NextResponse.json({
      success: true,
      device: {
        deviceId: fingerprint.deviceId,
        deviceName: existingDevice.deviceName,
        isNewDevice,
        isTrusted: existingDevice.isTrusted,
        trustScore,
        securityScore: fingerprint.securityScore,
        suspiciousFlags: fingerprint.suspiciousFlags,
        requiresVerification: needAdditionalVerification || (!existingDevice.isTrusted && isNewDevice),
      },
    });
  } catch (error: any) {
    console.error('Verify device error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to verify device' },
      { status: 500 }
    );
  }
}
