import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Report from '@/models/Report';
import { calculateNextRun } from '@/lib/reportGenerator';

// POST - Create or update scheduled report
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
      reportId,
      title,
      description,
      type = 'pdf',
      templateId,
      filters,
      schedule,
    } = body;

    // Validate schedule configuration
    if (!schedule || !schedule.frequency || !schedule.time) {
      return NextResponse.json(
        { error: 'Schedule configuration is required' },
        { status: 400 }
      );
    }

    if (!['daily', 'weekly', 'monthly'].includes(schedule.frequency)) {
      return NextResponse.json(
        { error: 'Invalid frequency. Must be daily, weekly, or monthly' },
        { status: 400 }
      );
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(schedule.time)) {
      return NextResponse.json(
        { error: 'Invalid time format. Use HH:mm (24-hour format)' },
        { status: 400 }
      );
    }

    // Calculate next run time
    const nextRun = calculateNextRun(
      schedule.frequency,
      schedule.time,
      schedule.dayOfWeek,
      schedule.dayOfMonth
    );

    const scheduleConfig = {
      enabled: schedule.enabled !== false,
      frequency: schedule.frequency,
      dayOfWeek: schedule.dayOfWeek,
      dayOfMonth: schedule.dayOfMonth,
      time: schedule.time,
      nextRun,
    };

    let report;

    if (reportId) {
      // Update existing report
      report = await Report.findOneAndUpdate(
        { _id: reportId, userId: decoded.id },
        {
          title,
          description,
          type,
          templateId,
          filters,
          schedule: scheduleConfig,
        },
        { new: true }
      );

      if (!report) {
        return NextResponse.json(
          { error: 'Report not found' },
          { status: 404 }
        );
      }
    } else {
      // Create new scheduled report
      report = new Report({
        userId: decoded.id,
        title: title || 'Scheduled Security Report',
        description,
        type,
        templateId,
        filters,
        schedule: scheduleConfig,
        status: 'pending',
      });

      await report.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduled report configured successfully',
      report,
    });
  } catch (error: any) {
    console.error('Error configuring scheduled report:', error);
    return NextResponse.json(
      { error: 'Failed to configure scheduled report', details: error.message },
      { status: 500 }
    );
  }
}

// GET - Retrieve scheduled reports
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

    const scheduledReports = await Report.find({
      userId: decoded.id,
      'schedule.enabled': true,
    }).sort({ 'schedule.nextRun': 1 });

    return NextResponse.json({
      success: true,
      reports: scheduledReports,
    });
  } catch (error: any) {
    console.error('Error fetching scheduled reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled reports' },
      { status: 500 }
    );
  }
}

// DELETE - Remove scheduled report
export async function DELETE(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get('id');

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const report = await Report.findOneAndDelete({
      _id: reportId,
      userId: decoded.id,
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduled report deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting scheduled report:', error);
    return NextResponse.json(
      { error: 'Failed to delete scheduled report' },
      { status: 500 }
    );
  }
}
