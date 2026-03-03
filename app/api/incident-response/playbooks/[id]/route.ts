import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import IncidentPlaybook from '@/models/IncidentPlaybook';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function GET(
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

    const playbook = await IncidentPlaybook.findById(params.id)
      .populate('createdBy', 'name email')
      .populate('approvers', 'name email');

    if (!playbook) {
      return NextResponse.json({ error: 'Playbook not found' }, { status: 404 });
    }

    return NextResponse.json({ playbook });
  } catch (error: any) {
    console.error('Error fetching playbook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
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

    const body = await request.json();

    const playbook = await IncidentPlaybook.findByIdAndUpdate(
      params.id,
      { 
        ...body,
        $inc: { version: 1 }
      },
      { new: true }
    );

    if (!playbook) {
      return NextResponse.json({ error: 'Playbook not found' }, { status: 404 });
    }

    return NextResponse.json({ playbook });
  } catch (error: any) {
    console.error('Error updating playbook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

    const playbook = await IncidentPlaybook.findByIdAndDelete(params.id);

    if (!playbook) {
      return NextResponse.json({ error: 'Playbook not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Playbook deleted' });
  } catch (error: any) {
    console.error('Error deleting playbook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
