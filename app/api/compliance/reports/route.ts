import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import ComplianceReport from '@/models/ComplianceReport';
import { complianceEngine } from '@/lib/complianceEngine';

// GET - List all reports
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('reportType');
    const status = searchParams.get('status');

    const query: any = { isActive: true };
    if (reportType) query.reportType = reportType;
    if (status) query.status = status;

    const reports = await ComplianceReport.find(query)
      .populate('generatedBy approvedBy', 'name email')
      .populate('frameworks.frameworkId', 'name code')
      .sort({ generatedAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      reports,
      count: reports.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Generate a new report
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { reportType, frameworkIds, startDate, endDate } = body;

    if (!reportType || !frameworkIds || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get IP and user agent from request
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '0.0.0.0';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const report = await complianceEngine.generateReport(
      reportType,
      frameworkIds,
      new Date(startDate),
      new Date(endDate),
      {
        userId: auth.userId,
        email: auth.email,
        role: 'Reporter',
      },
      ip,
      userAgent
    );

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
