import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/components/error-boundary';

// Suppress console.error output during error boundary tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

function ThrowingChild({ shouldThrow }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error('Test error message');
  return <div>Child content</div>;
}

describe('ErrorBoundary', () => {
  test('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('Child content')).toBeTruthy();
  });

  test('renders fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Ein Fehler ist aufgetreten')).toBeTruthy();
    expect(screen.getByText('Test error message')).toBeTruthy();
  });

  test('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom fallback')).toBeTruthy();
    expect(screen.queryByText('Ein Fehler ist aufgetreten')).toBeNull();
  });

  test('retry button is present and clickable in error state', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    );
    const retryButton = screen.getByRole('button', { name: /erneut versuchen/i });
    expect(retryButton).toBeTruthy();
    // Clicking retry resets hasError state; child re-renders (may throw again without state change)
    expect(() => fireEvent.click(retryButton)).not.toThrow();
  });

  test('getDerivedStateFromError captures the error and hides children', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    );
    // If getDerivedStateFromError ran, children are not shown
    expect(screen.queryByText('Child content')).toBeNull();
    expect(screen.getByText('Test error message')).toBeTruthy();
  });
});
