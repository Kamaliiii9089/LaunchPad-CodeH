import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { IncidentResponseEngine } from '@/lib/incidentResponseEngine';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verify(token, JWT_SECRET) as any;
    await connectDB();

    const body = await request.json();
    const { responseId, action, notes } = body;

    if (!responseId || !action) {
      return NextResponse.json(
        { error: 'Response ID and action are required' },
        { status: 400 }
      );
    }

    let response;

    if (action === 'approve') {
      response = await IncidentResponseEngine.approveResponse(
        responseId,
        decoded.id,
        notes
      );
    } else if (action === 'reject') {
      response = await IncidentResponseEngine.rejectResponse(
        responseId,
        decoded.id,
        notes
      );
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "approve" or "reject"' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      response,
      message: `Response ${action}ed successfully`,
    });
  } catch (error: any) {
    console.error('Error processing approval:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
