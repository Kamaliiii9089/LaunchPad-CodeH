import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Policy from '@/models/Policy';
import { PolicyEnforcementEngine } from '@/lib/policyEnforcementEngine';
import { verifyAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const policy = await Policy.findById(params.id)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('publishedBy', 'name email')
      .populate('templateId', 'name description')
      .populate('relatedPolicies', 'title');

    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    return NextResponse.json({ policy });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const {
      title,
      description,
      sections,
      enforcementRules,
      changeType,
      changeSummary,
      changesDetail,
      impactLevel,
      requiresReacknowledgment,
    } = body;

    // Create new version
    await PolicyEnforcementEngine.createVersion(params.id, user.userId, {
      title,
      description,
      sections,
      enforcementRules,
      changeType: changeType || 'minor',
      changeSummary: changeSummary || 'Policy updated',
      changesDetail: changesDetail || { added: [], modified: [], removed: [] },
      impactLevel: impactLevel || 'medium',
      requiresReacknowledgment: requiresReacknowledgment || false,
    });

    const policy = await Policy.findById(params.id);

    return NextResponse.json({ policy });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const policy = await Policy.findByIdAndUpdate(
      params.id,
      {
        status: 'archived',
        archivedBy: user.userId,
        archivedAt: new Date(),
      },
      { new: true }
    );

    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Policy archived successfully', policy });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
