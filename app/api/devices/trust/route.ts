import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * POST /api/devices/trust
 * Mark a device as trusted (requires 2FA verification)
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
    const { deviceId, code } = body;

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findById(decoded.userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If 2FA is enabled, require verification
    if (user.twoFactorEnabled) {
      if (!code) {
        return NextResponse.json(
          { error: '2FA code is required' },
          { status: 400 }
        );
      }

      // Verify 2FA code
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: code,
        window: 2,
      });

      if (!verified) {
        // Check backup codes
        const backupCodeIndex = user.backupCodes?.findIndex(
          (bc: any) => bc.code === code && !bc.used
        );

        if (backupCodeIndex === -1 || backupCodeIndex === undefined) {
          return NextResponse.json(
            { error: 'Invalid 2FA code' },
            { status: 400 }
          );
        }

        // Mark backup code as used
        user.backupCodes[backupCodeIndex].used = true;
        user.backupCodes[backupCodeIndex].usedAt = new Date();
      }
    }

    // Find and trust the device
    const device = (user.trustedDevices || []).find(
      (d: any) => d.deviceId === deviceId
    );

    if (!device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    device.isTrusted = true;
    device.trustedAt = new Date();

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Device marked as trusted',
      device: {
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        isTrusted: device.isTrusted,
        trustedAt: device.trustedAt,
      },
    });
  } catch (error: any) {
    console.error('Trust device error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to trust device' },
      { status: 500 }
    );
  }
}
