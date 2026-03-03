import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import IncidentPlaybook from '@/models/IncidentPlaybook';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verify(token, JWT_SECRET) as any;
    await connectDB();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const enabled = searchParams.get('enabled');
    const autoTrigger = searchParams.get('autoTrigger');

    const query: any = {};
    if (category) query.category = category;
    if (enabled !== null) query.enabled = enabled === 'true';
    if (autoTrigger !== null) query.autoTrigger = autoTrigger === 'true';

    const playbooks = await IncidentPlaybook.find(query)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email');

    return NextResponse.json({ playbooks });
  } catch (error: any) {
    console.error('Error fetching playbooks:', error);
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

    const playbook = await IncidentPlaybook.create({
      ...body,
      createdBy: decoded.id,
    });

    return NextResponse.json({ playbook }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating playbook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
