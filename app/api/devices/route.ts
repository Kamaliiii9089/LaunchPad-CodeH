import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * GET /api/devices
 * Get all trusted devices for the current user
 */
export async function GET(req: NextRequest) {
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

    await connectDB();
    const user = await User.findById(decoded.userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return trusted devices (without sensitive session data)
    const devices = (user.trustedDevices || []).map((device: any) => ({
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      browser: device.browser,
      os: device.os,
      lastUsed: device.lastUsed,
      firstSeen: device.firstSeen,
      trustScore: device.trustScore,
      isTrusted: device.isTrusted,
      ip: device.ip,
      location: device.location,
      securityScore: device.securityScore,
      loginCount: device.loginCount,
    }));

    return NextResponse.json({
      success: true,
      devices,
    });
  } catch (error: any) {
    console.error('Get devices error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get devices' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/devices
 * Remove a trusted device
 */
export async function DELETE(req: NextRequest) {
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

    const { deviceId } = await req.json();

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

    // Remove device from trusted devices
    user.trustedDevices = (user.trustedDevices || []).filter(
      (device: any) => device.deviceId !== deviceId
    );

    // Remove device from active sessions
    user.activeSessions = (user.activeSessions || []).filter(
      (session: any) => session.deviceId !== deviceId
    );

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Device removed successfully',
    });
  } catch (error: any) {
    console.error('Remove device error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to remove device' },
      { status: 500 }
    );
  }
}
