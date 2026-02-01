import React, { useState, useEffect } from 'react';
import { FiWifi, FiWifiOff } from 'react-icons/fi';
import { useToast } from './Toast';
import './NetworkStatus.css';

// Network status indicator with offline/online detection
const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      showSuccess('Connection restored', { duration: 3000 });
      
      // Hide status indicator after 3 seconds
      setTimeout(() => setShowStatus(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
      showError('No internet connection', { 
        duration: 10000,
        action: {
          text: 'Retry',
          label: 'Try to reconnect',
          onClick: () => window.location.reload()
        }
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Show initial status if offline
    if (!navigator.onLine) {
      setShowStatus(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showError, showSuccess]);

  // Don't show if online and not transitioning
  if (isOnline && !showStatus) {
    return null;
  }

  return (
    <div 
      className={`network-status ${isOnline ? 'network-online' : 'network-offline'}`}
      role="status"
      aria-live="polite"
      aria-label={isOnline ? 'Connected' : 'Disconnected'}
    >
      <div className="network-status-content">
        <span className="network-icon">
          {isOnline ? <FiWifi /> : <FiWifiOff />}
        </span>
        <span className="network-text">
          {isOnline ? 'Connected' : 'No connection'}
        </span>
      </div>
    </div>
  );
};

export default NetworkStatus;