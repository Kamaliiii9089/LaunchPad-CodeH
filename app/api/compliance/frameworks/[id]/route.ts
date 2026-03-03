import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import ComplianceFramework from '@/models/ComplianceFramework';
import { complianceEngine } from '@/lib/complianceEngine';

// GET - Get single framework
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const framework = await ComplianceFramework.findById(params.id)
      .populate('owner', 'name email')
      .populate('assignedTo', 'name email')
      .lean();

    if (!framework) {
      return NextResponse.json({ error: 'Framework not found' }, { status: 404 });
    }

    // Get compliance breakdown
    const complianceData = await complianceEngine.calculateFrameworkCompliance(params.id);

    return NextResponse.json({
      success: true,
      framework,
      compliance: complianceData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update framework
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    const framework = await ComplianceFramework.findByIdAndUpdate(
      params.id,
      { $set: body },
      { new: true }
    ).populate('owner assignedTo', 'name email');

    if (!framework) {
      return NextResponse.json({ error: 'Framework not found' }, { status: 404 });
    }

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

// DELETE - Delete (archive) framework
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const framework = await ComplianceFramework.findByIdAndUpdate(
      params.id,
      { $set: { status: 'archived', isActive: false } },
      { new: true }
    );

    if (!framework) {
      return NextResponse.json({ error: 'Framework not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Framework archived successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
