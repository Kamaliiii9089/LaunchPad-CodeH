import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import BlockedIP from '@/models/BlockedIP';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    verify(token, JWT_SECRET);
    await connectDB();

    const blockedIP = await BlockedIP.findByIdAndUpdate(
      params.id,
      { 
        status: 'removed',
        isActive: false,
      },
      { new: true }
    );

    if (!blockedIP) {
      return NextResponse.json({ error: 'Blocked IP not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'IP unblocked' });
  } catch (error: any) {
    console.error('Error unblocking IP:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verify(token, JWT_SECRET) as any;
    await connectDB();

    const body = await request.json();
    const { action, reason } = body;

    if (action === 'whitelist') {
      const blockedIP = await BlockedIP.findByIdAndUpdate(
        params.id,
        {
          whitelisted: true,
          whitelistedBy: decoded.id,
          whitelistedAt: new Date(),
          whitelistReason: reason,
          isActive: false,
        },
        { new: true }
      );

      if (!blockedIP) {
        return NextResponse.json({ error: 'Blocked IP not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, blockedIP });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating blocked IP:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
