import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import ApprovalRequest from '@/models/ApprovalRequest';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get approval requests where user is an approver or requester
    const approvals = await ApprovalRequest.find({
      $or: [
        { approvers: decoded.id },
        { requestedBy: decoded.id }
      ]
    })
      .populate('requestedBy', 'name email')
      .populate('reviewedBy', 'name email')
      .sort({ priority: -1, requestedAt: -1 })
      .lean();

    return NextResponse.json({ approvals });
  } catch (error: any) {
    console.error('Error fetching approvals:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
