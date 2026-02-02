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

    const { code, secret } = await request.json();

    if (!code || !secret) {
      return NextResponse.json(
        { error: 'Code and secret are required' },
        { status: 400 }
      );
    }

    // Verify the token first
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 8; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push(code);
    }

    // Hash backup codes before storing
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcryptjs.hash(code, 10))
    );

    // Enable 2FA and save secret and backup codes
    user.twoFactorEnabled = true;
    user.twoFactorSecret = secret;
    user.backupCodes = hashedBackupCodes;
    await user.save();

    return NextResponse.json({
      success: true,
      backupCodes,
      message: '2FA enabled successfully. Save your backup codes in a secure place.',
    });
  } catch (error) {
    console.error('2FA enable error:', error);
    return NextResponse.json({ error: 'Failed to enable 2FA' }, { status: 500 });
  }
}
