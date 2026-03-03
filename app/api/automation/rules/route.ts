import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import AutomationRule from '@/models/AutomationRule';

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

    const rules = await AutomationRule.find({ createdBy: decoded.id })
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({ rules });
  } catch (error: any) {
    console.error('Error fetching automation rules:', error);
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

    const rule = new AutomationRule({
      ...body,
      createdBy: decoded.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      executionCount: 0,
      successCount: 0,
      failureCount: 0
    });

    await rule.save();

    return NextResponse.json({
      success: true,
      rule
    });
  } catch (error: any) {
    console.error('Error creating automation rule:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
