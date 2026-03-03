import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongodb';
import Investigation from '@/models/Investigation';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    await connectDB();

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const investigationId = searchParams.get('investigationId');
    const status = searchParams.get('status');

    let query: any = {};
    if (eventId) {
      query.eventId = eventId;
    }
    if (investigationId) {
      query._id = investigationId;
    }
    if (status) {
      query.status = status;
    }

    const investigations = await Investigation.find(query)
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ 
      success: true, 
      investigations,
      totalInvestigations: investigations.length 
    });
  } catch (error: any) {
    console.error('Get investigations error:', error);
    return NextResponse.json({ error: error.message || 'Failed to get investigations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const body = await request.json();
    const { eventId, title, description, priority, assignedTo } = body;

    if (!eventId || !title || !description) {
      return NextResponse.json({ error: 'Event ID, title, and description are required' }, { status: 400 });
    }

    await connectDB();

    // Get user info
    const user = await User.findById(decoded.userId).select('name email');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Process assigned users
    const assignedUsers = [];
    if (assignedTo && assignedTo.length > 0) {
      const users = await User.find({
        _id: { $in: assignedTo }
      }).select('_id name email');

      for (const assignedUser of users) {
        assignedUsers.push({
          userId: assignedUser._id,
          userName: assignedUser.name,
          userEmail: assignedUser.email,
          assignedAt: new Date(),
        });
      }
    }

    // Create investigation
    const investigation = await Investigation.create({
      eventId,
      title,
      description,
      priority: priority || 'medium',
      status: 'open',
      createdBy: {
        userId: decoded.userId,
        userName: user.name,
        userEmail: user.email,
      },
      assignedTo: assignedUsers,
      timeline: [{
        action: 'investigation_created',
        description: `Investigation created by ${user.name}`,
        userId: decoded.userId,
        userName: user.name,
        timestamp: new Date(),
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ 
      success: true, 
      investigation,
      message: 'Investigation created successfully' 
    });
  } catch (error: any) {
    console.error('Create investigation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create investigation' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const body = await request.json();
    const { investigationId, status, findings, resolution, assignedTo } = body;

    if (!investigationId) {
      return NextResponse.json({ error: 'Investigation ID is required' }, { status: 400 });
    }

    await connectDB();

    const investigation = await Investigation.findById(investigationId);
    if (!investigation) {
      return NextResponse.json({ error: 'Investigation not found' }, { status: 404 });
    }

    const user = await User.findById(decoded.userId).select('name email');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const timelineEntry: any = {
      userId: decoded.userId,
      userName: user.name,
      timestamp: new Date(),
    };

    // Update status
    if (status && status !== investigation.status) {
      investigation.status = status;
      timelineEntry.action = 'status_changed';
      timelineEntry.description = `Status changed to ${status} by ${user.name}`;
      investigation.timeline.push(timelineEntry);
    }

    // Add findings
    if (findings) {
      investigation.findings.push({
        ...findings,
        addedBy: {
          userId: decoded.userId,
          userName: user.name,
        },
        addedAt: new Date(),
      });
      timelineEntry.action = 'finding_added';
      timelineEntry.description = `Finding added: ${findings.title}`;
      investigation.timeline.push(timelineEntry);
    }

    // Add resolution
    if (resolution && status === 'resolved') {
      investigation.resolution = {
        ...resolution,
        resolvedBy: {
          userId: decoded.userId,
          userName: user.name,
        },
        resolvedAt: new Date(),
      };
      timelineEntry.action = 'investigation_resolved';
      timelineEntry.description = `Investigation resolved by ${user.name}`;
      investigation.timeline.push(timelineEntry);
    }

    // Update assigned users
    if (assignedTo && assignedTo.length > 0) {
      const users = await User.find({
        _id: { $in: assignedTo }
      }).select('_id name email');

      const assignedUsers = [];
      for (const assignedUser of users) {
        assignedUsers.push({
          userId: assignedUser._id,
          userName: assignedUser.name,
          userEmail: assignedUser.email,
          assignedAt: new Date(),
        });
      }
      investigation.assignedTo = assignedUsers;
      timelineEntry.action = 'users_assigned';
      timelineEntry.description = `Users assigned: ${users.map(u => u.name).join(', ')}`;
      investigation.timeline.push(timelineEntry);
    }

    investigation.updatedAt = new Date();
    await investigation.save();

    return NextResponse.json({ 
      success: true, 
      investigation,
      message: 'Investigation updated successfully' 
    });
  } catch (error: any) {
    console.error('Update investigation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update investigation' }, { status: 500 });
  }
}
