'use client';

import { useState, useEffect } from 'react';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getPushSubscription,
  sendSubscriptionToServer,
  removeSubscriptionFromServer,
  testPushNotification,
  showLocalNotification,
  notificationTemplates,
} from '@/lib/pushNotifications';
import {
  getServiceWorkerStatus,
  updateServiceWorker,
  clearServiceWorkerCache,
  isPWA,
  getPendingSyncCount,
} from '@/lib/serviceWorkerUtils';

interface PWASettingsProps {
  toast: any;
}

// Public VAPID key - This should be generated and stored securely
// For demo purposes, using a placeholder
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

export default function PWASettings({ toast }: PWASettingsProps) {
  const [pushSupported, setPushSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [isInstalledPWA, setIsInstalledPWA] = useState(false);
  const [swStatus, setSwStatus] = useState<any>(null);
  const [pendingSync, setPendingSync] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkPWAStatus();
    checkPushStatus();
    checkSyncStatus();

    // Update sync status periodically
    const interval = setInterval(checkSyncStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkPWAStatus = async () => {
    setIsInstalledPWA(isPWA());
    const status = await getServiceWorkerStatus();
    setSwStatus(status);
  };

  const checkPushStatus = async () => {
    setPushSupported(isPushNotificationSupported());
    setNotificationPermission(getNotificationPermission());
    
    const subscription = await getPushSubscription();
    setPushSubscribed(!!subscription);
  };

  const checkSyncStatus = async () => {
    const counts = await getPendingSyncCount();
    setPendingSync(counts);
  };

  const handleEnableNotifications = async () => {
    try {
      setLoading(true);

      // Request permission
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);

      if (permission !== 'granted') {
        toast.error('Notification permission denied');
        return;
      }

      // Subscribe to push notifications
      const subscription = await subscribeToPushNotifications(VAPID_PUBLIC_KEY);
      
      if (!subscription) {
        toast.error('Failed to subscribe to push notifications');
        return;
      }

      // Send subscription to server
      const token = localStorage.getItem('token');
      if (token) {
        const success = await sendSubscriptionToServer(subscription, token);
        if (success) {
          setPushSubscribed(true);
          toast.success('Push notifications enabled successfully!');
        } else {
          toast.error('Failed to register subscription with server');
        }
      }
    } catch (error: any) {
      console.error('Failed to enable notifications:', error);
      toast.error(error.message || 'Failed to enable notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    try {
      setLoading(true);

      const success = await unsubscribeFromPushNotifications();
      
      if (success) {
        const token = localStorage.getItem('token');
        if (token) {
          await removeSubscriptionFromServer(token);
        }
        
        setPushSubscribed(false);
        toast.success('Push notifications disabled');
      } else {
        toast.error('Failed to disable notifications');
      }
    } catch (error: any) {
      console.error('Failed to disable notifications:', error);
      toast.error(error.message || 'Failed to disable notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      setLoading(true);
      
      // Show local test notification
      await showLocalNotification(
        notificationTemplates.criticalThreat('SQL Injection Attempt')
      );
      
      toast.success('Test notification sent!');
    } catch (error: any) {
      console.error('Failed to send test notification:', error);
      toast.error(error.message || 'Failed to send test notification');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateServiceWorker = async () => {
    try {
      setLoading(true);
      await updateServiceWorker();
      toast.success('Service Worker updated! Refreshing...');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      toast.error('Failed to update Service Worker');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear all cached data? The app will reload.')) {
      return;
    }

    try {
      setLoading(true);
      await clearServiceWorkerCache();
      toast.success('Cache cleared! Refreshing...');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      toast.error('Failed to clear cache');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* PWA Status Card */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>📱</span> Progressive Web App
        </h2>

        <div className="space-y-4">
          {/* Installation Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Installation Status</p>
              <p className="text-sm text-gray-600 mt-1">
                {isInstalledPWA ? 'Installed as app' : 'Running in browser'}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              isInstalledPWA
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {isInstalledPWA ? '✓ Installed' : 'Not Installed'}
            </div>
          </div>

          {/* Service Worker Status */}
          {swStatus && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Service Worker</p>
                <p className="text-sm text-gray-600 mt-1">
                  {swStatus.active ? 'Active and caching data' : 'Not active'}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                swStatus.active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {swStatus.active ? '✓ Active' : '✗ Inactive'}
              </div>
            </div>
          )}

          {/* Offline Support */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Offline Support</p>
              <p className="text-sm text-gray-600 mt-1">
                Access cached data without internet
              </p>
            </div>
            <div className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
              ✓ Enabled
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleUpdateServiceWorker}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Update App
            </button>
            <button
              onClick={handleClearCache}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Clear Cache
            </button>
          </div>
        </div>
      </div>

      {/* Push Notifications Card */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>🔔</span> Push Notifications
        </h2>

        {!pushSupported ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Push notifications are not supported in your browser.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Permission Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Permission Status</p>
                <p className="text-sm text-gray-600 mt-1">
                  {notificationPermission === 'granted' && 'Allowed'}
                  {notificationPermission === 'denied' && 'Blocked'}
                  {notificationPermission === 'default' && 'Not requested'}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                notificationPermission === 'granted'
                  ? 'bg-green-100 text-green-700'
                  : notificationPermission === 'denied'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {notificationPermission === 'granted' && '✓ Granted'}
                {notificationPermission === 'denied' && '✗ Denied'}
                {notificationPermission === 'default' && '○ Default'}
              </div>
            </div>

            {/* Subscription Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Subscription Status</p>
                <p className="text-sm text-gray-600 mt-1">
                  {pushSubscribed
                    ? 'Receiving security alerts'
                    : 'Not receiving alerts'}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                pushSubscribed
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {pushSubscribed ? '✓ Subscribed' : 'Not Subscribed'}
              </div>
            </div>

            {/* Notification Types */}
            {pushSubscribed && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  You'll receive notifications for:
                </p>
                <div className="space-y-1 text-sm text-blue-800">
                  <div className="flex items-center gap-2">
                    <span>🚨</span>
                    <span>Critical security threats</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>⚠️</span>
                    <span>High severity vulnerabilities</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📋</span>
                    <span>Compliance alerts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>✅</span>
                    <span>Automation completions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🔄</span>
                    <span>Background sync completions</span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {!pushSubscribed ? (
                <button
                  onClick={handleEnableNotifications}
                  disabled={loading || notificationPermission === 'denied'}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Enabling...' : 'Enable Notifications'}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleTestNotification}
                    disabled={loading}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Test Notification
                  </button>
                  <button
                    onClick={handleDisableNotifications}
                    disabled={loading}
                    className="flex-1 px-4 py-2 border border-red-300 rounded-lg font-medium text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    Disable
                  </button>
                </>
              )}
            </div>

            {notificationPermission === 'denied' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  Notifications are blocked. Please enable them in your browser settings.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Background Sync Card */}
      {pendingSync && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>🔄</span> Background Synchronization
          </h2>

          <div className="space-y-4">
            {/* Sync Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Pending Changes</p>
                <p className="text-sm text-gray-600 mt-1">
                  {pendingSync.total === 0
                    ? 'All data synchronized'
                    : `${pendingSync.total} item${pendingSync.total !== 1 ? 's' : ''} waiting to sync`}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                pendingSync.total === 0
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {pendingSync.total === 0 ? '✓ Synced' : `${pendingSync.total} Pending`}
              </div>
            </div>

            {/* Pending Items Breakdown */}
            {pendingSync.total > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-900 mb-2">
                  Items waiting to sync:
                </p>
                <div className="space-y-1 text-sm text-yellow-800">
                  {pendingSync.assessments > 0 && (
                    <div>• {pendingSync.assessments} assessment(s)</div>
                  )}
                  {pendingSync.controlTests > 0 && (
                    <div>• {pendingSync.controlTests} control test(s)</div>
                  )}
                  {pendingSync.comments > 0 && (
                    <div>• {pendingSync.comments} comment(s)</div>
                  )}
                  {pendingSync.reports > 0 && (
                    <div>• {pendingSync.reports} report(s)</div>
                  )}
                </div>
                <p className="text-xs text-yellow-700 mt-2">
                  These will sync automatically when you're back online
                </p>
              </div>
            )}

            {/* Sync Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Background Sync</strong> automatically saves your work when offline and syncs it when you're back online. No manual intervention needed!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
