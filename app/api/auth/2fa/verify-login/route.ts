import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import bcryptjs from 'bcryptjs';
import { generateToken } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const { userId, code } = await request.json();

    if (!userId || !code) {
      return NextResponse.json(
        { error: 'User ID and code are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(userId).select('+twoFactorSecret +backupCodes');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 });
    }

    let verified = false;
    let usedBackupCode = false;

    // First try TOTP verification
    if (user.twoFactorSecret) {
      verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: code,
        window: 2,
      });
    }

    // If TOTP fails, try backup codes
    if (!verified && user.backupCodes && user.backupCodes.length > 0) {
      for (let i = 0; i < user.backupCodes.length; i++) {
        const isMatch = await bcryptjs.compare(code, user.backupCodes[i]);
        if (isMatch) {
          verified = true;
          usedBackupCode = true;
          // Remove used backup code
          user.backupCodes.splice(i, 1);
          await user.save();
          break;
        }
      }
    }

    if (!verified) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    // Generate JWT token
    const token = generateToken(user._id.toString());

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        twoFactorEnabled: user.twoFactorEnabled,
      },
      usedBackupCode,
      remainingBackupCodes: user.backupCodes?.length || 0,
      message: usedBackupCode
        ? `Login successful. You have ${user.backupCodes?.length || 0} backup codes remaining.`
        : 'Login successful',
    });
  } catch (error) {
    console.error('2FA login verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify 2FA code' },
      { status: 500 }
    );
  }
}
