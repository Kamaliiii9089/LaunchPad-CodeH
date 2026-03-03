// Push Notification Test API
// POST /api/push/test - Send test push notification

import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';
// @ts-ignore
import webpush from 'web-push';

// VAPID keys - These should be stored as environment variables in production
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'bdSiNzUhUP6piAxLH-tW88zfBlWWveIx0dAsDO66aVU';
const VAPID_SUBJECT = process.env.NEXT_PUBLIC_APP_URL || 'mailto:admin@breachbuddy.com';

// Configure web-push
webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

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

    // Get active subscriptions for user
    const subscriptions = await PushSubscription.find({
      userId: auth.userId,
      isActive: true,
    });

    if (subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'No active push subscriptions found' },
        { status: 404 }
      );
    }

    // Send test notification to all active subscriptions
    const payload = JSON.stringify({
      title: '🧪 Test Notification',
      body: 'This is a test notification from BreachBuddy. Push notifications are working correctly!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'test',
      requireInteraction: false,
      data: {
        url: '/dashboard',
        timestamp: Date.now(),
      },
    });

    const results = await Promise.all(
      subscriptions.map(async (sub: any) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          };

          await webpush.sendNotification(pushSubscription, payload);
          return { success: true, endpoint: sub.endpoint };
        } catch (error: any) {
          console.error('[Push] Failed to send to endpoint:', error);
          
          // If subscription is invalid, deactivate it
          if (error.statusCode === 410) {
            sub.isActive = false;
            await sub.save();
          }
          
          return { success: false, endpoint: sub.endpoint, error: error.message };
        }
      })
    );

    const successCount = results.filter((r: any) => r.success).length;
    const failureCount = results.filter((r: any) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Test notification sent`,
      results: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
      },
    });
  } catch (error: any) {
    console.error('[Push] Test notification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send test notification' },
      { status: 500 }
    );
  }
}
