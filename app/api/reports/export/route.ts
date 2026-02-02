import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Report from '@/models/Report';
import {
  generateCSVExport,
  generateJSONExport,
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
      format = 'csv', // 'csv' or 'json'
      filters,
      includeMetrics = false,
    } = body;

    if (!['csv', 'json'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be "csv" or "json"' },
        { status: 400 }
      );
    }

    // Get security events (replace with actual database query based on filters)
    let events = getSampleSecurityEvents();

    // Apply filters if provided
    if (filters) {
      if (filters.severity && filters.severity.length > 0) {
        events = events.filter((event) =>
          filters.severity.includes(event.severity)
        );
      }
      if (filters.eventTypes && filters.eventTypes.length > 0) {
        events = events.filter((event) =>
          filters.eventTypes.includes(event.type)
        );
      }
      if (filters.dateRange) {
        const start = new Date(filters.dateRange.start);
        const end = new Date(filters.dateRange.end);
        events = events.filter((event) => {
          const eventDate = new Date(event.timestamp);
          return eventDate >= start && eventDate <= end;
        });
      }
    }

    let exportData: string;
    let contentType: string;
    let filename: string;

    if (format === 'csv') {
      exportData = generateCSVExport(events);
      contentType = 'text/csv';
      filename = `security_events_${Date.now()}.csv`;
    } else {
      // JSON format
      const reportData: ReportData = {
        title: 'Security Events Export',
        generatedDate: new Date().toISOString(),
        userName: 'Security Admin',
        userEmail: decoded.email || 'admin@breachbuddy.com',
        metrics: includeMetrics
          ? {
              totalThreatsBlocked: 1247,
              activeVulnerabilities: 23,
              systemHealth: 98.5,
              activeMonitors: 156,
            }
          : {
              totalThreatsBlocked: 0,
              activeVulnerabilities: 0,
              systemHealth: 0,
              activeMonitors: 0,
            },
        events,
        dateRange: filters?.dateRange
          ? {
              start: new Date(filters.dateRange.start).toISOString(),
              end: new Date(filters.dateRange.end).toISOString(),
            }
          : undefined,
      };

      exportData = generateJSONExport(reportData);
      contentType = 'application/json';
      filename = `security_events_${Date.now()}.json`;
    }

    // Save export record to database
    const report = new Report({
      userId: decoded.id,
      title: `Data Export - ${format.toUpperCase()}`,
      type: format as 'csv' | 'json',
      status: 'completed',
      filters,
    });

    await report.save();

    // Return file as response
    return new NextResponse(exportData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'Failed to export data', details: error.message },
      { status: 500 }
    );
  }
}
