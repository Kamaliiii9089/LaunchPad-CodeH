import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import AutomationRule from '@/models/AutomationRule';
import { AutomationEngine } from '@/lib/automationEngine';
import { randomBytes } from 'crypto';

function uuidv4() {
  return randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const rule = await AutomationRule.findOne({
      _id: params.id,
      createdBy: decoded.id
    });

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({ rule });
  } catch (error: any) {
    console.error('Error fetching rule:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const rule = await AutomationRule.findOneAndUpdate(
      { _id: params.id, createdBy: decoded.id },
      { ...body, updatedAt: new Date() },
      { new: true }
    );

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, rule });
  } catch (error: any) {
    console.error('Error updating rule:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const rule = await AutomationRule.findOneAndDelete({
      _id: params.id,
      createdBy: decoded.id
    });

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Rule deleted' });
  } catch (error: any) {
    console.error('Error deleting rule:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const rule = await AutomationRule.findOne({
      _id: params.id,
      createdBy: decoded.id
    });

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Manual execution
    const body = await request.json();
    const event = body.event || {};

    const context = {
      executionId: uuidv4(),
      event,
      variables: new Map(),
      userId: decoded.id
    };

    const shouldExecute = await AutomationEngine.evaluateRule(rule, context);

    if (!shouldExecute) {
      return NextResponse.json({
        success: false,
        message: 'Rule conditions not met'
      });
    }

    const result = await AutomationEngine.executeRule(rule, context, decoded.id);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error executing rule:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
