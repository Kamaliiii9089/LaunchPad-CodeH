import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(decoded.id).select('+twoFactorSecret');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 });
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret!,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.backupCodes = undefined;
    await user.save();

    return NextResponse.json({
      success: true,
      message: '2FA disabled successfully',
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 });
  }
}
