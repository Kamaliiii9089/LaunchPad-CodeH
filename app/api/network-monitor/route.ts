import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Anomaly, NetworkSession, NetworkTrafficStats } from '@/models/NetworkTraffic';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to verify JWT token
function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch (error) {
    return null;
  }
}

// GET - Fetch network monitoring data
export async function GET(request: NextRequest) {
  try {
    const userId = verifyToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const dataType = searchParams.get('type') || 'anomalies'; // anomalies, sessions, stats
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (dataType === 'anomalies') {
      const query: any = {};
      if (status) query.status = status;
      if (severity) query.severity = severity;

      const anomalies = await Anomaly.find(query)
        .sort({ detectedAt: -1 })
        .limit(limit)
        .lean();

      const stats = {
        total: await Anomaly.countDocuments(),
        active: await Anomaly.countDocuments({ status: 'active' }),
        critical: await Anomaly.countDocuments({ severity: 'critical' }),
        high: await Anomaly.countDocuments({ severity: 'high' }),
        medium: await Anomaly.countDocuments({ severity: 'medium' }),
        low: await Anomaly.countDocuments({ severity: 'low' }),
      };

      return NextResponse.json({
        success: true,
        anomalies,
        stats,
      });
    } else if (dataType === 'sessions') {
      const sessions = await NetworkSession.find({ userId })
        .sort({ startTime: -1 })
        .limit(limit)
        .lean();

      return NextResponse.json({
        success: true,
        sessions,
      });
    } else if (dataType === 'stats') {
      const interval = searchParams.get('interval') || 'hour';
      const stats = await NetworkTrafficStats.find({ userId, interval })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      return NextResponse.json({
        success: true,
        stats,
      });
    }

    return NextResponse.json({ error: 'Invalid data type' }, { status: 400 });
  } catch (error: any) {
    console.error('Error fetching network data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch network data' },
      { status: 500 }
    );
  }
}

// POST - Create new network session or update anomaly status
export async function POST(request: NextRequest) {
  try {
    const userId = verifyToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { action, ...data } = body;

    if (action === 'start_session') {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const session = new NetworkSession({
        sessionId,
        userId,
        captureInterface: data.interface || 'eth0',
        captureFilter: data.filter || '',
        isActive: true,
      });

      await session.save();

      return NextResponse.json({
        success: true,
        session,
        message: 'Network capture session started',
      });
    } else if (action === 'stop_session') {
      const session = await NetworkSession.findOne({
        sessionId: data.sessionId,
        userId,
        isActive: true,
      });

      if (!session) {
        return NextResponse.json(
          { error: 'Active session not found' },
          { status: 404 }
        );
      }

      session.endTime = new Date();
      session.duration = session.endTime.getTime() - session.startTime.getTime();
      session.isActive = false;
      await session.save();

      return NextResponse.json({
        success: true,
        session,
        message: 'Network capture session stopped',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in network monitoring POST:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}

// PUT - Update anomaly status
export async function PUT(request: NextRequest) {
  try {
    const userId = verifyToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { anomalyId, status, notes, mitigationActions } = body;

    const anomaly = await Anomaly.findById(anomalyId);
    if (!anomaly) {
      return NextResponse.json({ error: 'Anomaly not found' }, { status: 404 });
    }

    if (status) anomaly.status = status;
    if (notes) anomaly.notes = notes;
    if (mitigationActions) anomaly.mitigationActions = mitigationActions;

    if (status === 'resolved' || status === 'false_positive') {
      anomaly.resolved = true;
      anomaly.resolvedAt = new Date();
    }

    await anomaly.save();

    return NextResponse.json({
      success: true,
      anomaly,
      message: 'Anomaly updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating anomaly:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update anomaly' },
      { status: 500 }
    );
  }
}

// DELETE - Delete anomaly or session
export async function DELETE(request: NextRequest) {
  try {
    const userId = verifyToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const anomalyId = searchParams.get('anomalyId');
    const sessionId = searchParams.get('sessionId');

    if (anomalyId) {
      await Anomaly.findByIdAndDelete(anomalyId);
      return NextResponse.json({
        success: true,
        message: 'Anomaly deleted successfully',
      });
    } else if (sessionId) {
      await NetworkSession.findOneAndDelete({ sessionId, userId });
      return NextResponse.json({
        success: true,
        message: 'Session deleted successfully',
      });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    console.error('Error deleting data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete data' },
      { status: 500 }
    );
  }
}
