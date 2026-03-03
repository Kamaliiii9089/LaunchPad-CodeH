// Push Notification Utilities
// Handles push notification subscription, permissions, and sending

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  data?: any;
  vibrate?: number[];
  silent?: boolean;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[Notifications] Not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Check if push notifications are supported
 */
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator &&
         'PushManager' in window &&
         'Notification' in window;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) {
    console.warn('[Push] Push notifications not supported');
    return null;
  }

  try {
    // Request permission first
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('[Push] Notification permission not granted');
      return null;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      console.log('[Push] Already subscribed');
      return subscription;
    }

    // Subscribe to push notifications
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as any,
    });

    console.log('[Push] Subscribed successfully');
    return subscription;
  } catch (error) {
    console.error('[Push] Subscription failed:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!isPushNotificationSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const success = await subscription.unsubscribe();
      console.log('[Push] Unsubscribed:', success);
      return success;
    }

    return false;
  } catch (error) {
    console.error('[Push] Unsubscribe failed:', error);
    return false;
  }
}

/**
 * Get current push subscription
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('[Push] Failed to get subscription:', error);
    return null;
  }
}

/**
 * Convert push subscription to JSON format for server
 */
export function subscriptionToJSON(subscription: PushSubscription): PushSubscriptionData {
  const key = subscription.getKey('p256dh');
  const auth = subscription.getKey('auth');

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: key ? arrayBufferToBase64(key) : '',
      auth: auth ? arrayBufferToBase64(auth) : '',
    },
  };
}

/**
 * Send push subscription to server
 */
export async function sendSubscriptionToServer(
  subscription: PushSubscription,
  token: string
): Promise<boolean> {
  try {
    const subscriptionData = subscriptionToJSON(subscription);

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(subscriptionData),
    });

    if (!response.ok) {
      throw new Error('Failed to send subscription to server');
    }

    console.log('[Push] Subscription sent to server');
    return true;
  } catch (error) {
    console.error('[Push] Failed to send subscription to server:', error);
    return false;
  }
}

/**
 * Remove push subscription from server
 */
export async function removeSubscriptionFromServer(token: string): Promise<boolean> {
  try {
    const response = await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to remove subscription from server');
    }

    console.log('[Push] Subscription removed from server');
    return true;
  } catch (error) {
    console.error('[Push] Failed to remove subscription from server:', error);
    return false;
  }
}

/**
 * Show local notification (for testing or when push is not available)
 */
export async function showLocalNotification(
  options: NotificationOptions
): Promise<void> {
  if (!('Notification' in window)) {
    console.warn('[Notifications] Not supported');
    return;
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    console.warn('[Notifications] Permission not granted');
    return;
  }

  if ('serviceWorker' in navigator) {
    // Use service worker to show notification
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(options.title, {
      body: options.body,
      icon: options.icon || '/icons/icon-192x192.png',
      badge: options.badge || '/icons/icon-72x72.png',
      tag: options.tag || 'default',
      requireInteraction: options.requireInteraction || false,
      data: options.data || {},
      vibrate: options.vibrate || [200, 100, 200],
      silent: options.silent || false,
    } as any);
  } else {
    // Fallback to regular notification
    new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/icons/icon-192x192.png',
      tag: options.tag || 'default',
      data: options.data || {},
      silent: options.silent || false,
    });
  }
}

/**
 * Predefined notification templates
 */
export const notificationTemplates = {
  criticalThreat: (threatType: string): NotificationOptions => ({
    title: '🚨 Critical Security Alert',
    body: `${threatType} detected! Immediate action required.`,
    tag: 'critical-threat',
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    actions: [
      { action: 'view-threat', title: 'View Threat' },
      { action: 'investigate', title: 'Investigate' },
    ],
    data: { url: '/dashboard?tab=threats', severity: 'critical' },
  }),

  highSeverityThreat: (threatType: string): NotificationOptions => ({
    title: '⚠️ High Severity Threat',
    body: `${threatType} has been detected on your system.`,
    tag: 'high-threat',
    requireInteraction: false,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'view-threat', title: 'View Details' },
      { action: 'resolve', title: 'Mark Resolved' },
    ],
    data: { url: '/dashboard?tab=threats', severity: 'high' },
  }),

  complianceAlert: (framework: string, issue: string): NotificationOptions => ({
    title: '📋 Compliance Alert',
    body: `${framework}: ${issue}`,
    tag: 'compliance',
    requireInteraction: false,
    actions: [
      { action: 'view-compliance', title: 'View Details' },
    ],
    data: { url: '/dashboard?tab=compliance' },
  }),

  automationComplete: (ruleName: string): NotificationOptions => ({
    title: '✅ Automation Complete',
    body: `Rule "${ruleName}" executed successfully.`,
    tag: 'automation',
    requireInteraction: false,
    actions: [
      { action: 'view-automation', title: 'View Details' },
    ],
    data: { url: '/dashboard?tab=automation' },
  }),

  dataExported: (filename: string): NotificationOptions => ({
    title: '📥 Data Export Ready',
    body: `Your export "${filename}" is ready for download.`,
    tag: 'export',
    requireInteraction: false,
    data: { url: '/dashboard' },
  }),

  reportGenerated: (reportType: string): NotificationOptions => ({
    title: '📊 Report Generated',
    body: `Your ${reportType} report is ready.`,
    tag: 'report',
    requireInteraction: false,
    data: { url: '/dashboard' },
  }),

  deviceTrusted: (deviceName: string): NotificationOptions => ({
    title: '🔐 New Device Trusted',
    body: `${deviceName} has been added to your trusted devices.`,
    tag: 'device',
    requireInteraction: false,
    data: { url: '/dashboard?tab=settings' },
  }),

  syncComplete: (): NotificationOptions => ({
    title: '🔄 Sync Complete',
    body: 'Your offline data has been synchronized successfully.',
    tag: 'sync',
    requireInteraction: false,
    silent: true,
    data: { url: '/dashboard' },
  }),
};

// Helper functions

/**
 * Convert URL-safe base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return window.btoa(binary);
}

/**
 * Test push notification connection
 */
export async function testPushNotification(token: string): Promise<boolean> {
  try {
    const response = await fetch('/api/push/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to send test notification');
    }

    console.log('[Push] Test notification sent');
    return true;
  } catch (error) {
    console.error('[Push] Failed to send test notification:', error);
    return false;
  }
}
