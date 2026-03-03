import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import ComplianceRequirement from '@/models/ComplianceRequirement';
import { complianceEngine } from '@/lib/complianceEngine';

// POST - Assess a requirement
export async function POST(
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
    const { status, compliancePercentage, findings, recommendations, evidence } = body;

    // Get IP and user agent from request
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '0.0.0.0';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const requirement = await complianceEngine.assessRequirement(
      params.id,
      {
        userId: auth.userId,
        email: auth.email,
        role: 'Assessor',
      },
      {
        status,
        compliancePercentage,
        findings,
        recommendations,
        evidence,
      },
      ip,
      userAgent
    );

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
