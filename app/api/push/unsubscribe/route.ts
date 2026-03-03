// Push Notification Unsubscribe API
// POST /api/push/unsubscribe - Remove push subscription from database

import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';

export async function POST(request: Request) {
  try {
    const auth = await verifyAuth(request as any);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Deactivate all user subscriptions
    await PushSubscription.updateMany(
      { userId: auth.userId },
      { $set: { isActive: false, updatedAt: new Date() } }
    );

    return NextResponse.json({
      success: true,
      message: 'Push subscriptions removed successfully',
    });
  } catch (error: any) {
    console.error('[Push] Unsubscribe error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove subscription' },
      { status: 500 }
    );
  }
}
