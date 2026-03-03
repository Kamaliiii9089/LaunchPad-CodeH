import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import ComplianceControl from '@/models/ComplianceControl';

// GET - List all controls
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const frameworkId = searchParams.get('frameworkId');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const effectiveness = searchParams.get('effectiveness');

    let query: any = { isActive: true };
    if (frameworkId) query['frameworks.frameworkId'] = frameworkId;
    if (category) query.category = category;
    if (status) query.status = status;
    if (effectiveness) query.effectiveness = effectiveness;

    const controls = await ComplianceControl.find(query)
      .populate('owner implementer approver', 'name email')
      .populate('frameworks.frameworkId', 'name code')
      .sort({ priority: 1, effectivenessScore: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      controls,
      count: controls.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new control
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    const control = new ComplianceControl({
      ...body,
      owner: auth.userId,
      implementer: auth.userId,
      isActive: true,
    });

    await control.save();

    return NextResponse.json({
      success: true,
      control,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
