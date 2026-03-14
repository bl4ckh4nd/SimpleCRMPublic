import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/empty-state';

describe('EmptyState', () => {
  test('renders heading and description', () => {
    render(<EmptyState heading="Nothing here" description="Try adding something" />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
    expect(screen.getByText('Try adding something')).toBeTruthy();
  });

  test('renders icon when provided', () => {
    render(<EmptyState heading="Empty" icon={<span data-testid="icon">★</span>} />);
    expect(screen.getByTestId('icon')).toBeTruthy();
  });

  test('omits icon when not provided', () => {
    render(<EmptyState heading="Empty" />);
    expect(screen.queryByTestId('icon')).toBeNull();
  });

  test('renders action when provided', () => {
    render(
      <EmptyState
        heading="Empty"
        action={<button>Add Item</button>}
      />
    );
    expect(screen.getByRole('button', { name: 'Add Item' })).toBeTruthy();
  });

  test('omits action when not provided', () => {
    render(<EmptyState heading="Empty" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('omits description when not provided', () => {
    render(<EmptyState heading="Empty" />);
    // Only heading should render, no description paragraph
    expect(screen.getByText('Empty')).toBeTruthy();
    expect(screen.queryByText('Try adding something')).toBeNull();
  });
});
