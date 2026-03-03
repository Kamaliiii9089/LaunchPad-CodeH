import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import ComplianceRequirement from '@/models/ComplianceRequirement';

// GET - List all requirements
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const frameworkId = searchParams.get('frameworkId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');

    const query: any = { isActive: true };
    if (frameworkId) query.frameworkId = frameworkId;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;

    const requirements = await ComplianceRequirement.find(query)
      .populate('frameworkId', 'name code')
      .populate('owner assignedTo', 'name email')
      .populate('controls')
      .sort({ priority: 1, compliancePercentage: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      requirements,
      count: requirements.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new requirement
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    const requirement = new ComplianceRequirement({
      ...body,
      owner: auth.userId,
      isActive: true,
    });

    await requirement.save();

    return NextResponse.json({
      success: true,
      requirement,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
