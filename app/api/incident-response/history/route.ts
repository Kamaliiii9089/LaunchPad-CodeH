import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import IncidentResponse from '@/models/IncidentResponse';
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
    const severity = searchParams.get('severity');
    const playbookId = searchParams.get('playbookId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: any = {};
    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (playbookId) query.playbookId = playbookId;

    const responses = await IncidentResponse.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('playbookId', 'name category')
      .populate('triggeredByUser', 'name email')
      .populate('approvedBy', 'name email');

    // Calculate statistics
    const stats = {
      total: await IncidentResponse.countDocuments(),
      completed: await IncidentResponse.countDocuments({ status: 'completed' }),
      running: await IncidentResponse.countDocuments({ status: 'running' }),
      failed: await IncidentResponse.countDocuments({ status: 'failed' }),
      awaitingApproval: await IncidentResponse.countDocuments({ status: 'awaiting_approval' }),
      totalThreatsBlocked: await IncidentResponse.aggregate([
        { $group: { _id: null, total: { $sum: '$threatsBlocked' } } }
      ]).then(res => res[0]?.total || 0),
      totalIPsBlocked: await IncidentResponse.aggregate([
        { $group: { _id: null, total: { $sum: '$ipsBlocked' } } }
      ]).then(res => res[0]?.total || 0),
    };

    return NextResponse.json({ responses, stats });
  } catch (error: any) {
    console.error('Error fetching incident responses:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
