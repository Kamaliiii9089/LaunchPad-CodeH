import React, { useState, useEffect } from 'react';
import { FiX, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import './Toast.css';

// Toast notification system for user feedback
const Toast = ({ id, message, type = 'info', duration = 5000, onClose, action }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.(id);
    }, 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'error': return <FiAlertTriangle />;
      case 'success': return <FiRefreshCw />;
      default: return null;
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`toast toast-${type} ${isExiting ? 'toast-exit' : ''}`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="toast-content">
        {getIcon() && <span className="toast-icon">{getIcon()}</span>}
        <span className="toast-message">{message}</span>
      </div>
      <div className="toast-actions">
        {action && (
          <button 
            className="toast-action-btn"
            onClick={action.onClick}
            aria-label={action.label}
          >
            {action.text}
          </button>
        )}
        <button 
          className="toast-close-btn"
          onClick={handleClose}
          aria-label="Dismiss notification"
        >
          <FiX />
        </button>
      </div>
    </div>
  );
};

// Toast provider context
const ToastContext = React.createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...toast, id }]);
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const showSuccess = (message, options = {}) => {
    return addToast({ message, type: 'success', ...options });
  };

  const showError = (message, options = {}) => {
    return addToast({ 
      message, 
      type: 'error', 
      duration: options.duration || 8000,
      ...options 
    });
  };

  const showInfo = (message, options = {}) => {
    return addToast({ message, type: 'info', ...options });
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast, showSuccess, showError, showInfo }}>
      {children}
      <div className="toast-container" aria-label="Notifications">
        {toasts.map(toast => (
          <Toast 
            key={toast.id}
            {...toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default Toast;