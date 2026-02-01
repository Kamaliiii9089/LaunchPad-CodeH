import { useEffect, useCallback } from 'react';

// Global keyboard shortcuts hook
export const useKeyboardShortcuts = (shortcuts = {}) => {
  const handleKeyDown = useCallback((event) => {
    // Build the key combination string
    const keys = [];
    if (event.ctrlKey || event.metaKey) keys.push('cmd');
    if (event.altKey) keys.push('alt');
    if (event.shiftKey) keys.push('shift');
    keys.push(event.key.toLowerCase());
    
    const combination = keys.join('+');
    
    // Check if this combination has a handler
    if (shortcuts[combination]) {
      event.preventDefault();
      shortcuts[combination](event);
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

// Focus management utilities
export const focusUtils = {
  // Trap focus within an element (for modals, dropdowns)
  trapFocus: (container) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleTabKey = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };
    
    container.addEventListener('keydown', handleTabKey);
    firstElement.focus();
    
    return () => container.removeEventListener('keydown', handleTabKey);
  },
  
  // Save and restore focus
  saveFocus: () => {
    return document.activeElement;
  },
  
  restoreFocus: (element) => {
    if (element && element.focus) {
      element.focus();
    }
  },
  
  // Focus first error or invalid input
  focusFirstError: (container = document) => {
    const errorElement = container.querySelector(
      '[aria-invalid="true"], .error input, .invalid input, .error, .invalid'
    );
    if (errorElement) {
      errorElement.focus();
      return true;
    }
    return false;
  }
};

// Announcement utilities for screen readers
export const announceToScreenReader = (message, priority = 'polite') => {
  const announcer = document.createElement('div');
  announcer.setAttribute('aria-live', priority);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = 'sr-only';
  announcer.style.cssText = `
    position: absolute;
    left: -10000px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  `;
  
  document.body.appendChild(announcer);
  
  // Small delay to ensure screen reader picks it up
  setTimeout(() => {
    announcer.textContent = message;
  }, 100);
  
  // Clean up after announcement
  setTimeout(() => {
    document.body.removeChild(announcer);
  }, 2000);
};

// Skip links component for better keyboard navigation
export const SkipLinks = () => {
  const skipLinks = [
    { href: '#main-content', text: 'Skip to main content' },
    { href: '#navigation', text: 'Skip to navigation' },
    { href: '#search', text: 'Skip to search' }
  ];

  return skipLinks; // Return data instead of JSX
};

// Enhanced focus visible utilities
export const enhanceFocusVisible = () => {
  // Only show focus ring when navigating with keyboard
  let hadKeyboardEvent = true;
  let keyboardThrottleTimeout = 0;

  const focusTriggeredByKeyboard = (el) => {
    return hadKeyboardEvent || el.matches(':focus-visible');
  };

  const onKeyDown = () => {
    hadKeyboardEvent = true;
    clearTimeout(keyboardThrottleTimeout);
    keyboardThrottleTimeout = setTimeout(() => {
      hadKeyboardEvent = false;
    }, 100);
  };

  const onFocus = (e) => {
    if (focusTriggeredByKeyboard(e.target)) {
      e.target.classList.add('focus-visible');
    } else {
      e.target.classList.remove('focus-visible');
    }
  };

  const onBlur = (e) => {
    e.target.classList.remove('focus-visible');
  };

  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('focus', onFocus, true);
  document.addEventListener('blur', onBlur, true);

  return () => {
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('focus', onFocus, true);
    document.removeEventListener('blur', onBlur, true);
  };
};

export default {
  useKeyboardShortcuts,
  focusUtils,
  announceToScreenReader,
  SkipLinks,
  enhanceFocusVisible
};