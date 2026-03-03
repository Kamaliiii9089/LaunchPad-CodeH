'use client';

import { useEffect, useState } from 'react';
import { registerServiceWorker, listenForServiceWorkerMessages } from '@/lib/serviceWorkerUtils';

export default function ServiceWorkerRegistration() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker
      registerServiceWorker()
        .then((registration) => {
          if (registration) {
            console.log('[SW] Service Worker registered successfully');
          }
        })
        .catch((error) => {
          console.error('[SW] Service Worker registration failed:', error);
        });

      // Listen for messages from service worker
      const cleanup = listenForServiceWorkerMessages((message) => {
        console.log('[SW] Message from Service Worker:', message);

        if (message.type === 'SYNC_COMPLETE') {
          // Show toast notification
          const event = new CustomEvent('sw-sync-complete', { detail: message });
          window.dispatchEvent(event);
        }

        if (message.type === 'UPDATE_AVAILABLE') {
          setUpdateAvailable(true);
        }
      });

      return cleanup;
    }
  }, []);

  const handleUpdate = () => {
    window.location.reload();
  };

  if (updateAvailable) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-xl flex items-center gap-4 max-w-md">
        <div className="flex-1">
          <p className="font-semibold mb-1">Update Available</p>
          <p className="text-sm text-blue-100">A new version of BreachBuddy is ready</p>
        </div>
        <button
          onClick={handleUpdate}
          className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
        >
          Update Now
        </button>
      </div>
    );
  }

  return null;
}
