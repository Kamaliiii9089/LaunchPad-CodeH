import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Report from '@/models/Report';
import ReportTemplate from '@/models/ReportTemplate';
import {
  generatePDFReport,
  getSampleSecurityEvents,
  ReportData,
} from '@/lib/reportGenerator';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const {
      title = 'Security Report',
      description,
      templateId,
      filters,
    } = body;

    // Fetch template if provided
    let template = null;
    if (templateId) {
      template = await ReportTemplate.findOne({
        _id: templateId,
        $or: [{ userId: decoded.id }, { isPublic: true }],
      });
    }

    // Get security events (replace with actual database query based on filters)
    const events = getSampleSecurityEvents();

    // Apply filters if provided
    let filteredEvents = events;
    if (filters) {
      if (filters.severity && filters.severity.length > 0) {
        filteredEvents = filteredEvents.filter((event) =>
          filters.severity.includes(event.severity)
        );
      }
      if (filters.eventTypes && filters.eventTypes.length > 0) {
        filteredEvents = filteredEvents.filter((event) =>
          filters.eventTypes.includes(event.type)
        );
      }
    }

    // Prepare report data
    const reportData: ReportData = {
      title,
      generatedDate: new Date().toLocaleString(),
      userName: 'Security Admin', // Replace with actual user data
      userEmail: decoded.email || 'admin@breachbuddy.com',
      metrics: {
        totalThreatsBlocked: 1247,
        activeVulnerabilities: 23,
        systemHealth: 98.5,
        activeMonitors: 156,
      },
      events: filteredEvents,
      dateRange: filters?.dateRange
        ? {
            start: new Date(filters.dateRange.start).toLocaleDateString(),
            end: new Date(filters.dateRange.end).toLocaleDateString(),
          }
        : undefined,
    };

    // Generate PDF
    const pdfBuffer = generatePDFReport(
      reportData,
      template?.toObject() || undefined
    );

    // Save report record to database
    const report = new Report({
      userId: decoded.id,
      title,
      description,
      type: 'pdf',
      status: 'completed',
      templateId,
      filters,
    });

    await report.save();

    // Return PDF as response
    const uint8Array = new Uint8Array(pdfBuffer);
    const response = new Response(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf"`,
      },
    });

    return response;
  } catch (error: any) {
    console.error('Error generating PDF report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve report history
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const reports = await Report.find({ userId: decoded.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('-data');

    return NextResponse.json({ success: true, reports });
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}
