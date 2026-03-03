import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import BlockedIP from '@/models/BlockedIP';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    verify(token, JWT_SECRET);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const whitelisted = searchParams.get('whitelisted');
    const limit = parseInt(searchParams.get('limit') || '100');

    const query: any = {};
    if (status) query.status = status;
    if (whitelisted !== null) query.whitelisted = whitelisted === 'true';

    const blockedIPs = await BlockedIP.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('blockedByUser', 'name email')
      .populate('playbookId', 'name')
      .populate('whitelistedBy', 'name email');

    const stats = {
      total: await BlockedIP.countDocuments(),
      active: await BlockedIP.countDocuments({ status: 'active', isActive: true }),
      expired: await BlockedIP.countDocuments({ status: 'expired' }),
      whitelisted: await BlockedIP.countDocuments({ whitelisted: true }),
    };

    return NextResponse.json({ blockedIPs, stats });
  } catch (error: any) {
    console.error('Error fetching blocked IPs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verify(token, JWT_SECRET) as any;
    await connectDB();

    const body = await request.json();

    const blockedIP = await BlockedIP.create({
      ...body,
      blockedBy: 'manual',
      blockedByUser: decoded.id,
    });

    return NextResponse.json({ blockedIP }, { status: 201 });
  } catch (error: any) {
    console.error('Error blocking IP:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
