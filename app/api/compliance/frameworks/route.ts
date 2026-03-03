import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import ComplianceFramework from '@/models/ComplianceFramework';
import { complianceEngine } from '@/lib/complianceEngine';

// GET - List all frameworks with optional filters
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const code = searchParams.get('code');

    const query: any = { isActive: true };
    if (category) query.category = category;
    if (status) query.status = status;
    if (code) query.code = code;

    const frameworks = await ComplianceFramework.find(query)
      .populate('owner', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ overallComplianceScore: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      frameworks,
      count: frameworks.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new framework
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    const framework = new ComplianceFramework({
      ...body,
      owner: auth.userId,
      isActive: true,
    });

    await framework.save();

    return NextResponse.json({
      success: true,
      framework,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
