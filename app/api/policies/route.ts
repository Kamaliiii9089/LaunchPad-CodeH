import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Policy from '@/models/Policy';
import { PolicyEnforcementEngine } from '@/lib/policyEnforcementEngine';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    const query: any = {};
    if (status) query.status = status;
    if (category) query.category = category;

    const policies = await Policy.find(query)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('templateId', 'name')
      .sort({ createdAt: -1 });

    // Get statistics
    const stats = await PolicyEnforcementEngine.getPolicyStats();

    return NextResponse.json({ policies, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
      category,
      templateId,
      sections,
      enforcementRules,
      applicableRoles,
      exemptRoles,
      requiresAcknowledgment,
      acknowledgmentDeadline,
      tags,
      effectiveDate,
      expirationDate,
      reviewFrequency,
    } = body;

    // Calculate next review date
    const nextReviewDate = reviewFrequency
      ? new Date(Date.now() + reviewFrequency * 24 * 60 * 60 * 1000)
      : undefined;

    const policy = await Policy.create({
      title,
      description,
      category,
      templateId,
      sections,
      enforcementRules,
      applicableRoles,
      exemptRoles,
      requiresAcknowledgment,
      acknowledgmentDeadline,
      tags,
      effectiveDate,
      expirationDate,
      reviewFrequency,
      nextReviewDate,
      createdBy: user.userId,
      changeLog: [
        {
          version: 1,
          changes: 'Initial policy creation',
          changedBy: user.userId,
          changedAt: new Date(),
        },
      ],
    });

    return NextResponse.json({ policy }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
