import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import PolicyVersion from '@/models/PolicyVersion';
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

    const versions = await PolicyVersion.find({ policyId: params.id })
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('publishedBy', 'name email')
      .sort({ version: -1 });

    return NextResponse.json({ versions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
