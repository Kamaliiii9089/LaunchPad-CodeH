import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import { verifyToken } from '@/lib/auth';

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

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: code,
      window: 2, // Allow 2 steps before/after for time sync issues
    });

    return NextResponse.json({
      success: true,
      verified,
      message: verified ? 'Code verified successfully' : 'Invalid code',
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 });
  }
}
