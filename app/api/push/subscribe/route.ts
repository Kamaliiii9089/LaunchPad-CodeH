// Push Notification Subscription API
// POST /api/push/subscribe - Save push subscription to database

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

    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if subscription already exists
    let subscription = await PushSubscription.findOne({
      userId: auth.userId,
      endpoint: endpoint,
    });

    if (subscription) {
      // Update existing subscription
      subscription.keys = keys;
      subscription.updatedAt = new Date();
      subscription.isActive = true;
      await subscription.save();
    } else {
      // Create new subscription
      subscription = await PushSubscription.create({
        userId: auth.userId,
        endpoint: endpoint,
        keys: keys,
        isActive: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Push subscription saved successfully',
      subscriptionId: subscription._id,
    });
  } catch (error: any) {
    console.error('[Push] Subscribe error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save subscription' },
      { status: 500 }
    );
  }
}
