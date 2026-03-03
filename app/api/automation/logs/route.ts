import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import ActionLog from '@/models/ActionLog';

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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const ruleId = searchParams.get('ruleId');
    const workflowId = searchParams.get('workflowId');
    const status = searchParams.get('status');

    const query: any = { triggerUserId: decoded.id };
    
    if (ruleId) query.ruleId = ruleId;
    if (workflowId) query.workflowId = workflowId;
    if (status) query.status = status;

    const logs = await ActionLog.find(query)
      .sort({ startedAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error('Error fetching execution logs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
