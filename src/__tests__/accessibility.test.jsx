import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { useKeyboardShortcuts, focusUtils, announceToScreenReader } from '../utils/accessibility';

// Test component for keyboard shortcuts
const TestKeyboardComponent = ({ shortcuts }) => {
  useKeyboardShortcuts(shortcuts);
  
  return (
    <div data-testid="keyboard-test">
      Keyboard shortcut test component
    </div>
  );
};

describe('Accessibility Utils', () => {
  describe('useKeyboardShortcuts', () => {
    it('triggers shortcut handlers on correct key combinations', () => {
      const mockHandler = vi.fn();
      const shortcuts = {
        'cmd+k': mockHandler,
        'alt+shift+s': mockHandler
      };

      render(<TestKeyboardComponent shortcuts={shortcuts} />);

      // Test Cmd+K
      fireEvent.keyDown(document, { 
        key: 'k', 
        metaKey: true 
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);

      // Test Alt+Shift+S
      fireEvent.keyDown(document, { 
        key: 's', 
        altKey: true, 
        shiftKey: true 
      });

      expect(mockHandler).toHaveBeenCalledTimes(2);
    });

    it('prevents default behavior when shortcut is triggered', () => {
      const mockHandler = vi.fn();
      const shortcuts = { 'cmd+s': mockHandler };

      render(<TestKeyboardComponent shortcuts={shortcuts} />);

      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true
      });

      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      document.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalled();
    });

    it('does not trigger on non-matching key combinations', () => {
      const mockHandler = vi.fn();
      const shortcuts = { 'cmd+k': mockHandler };

      render(<TestKeyboardComponent shortcuts={shortcuts} />);

      fireEvent.keyDown(document, { key: 'j', metaKey: true });

      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('focusUtils', () => {
    describe('trapFocus', () => {
      it('traps focus within container', () => {
        document.body.innerHTML = `
          <div id="container">
            <button id="first">First</button>
            <button id="middle">Middle</button>
            <button id="last">Last</button>
          </div>
          <button id="outside">Outside</button>
        `;

        const container = document.getElementById('container');
        const cleanup = focusUtils.trapFocus(container);

        const firstButton = document.getElementById('first');
        const lastButton = document.getElementById('last');

        // Should focus first element initially
        expect(document.activeElement).toBe(firstButton);

        // Shift+Tab from first should go to last
        fireEvent.keyDown(container, {
          key: 'Tab',
          shiftKey: true
        });

        expect(document.activeElement).toBe(lastButton);

        cleanup();
      });
    });

    describe('saveFocus and restoreFocus', () => {
      it('saves and restores focus correctly', () => {
        document.body.innerHTML = `
          <button id="button1">Button 1</button>
          <button id="button2">Button 2</button>
        `;

        const button1 = document.getElementById('button1');
        const button2 = document.getElementById('button2');

        button1.focus();
        const savedFocus = focusUtils.saveFocus();

        button2.focus();
        expect(document.activeElement).toBe(button2);

        focusUtils.restoreFocus(savedFocus);
        expect(document.activeElement).toBe(button1);
      });
    });

    describe('focusFirstError', () => {
      it('focuses first error element', () => {
        document.body.innerHTML = `
          <div>
            <input type="text" />
            <input type="email" aria-invalid="true" id="error-input" />
            <button>Submit</button>
          </div>
        `;

        const errorInput = document.getElementById('error-input');
        const result = focusUtils.focusFirstError();

        expect(result).toBe(true);
        expect(document.activeElement).toBe(errorInput);
      });

      it('returns false when no error elements found', () => {
        document.body.innerHTML = `
          <div>
            <input type="text" />
            <button>Submit</button>
          </div>
        `;

        const result = focusUtils.focusFirstError();
        expect(result).toBe(false);
      });
    });
  });

  describe('announceToScreenReader', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      // Clean up any remaining announcer elements
      document.querySelectorAll('.sr-only').forEach(el => el.remove());
    });

    it('creates announcement element with correct attributes', () => {
      announceToScreenReader('Test announcement', 'assertive');

      vi.advanceTimersByTime(150);

      const announcer = document.querySelector('[aria-live="assertive"]');
      expect(announcer).toBeInTheDocument();
      expect(announcer.textContent).toBe('Test announcement');
      expect(announcer.className).toBe('sr-only');
    });

    it('removes announcement element after timeout', () => {
      announceToScreenReader('Test announcement');

      vi.advanceTimersByTime(150);
      expect(document.querySelector('[aria-live]')).toBeInTheDocument();

      vi.advanceTimersByTime(2000);
      expect(document.querySelector('[aria-live]')).not.toBeInTheDocument();
    });

    it('uses polite as default priority', () => {
      announceToScreenReader('Default priority test');

      vi.advanceTimersByTime(150);

      const announcer = document.querySelector('[aria-live]');
      expect(announcer.getAttribute('aria-live')).toBe('polite');
    });
  });
});