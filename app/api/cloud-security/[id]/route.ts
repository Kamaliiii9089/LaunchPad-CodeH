/**
 * Single cloud security config
 * GET    /api/cloud-security/[id]
 * PUT    /api/cloud-security/[id]
 * DELETE /api/cloud-security/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import CloudSecurityConfig from '@/models/CloudSecurityConfig';

interface Params { params: { id: string } }

const SENSITIVE = '-awsConfig.secretAccessKey -azureConfig.clientSecret -gcpConfig.serviceAccountKey';

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const config = await CloudSecurityConfig.findOne({ _id: params.id, createdBy: auth.userId }).select(SENSITIVE);
    if (!config) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    await connectDB();

    const update: Record<string, unknown> = {
      name: body.name,
      description: body.description,
      enabled: body.enabled,
    };

    if (body.awsConfig)      update.awsConfig      = body.awsConfig;
    if (body.azureConfig)    update.azureConfig    = body.azureConfig;
    if (body.gcpConfig)      update.gcpConfig      = body.gcpConfig;
    if (body.forwardingRules) update.forwardingRules = body.forwardingRules;

    const config = await CloudSecurityConfig.findOneAndUpdate(
      { _id: params.id, createdBy: auth.userId },
      { $set: update },
      { new: true }
    );

    if (!config) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const config = await CloudSecurityConfig.findOneAndDelete({ _id: params.id, createdBy: auth.userId });
    if (!config) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true, message: 'Cloud security config deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
