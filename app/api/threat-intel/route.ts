import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ThreatIntelligence, ThreatFeed } from '@/models/ThreatIntelligence';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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

// GET - Fetch threat intelligence data
export async function GET(request: NextRequest) {
  try {
    const userId = verifyToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const dataType = searchParams.get('type') || 'iocs'; // iocs, feeds, stats
    const iocType = searchParams.get('iocType');
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (dataType === 'iocs') {
      const query: any = { userId };
      if (iocType) query['ioc.type'] = iocType;
      if (status) query['ioc.status'] = status;
      if (severity) query['ioc.severity'] = severity;

      const iocs = await ThreatIntelligence.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const stats = {
        total: await ThreatIntelligence.countDocuments({ userId }),
        active: await ThreatIntelligence.countDocuments({ userId, 'ioc.status': 'active' }),
        critical: await ThreatIntelligence.countDocuments({ userId, 'ioc.severity': 'critical' }),
        enriched: await ThreatIntelligence.countDocuments({ userId, enrichedAt: { $exists: true } }),
        byType: {
          ip: await ThreatIntelligence.countDocuments({ userId, 'ioc.type': 'ip' }),
          domain: await ThreatIntelligence.countDocuments({ userId, 'ioc.type': 'domain' }),
          hash: await ThreatIntelligence.countDocuments({ userId, 'ioc.type': 'hash' }),
          url: await ThreatIntelligence.countDocuments({ userId, 'ioc.type': 'url' }),
        },
      };

      return NextResponse.json({
        success: true,
        iocs,
        stats,
      });
    } else if (dataType === 'feeds') {
      const feeds = await ThreatFeed.find({ userId })
        .sort({ createdAt: -1 })
        .lean();

      return NextResponse.json({
        success: true,
        feeds,
      });
    } else if (dataType === 'mitre') {
      const techniques = await ThreatIntelligence.find({
        userId,
        'enrichments.mitre': { $exists: true, $ne: [] },
      })
        .select('enrichments.mitre ioc')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return NextResponse.json({
        success: true,
        techniques,
      });
    }

    return NextResponse.json({ error: 'Invalid data type' }, { status: 400 });
  } catch (error: any) {
    console.error('Error fetching threat intelligence:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch threat intelligence' },
      { status: 500 }
    );
  }
}

// POST - Add new IOC or create threat feed
export async function POST(request: NextRequest) {
  try {
    const userId = verifyToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { action, ...data } = body;

    if (action === 'add_ioc') {
      const { value, type, severity, tags, notes } = data;

      // Check if IOC already exists
      const existing = await ThreatIntelligence.findOne({
        userId,
        'ioc.value': value,
        'ioc.type': type,
      });

      if (existing) {
        // Update occurrence count
        existing.ioc.occurrences += 1;
        existing.ioc.lastSeen = new Date();
        await existing.save();

        return NextResponse.json({
          success: true,
          ioc: existing,
          message: 'IOC already exists, updated occurrence count',
        });
      }

      const threatIntel = new ThreatIntelligence({
        userId,
        ioc: {
          value,
          type,
          severity: severity || 'medium',
          tags: tags || [],
          sources: ['manual'],
          status: 'active',
        },
        notes: notes || '',
      });

      await threatIntel.save();

      return NextResponse.json({
        success: true,
        ioc: threatIntel,
        message: 'IOC added successfully',
      });
    } else if (action === 'create_feed') {
      const { feedName, feedType, apiKey, updateFrequency } = data;

      const feed = new ThreatFeed({
        userId,
        feedName,
        feedType,
        apiKey,
        updateFrequency: updateFrequency || 60,
        enabled: true,
      });

      await feed.save();

      return NextResponse.json({
        success: true,
        feed,
        message: 'Threat feed created successfully',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in threat intelligence POST:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}

// PUT - Update IOC or feed
export async function PUT(request: NextRequest) {
  try {
    const userId = verifyToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { iocId, feedId, status, severity, tags, notes, actionTaken, enabled } = body;

    if (iocId) {
      const ioc = await ThreatIntelligence.findOne({ _id: iocId, userId });
      if (!ioc) {
        return NextResponse.json({ error: 'IOC not found' }, { status: 404 });
      }

      if (status) ioc.ioc.status = status;
      if (severity) ioc.ioc.severity = severity;
      if (tags) ioc.ioc.tags = tags;
      if (notes) ioc.notes = notes;
      if (actionTaken) ioc.actionTaken = actionTaken;

      await ioc.save();

      return NextResponse.json({
        success: true,
        ioc,
        message: 'IOC updated successfully',
      });
    } else if (feedId) {
      const feed = await ThreatFeed.findOne({ _id: feedId, userId });
      if (!feed) {
        return NextResponse.json({ error: 'Feed not found' }, { status: 404 });
      }

      if (enabled !== undefined) feed.enabled = enabled;

      await feed.save();

      return NextResponse.json({
        success: true,
        feed,
        message: 'Feed updated successfully',
      });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating threat intelligence:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update' },
      { status: 500 }
    );
  }
}

// DELETE - Remove IOC or feed
export async function DELETE(request: NextRequest) {
  try {
    const userId = verifyToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const iocId = searchParams.get('iocId');
    const feedId = searchParams.get('feedId');

    if (iocId) {
      await ThreatIntelligence.findOneAndDelete({ _id: iocId, userId });
      return NextResponse.json({
        success: true,
        message: 'IOC deleted successfully',
      });
    } else if (feedId) {
      await ThreatFeed.findOneAndDelete({ _id: feedId, userId });
      return NextResponse.json({
        success: true,
        message: 'Feed deleted successfully',
      });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    console.error('Error deleting threat intelligence:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete' },
      { status: 500 }
    );
  }
}
