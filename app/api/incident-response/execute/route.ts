import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import IncidentPlaybook from '@/models/IncidentPlaybook';
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
    const { playbookId, incident, triggerReason } = body;

    if (!playbookId || !incident) {
      return NextResponse.json(
        { error: 'Playbook ID and incident details are required' },
        { status: 400 }
      );
    }

    const playbook = await IncidentPlaybook.findById(playbookId);
    if (!playbook) {
      return NextResponse.json({ error: 'Playbook not found' }, { status: 404 });
    }

    if (!playbook.enabled) {
      return NextResponse.json(
        { error: 'Playbook is disabled' },
        { status: 400 }
      );
    }

    // Execute the playbook
    const response = await IncidentResponseEngine.executePlaybook(
      incident,
      playbook,
      'manual',
      decoded.id,
      triggerReason
    );

    return NextResponse.json({
      success: true,
      response,
      message: 'Playbook execution started',
    });
  } catch (error: any) {
    console.error('Error executing playbook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
