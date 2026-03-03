import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongodb';
import EventComment from '@/models/EventComment';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Extract @mentions from content
function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  return mentions;
}

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
    const includeInternal = searchParams.get('includeInternal') === 'true';

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const query: any = { eventId };
    if (!includeInternal) {
      query.isInternal = false;
    }

    const comments = await EventComment.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ 
      success: true, 
      comments,
      totalComments: comments.length 
    });
  } catch (error: any) {
    console.error('Get comments error:', error);
    return NextResponse.json({ error: error.message || 'Failed to get comments' }, { status: 500 });
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
    const { eventId, content, isInternal } = body;

    if (!eventId || !content) {
      return NextResponse.json({ error: 'Event ID and content are required' }, { status: 400 });
    }

    await connectDB();

    // Get user info
    const user = await User.findById(decoded.userId).select('name email');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Extract mentions
    const mentionNames = extractMentions(content);
    const mentions = [];

    if (mentionNames.length > 0) {
      const mentionedUsers = await User.find({
        name: { $in: mentionNames }
      }).select('_id name email');

      for (const mentionedUser of mentionedUsers) {
        mentions.push({
          userId: mentionedUser._id,
          userName: mentionedUser.name,
          userEmail: mentionedUser.email,
        });
      }
    }

    // Create comment
    const comment = await EventComment.create({
      eventId,
      userId: decoded.userId,
      userName: user.name,
      userEmail: user.email,
      content,
      mentions,
      isInternal: isInternal || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // TODO: Send notifications to mentioned users
    // This would typically trigger email/in-app notifications

    return NextResponse.json({ 
      success: true, 
      comment,
      message: 'Comment added successfully' 
    });
  } catch (error: any) {
    console.error('Add comment error:', error);
    return NextResponse.json({ error: error.message || 'Failed to add comment' }, { status: 500 });
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
    const { commentId, content } = body;

    if (!commentId || !content) {
      return NextResponse.json({ error: 'Comment ID and content are required' }, { status: 400 });
    }

    await connectDB();

    const comment = await EventComment.findById(commentId);
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if user owns the comment
    if (comment.userId.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized to edit this comment' }, { status: 403 });
    }

    // Extract new mentions
    const mentionNames = extractMentions(content);
    const mentions = [];

    if (mentionNames.length > 0) {
      const mentionedUsers = await User.find({
        name: { $in: mentionNames }
      }).select('_id name email');

      for (const mentionedUser of mentionedUsers) {
        mentions.push({
          userId: mentionedUser._id,
          userName: mentionedUser.name,
          userEmail: mentionedUser.email,
        });
      }
    }

    comment.content = content;
    comment.mentions = mentions;
    comment.edited = true;
    comment.editedAt = new Date();
    comment.updatedAt = new Date();
    await comment.save();

    return NextResponse.json({ 
      success: true, 
      comment,
      message: 'Comment updated successfully' 
    });
  } catch (error: any) {
    console.error('Update comment error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update comment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    await connectDB();

    const comment = await EventComment.findById(commentId);
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if user owns the comment
    if (comment.userId.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized to delete this comment' }, { status: 403 });
    }

    await EventComment.findByIdAndDelete(commentId);

    return NextResponse.json({ 
      success: true,
      message: 'Comment deleted successfully' 
    });
  } catch (error: any) {
    console.error('Delete comment error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete comment' }, { status: 500 });
  }
}
