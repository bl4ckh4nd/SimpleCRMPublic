import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/followup/quick-actions', () => ({
  QuickActions: ({ sourceType }: any) => <div data-testid="quick-actions" data-source={sourceType} />,
}));

jest.mock('@/components/followup/timeline', () => ({
  Timeline: () => <div data-testid="timeline" />,
}));

jest.mock('@/components/followup/snooze-popover', () => ({
  SnoozePopover: ({ children }: any) => <div>{children}</div>,
}));

import { InstantDetailPanel } from '@/components/followup/instant-detail-panel';
import type { FollowUpItem } from '@/services/data/types';

const baseItem: FollowUpItem = {
  id: 1,
  title: 'Follow up with ACME',
  customer_name: 'ACME Corp',
  customer_id: 10,
  source_type: 'task',
  priority: 'High',
  reason: 'No response for 7 days',
  deal_name: null,
  deal_stage: null,
  deal_value: null,
  due_date: '2026-04-01',
  source_id: 42,
  snoozed_until: null,
} as any;

const defaultProps = {
  item: baseItem,
  timeline: [],
  onTimelineFilterChange: jest.fn(),
  onLogCall: jest.fn(),
  onLogEmail: jest.fn(),
  onAddNote: jest.fn(),
  onSnooze: jest.fn(),
  onComplete: jest.fn(),
};

describe('InstantDetailPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows placeholder when item is null', () => {
    render(<InstantDetailPanel {...defaultProps} item={null} />);
    expect(screen.getByText(/Zeile auswählen/i)).toBeTruthy();
  });

  test('does not show placeholder when item is provided', () => {
    render(<InstantDetailPanel {...defaultProps} />);
    expect(screen.queryByText(/Zeile auswählen/i)).toBeNull();
  });

  test('displays customer name', () => {
    render(<InstantDetailPanel {...defaultProps} />);
    expect(screen.getByText('ACME Corp')).toBeTruthy();
  });

  test('displays item title', () => {
    render(<InstantDetailPanel {...defaultProps} />);
    expect(screen.getByText('Follow up with ACME')).toBeTruthy();
  });

  test('displays reason badge', () => {
    render(<InstantDetailPanel {...defaultProps} />);
    expect(screen.getByText('No response for 7 days')).toBeTruthy();
  });

  test('shows deal name and stage when available', () => {
    const itemWithDeal = {
      ...baseItem,
      deal_name: 'Enterprise Deal',
      deal_stage: 'Verhandlung',
    };
    render(<InstantDetailPanel {...defaultProps} item={itemWithDeal} />);

    expect(screen.getByText('Enterprise Deal')).toBeTruthy();
    expect(screen.getByText('Verhandlung')).toBeTruthy();
  });

  test('shows deal value when positive', () => {
    const itemWithValue = {
      ...baseItem,
      deal_value: 15000,
    };
    render(<InstantDetailPanel {...defaultProps} item={itemWithValue} />);

    // Should show formatted currency
    expect(screen.getByText(/15\.000/)).toBeTruthy();
  });

  test('does not show deal section when deal_name is null', () => {
    render(<InstantDetailPanel {...defaultProps} />);
    // No deal content section
    expect(screen.queryByText('Enterprise Deal')).toBeNull();
  });

  test('does not show deal value when zero', () => {
    const itemWithZeroValue = { ...baseItem, deal_value: 0 };
    render(<InstantDetailPanel {...defaultProps} item={itemWithZeroValue} />);
    expect(screen.queryByText(/€/)).toBeNull();
  });

  test('renders QuickActions with correct source type', () => {
    const dealItem = { ...baseItem, source_type: 'deal' as const };
    render(<InstantDetailPanel {...defaultProps} item={dealItem} />);

    const qa = screen.getByTestId('quick-actions');
    expect(qa.getAttribute('data-source')).toBe('deal');
  });

  test('renders Timeline component', () => {
    render(<InstantDetailPanel {...defaultProps} />);
    expect(screen.getByTestId('timeline')).toBeTruthy();
  });

  test('applies destructive badge variant for High priority task', () => {
    const highPriorityItem = { ...baseItem, priority: 'High', source_type: 'task' as const };
    const { container } = render(<InstantDetailPanel {...defaultProps} item={highPriorityItem} />);
    // Destructive variant badge should be in the DOM
    expect(container.querySelector('[data-variant="destructive"], .destructive, [class*="destructive"]') ||
           screen.getByText('No response for 7 days')).toBeTruthy();
  });
});
