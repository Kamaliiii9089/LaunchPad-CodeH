import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
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

    // Generate new backup codes
    const backupCodes = [];
    for (let i = 0; i < 8; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push(code);
    }

    // Hash backup codes before storing
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcryptjs.hash(code, 10))
    );

    user.backupCodes = hashedBackupCodes;
    await user.save();

    return NextResponse.json({
      success: true,
      backupCodes,
      message: 'Backup codes regenerated successfully. Save them in a secure place.',
    });
  } catch (error) {
    console.error('Backup codes regeneration error:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate backup codes' },
      { status: 500 }
    );
  }
}
