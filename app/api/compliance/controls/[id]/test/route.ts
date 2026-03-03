import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import ComplianceControl from '@/models/ComplianceControl';
import { complianceEngine } from '@/lib/complianceEngine';

// POST - Test a control
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
    const { result, findings, evidence, recommendations } = body;

    // Get IP and user agent from request
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '0.0.0.0';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const control = await complianceEngine.testControl(
      params.id,
      {
        userId: auth.userId,
        email: auth.email,
        role: 'Tester',
      },
      {
        result,
        findings,
        evidence: evidence || [],
        recommendations: recommendations || [],
      },
      ip,
      userAgent
    );

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
