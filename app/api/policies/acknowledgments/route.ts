import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import PolicyAcknowledgment from '@/models/PolicyAcknowledgment';
import { PolicyEnforcementEngine } from '@/lib/policyEnforcementEngine';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const policyId = searchParams.get('policyId');
    const userId = searchParams.get('userId') || user.userId;
    const status = searchParams.get('status');

    const query: any = {};
    if (policyId) query.policyId = policyId;
    if (userId) query.userId = userId;
    if (status) query.status = status;

    const acknowledgments = await PolicyAcknowledgment.find(query)
      .populate('policyId', 'title category version')
      .populate('userId', 'name email')
      .populate('witnessedBy', 'name email')
      .sort({ createdAt: -1 });

    // Get statistics for user
    const stats = {
      total: await PolicyAcknowledgment.countDocuments({ userId }),
      pending: await PolicyAcknowledgment.countDocuments({ userId, status: 'pending' }),
      acknowledged: await PolicyAcknowledgment.countDocuments({
        userId,
        status: 'acknowledged',
      }),
      expired: await PolicyAcknowledgment.countDocuments({ userId, status: 'expired' }),
    };

    return NextResponse.json({ acknowledgments, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const { policyId, userIds, expiresInDays } = body;

    const count = await PolicyEnforcementEngine.requestAcknowledgment(
      policyId,
      userIds,
      expiresInDays
    );

    return NextResponse.json({
      message: `${count} acknowledgment requests created`,
      count,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
