import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ExternalIntegration from '@/models/ExternalIntegration';
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
    const type = searchParams.get('type');
    const enabled = searchParams.get('enabled');

    const query: any = {};
    if (type) query.type = type;
    if (enabled !== null) query.enabled = enabled === 'true';

    const integrations = await ExternalIntegration.find(query)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email');

    return NextResponse.json({ integrations });
  } catch (error: any) {
    console.error('Error fetching integrations:', error);
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

    const integration = await ExternalIntegration.create({
      ...body,
      createdBy: decoded.id,
      status: 'pending',
    });

    return NextResponse.json({ integration }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating integration:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
