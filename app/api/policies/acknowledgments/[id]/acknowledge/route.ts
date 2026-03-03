import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
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

    const body = await req.json();
    const {
      signature,
      signatureMethod,
      readTime,
      scrollPercentage,
      questionsAnswered,
      quizScore,
      ipAddress,
      userAgent,
      deviceFingerprint,
    } = body;

    const acknowledgment = await PolicyEnforcementEngine.acknowledge(
      params.id,
      user.userId,
      {
        signature,
        signatureMethod,
        readTime,
        scrollPercentage,
        questionsAnswered,
        quizScore,
        ipAddress,
        userAgent,
        deviceFingerprint,
      }
    );

    return NextResponse.json({ acknowledgment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
