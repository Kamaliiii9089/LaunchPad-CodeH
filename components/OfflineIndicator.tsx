'use client';

import { useState, useEffect } from 'react';
import { isOnline, listenForConnectivityChanges, getPendingSyncCount } from '@/lib/serviceWorkerUtils';

export default function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Set initial state
    setOnline(isOnline());

    // Listen for connectivity changes
    const cleanup = listenForConnectivityChanges(
      () => {
        setOnline(true);
        console.log('[Connectivity] Back online');
        // Refresh pending sync count
        updatePendingSync();
      },
      () => {
        setOnline(false);
        console.log('[Connectivity] Offline');
      }
    );

    // Update pending sync count
    updatePendingSync();
    const interval = setInterval(updatePendingSync, 30000); // Update every 30 seconds

    return () => {
      cleanup();
      clearInterval(interval);
    };
  }, []);

  const updatePendingSync = async () => {
    const counts = await getPendingSyncCount();
    setPendingSync(counts.total);
  };

  // Don't show indicator when online and no pending sync
  if (online && pendingSync === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div
        className={`rounded-lg shadow-lg border-2 ${
          online
            ? 'bg-blue-50 border-blue-200'
            : 'bg-yellow-50 border-yellow-300'
        } transition-all duration-300 ${showDetails ? 'w-80' : 'w-auto'}`}
      >
        {/* Compact View */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full px-4 py-3 flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          {/* Status Icon */}
          <div className="relative flex-shrink-0">
            {online ? (
              <div className="flex items-center gap-1">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="relative flex h-3 w-3 bg-yellow-500 rounded-full"></span>
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
                </svg>
              </div>
            )}
          </div>

          {/* Status Text */}
          <div className="flex-1 text-left">
            <p className={`text-sm font-semibold ${online ? 'text-blue-900' : 'text-yellow-900'}`}>
              {online ? 'Online' : 'Offline Mode'}
            </p>
            {pendingSync > 0 && (
              <p className={`text-xs ${online ? 'text-blue-700' : 'text-yellow-700'}`}>
                {pendingSync} item{pendingSync !== 1 ? 's' : ''} pending sync
              </p>
            )}
          </div>

          {/* Expand Icon */}
          <svg
            className={`w-4 h-4 flex-shrink-0 ${
              online ? 'text-blue-600' : 'text-yellow-600'
            } transition-transform ${showDetails ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Detailed View */}
        {showDetails && (
          <div className={`px-4 pb-4 border-t-2 ${online ? 'border-blue-200' : 'border-yellow-300'}`}>
            <div className="pt-3 space-y-2">
              {/* Status Message */}
              <div className={`text-xs ${online ? 'text-blue-800' : 'text-yellow-800'}`}>
                {online ? (
                  <>
                    <p className="font-medium mb-1">✓ Connected to server</p>
                    {pendingSync > 0 ? (
                      <p>Syncing your offline changes...</p>
                    ) : (
                      <p>All data is up to date</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-medium mb-1">⚠️ No internet connection</p>
                    <p>Your changes will sync automatically when connection is restored.</p>
                  </>
                )}
              </div>

              {/* Pending Sync Details */}
              {pendingSync > 0 && (
                <div className={`mt-2 p-2 rounded ${online ? 'bg-blue-100' : 'bg-yellow-100'}`}>
                  <p className={`text-xs font-medium ${online ? 'text-blue-900' : 'text-yellow-900'} mb-1`}>
                    Pending Changes:
                  </p>
                  <p className={`text-xs ${online ? 'text-blue-700' : 'text-yellow-700'}`}>
                    {pendingSync} action{pendingSync !== 1 ? 's' : ''} waiting to sync
                  </p>
                </div>
              )}

              {/* Offline Capabilities */}
              {!online && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium text-yellow-900 mb-1">Available Offline:</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-yellow-800">
                      <span className="text-green-500">✓</span>
                      <span>View cached security data</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-yellow-800">
                      <span className="text-green-500">✓</span>
                      <span>Review compliance reports</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-yellow-800">
                      <span className="text-green-500">✓</span>
                      <span>Add comments and notes</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-yellow-800">
                      <span className="text-green-500">✓</span>
                      <span>Create assessments</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Refresh Button */}
              {online && pendingSync === 0 && (
                <button
                  onClick={() => window.location.reload()}
                  className="w-full mt-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                >
                  Refresh Data
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
