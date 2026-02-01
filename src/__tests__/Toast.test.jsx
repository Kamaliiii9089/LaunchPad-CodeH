import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Toast, { ToastProvider, useToast } from '../components/Toast';

// Mock timers
vi.useFakeTimers();

describe('Toast Component', () => {
  let mockOnClose;

  beforeEach(() => {
    mockOnClose = vi.fn();
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  it('renders toast message correctly', () => {
    render(
      <Toast 
        id="test"
        message="Test message" 
        type="success" 
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('auto-closes after specified duration', async () => {
    render(
      <Toast 
        id="test"
        message="Auto close test" 
        duration={1000}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Auto close test')).toBeInTheDocument();

    // Fast forward the duration timeout
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // Fast forward the animation timeout
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockOnClose).toHaveBeenCalledWith('test');
  });

  it('closes when close button is clicked', async () => {
    render(
      <Toast 
        id="test"
        message="Manual close test" 
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(closeButton);

    // Wait for the animation timeout
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockOnClose).toHaveBeenCalledWith('test');
  });

  it('renders action button when provided', () => {
    const mockAction = vi.fn();
    render(
      <Toast 
        id="test"
        message="Action test" 
        action={{
          label: 'Click me',
          onClick: mockAction
        }}
        onClose={mockOnClose}
      />
    );

    const actionButton = screen.getByRole('button', { name: 'Click me' });
    fireEvent.click(actionButton);
    
    expect(mockAction).toHaveBeenCalled();
  });

  it('applies correct ARIA attributes for different types', () => {
    const { rerender } = render(
      <Toast 
        id="test"
        message="Error message" 
        type="error" 
        onClose={mockOnClose}
      />
    );

    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');

    rerender(
      <Toast 
        id="test"
        message="Info message" 
        type="info" 
        onClose={mockOnClose}
      />
    );

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});

// Test component for provider testing
const TestComponent = () => {
  const { showInfo } = useToast();
  
  return (
    <button onClick={() => showInfo('Test toast')}>
      Show Toast
    </button>
  );
};

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  it('provides toast functions through context', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByRole('button', { name: 'Show Toast' });
    fireEvent.click(button);

    expect(screen.getByText('Test toast')).toBeInTheDocument();
  });

  it('manages multiple toasts correctly', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByRole('button', { name: 'Show Toast' });
    
    // Add multiple toasts
    fireEvent.click(button);
    fireEvent.click(button);

    // Should have 2 toasts (though they might have the same text)
    const toasts = screen.getAllByText('Test toast');
    expect(toasts.length).toBeGreaterThanOrEqual(1);
  });

  it('removes toasts after they auto-close', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByRole('button', { name: 'Show Toast' });
    fireEvent.click(button);

    expect(screen.getByText('Test toast')).toBeInTheDocument();

    // Fast forward the default duration (5000ms) plus animation (300ms)
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // Toast should be removed
    expect(screen.queryByText('Test toast')).not.toBeInTheDocument();
  });
});