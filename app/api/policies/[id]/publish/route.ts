import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Policy from '@/models/Policy';
import { PolicyEnforcementEngine } from '@/lib/policyEnforcementEngine';
import { verifyAuth } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const policy = await Policy.findById(params.id);

    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    if (policy.status !== 'approved') {
      return NextResponse.json(
        { error: 'Policy must be approved before publishing' },
        { status: 400 }
      );
    }

    policy.status = 'active';
    policy.publishedBy = user.userId as any;
    policy.publishedAt = new Date();

    if (!policy.effectiveDate) {
      policy.effectiveDate = new Date();
    }

    await policy.save();

    // Request acknowledgment from applicable users (you'd need to get user list based on roles)
    // For now, we'll just return success
    // await PolicyEnforcementEngine.requestAcknowledgment(params.id, userIds);

    return NextResponse.json({ policy });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
