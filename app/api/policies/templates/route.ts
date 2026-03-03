import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import PolicyTemplate from '@/models/PolicyTemplate';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const standard = searchParams.get('standard');
    const isActive = searchParams.get('active');

    const query: any = {};
    if (category) query.category = category;
    if (standard) query.standard = standard;
    if (isActive !== null) query.isActive = isActive === 'true';

    const templates = await PolicyTemplate.find(query)
      .populate('createdBy', 'name email')
      .sort({ popularityScore: -1, createdAt: -1 });

    return NextResponse.json({ templates });
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
      name,
      description,
      category,
      standard,
      sections,
      tags,
      mandatoryFields,
      variables,
      enforcementLevel,
      applicableRoles,
      targetAudience,
      estimatedReadTime,
    } = body;

    const template = await PolicyTemplate.create({
      name,
      description,
      category,
      standard,
      sections,
      tags,
      mandatoryFields,
      variables,
      enforcementLevel,
      applicableRoles,
      targetAudience,
      estimatedReadTime,
      createdBy: user.userId,
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
