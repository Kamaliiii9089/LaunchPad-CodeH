import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import Workflow from '@/models/Workflow';

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

    const workflows = await Workflow.find({ createdBy: decoded.id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ workflows });
  } catch (error: any) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    const workflow = new Workflow({
      ...body,
      createdBy: decoded.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      averageExecutionTime: 0
    });

    await workflow.save();

    return NextResponse.json({
      success: true,
      workflow
    });
  } catch (error: any) {
    console.error('Error creating workflow:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
