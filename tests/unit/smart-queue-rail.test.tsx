import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock QueueItem to simplify rendering
jest.mock('@/components/followup/queue-item', () => ({
  QueueItem: ({ label, count, active, onClick }: any) => (
    <div
      data-testid={`queue-item-${label}`}
      data-active={active ? 'true' : 'false'}
      onClick={onClick}
    >
      {label} ({count})
    </div>
  ),
}));

// Mock Tooltip components to avoid portal issues
jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div role="tooltip">{children}</div>,
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
}));

import { SmartQueueRail } from '@/components/followup/smart-queue-rail';
import type { QueueCounts, SavedView } from '@/services/data/types';

const mockCounts: QueueCounts = {
  heute: 3,
  ueberfaellig: 5,
  dieseWoche: 8,
  stagnierend: 2,
  highValueRisk: 1,
};

const mockSavedViews: SavedView[] = [
  { id: 1, name: 'VIP Kunden', filters: '{}', created_at: '2026-01-01' },
  { id: 2, name: 'Neue Leads', filters: '{}', created_at: '2026-01-02' },
];

describe('SmartQueueRail', () => {
  const onQueueSelect = jest.fn();

  beforeEach(() => {
    onQueueSelect.mockReset();
  });

  test('renders all 5 preset queues', () => {
    render(
      <SmartQueueRail
        activeQueue="heute"
        counts={mockCounts}
        savedViews={[]}
        onQueueSelect={onQueueSelect}
      />
    );

    expect(screen.getByTestId('queue-item-Heute')).toBeTruthy();
    expect(screen.getByTestId('queue-item-Überfällig')).toBeTruthy();
    expect(screen.getByTestId('queue-item-Diese Woche')).toBeTruthy();
    expect(screen.getByTestId('queue-item-Stagnierende Deals')).toBeTruthy();
    expect(screen.getByTestId('queue-item-High Value Risk')).toBeTruthy();
  });

  test('shows correct counts for each queue', () => {
    render(
      <SmartQueueRail
        activeQueue="heute"
        counts={mockCounts}
        savedViews={[]}
        onQueueSelect={onQueueSelect}
      />
    );

    expect(screen.getByText('Heute (3)')).toBeTruthy();
    expect(screen.getByText('Überfällig (5)')).toBeTruthy();
    expect(screen.getByText('Diese Woche (8)')).toBeTruthy();
    expect(screen.getByText('Stagnierende Deals (2)')).toBeTruthy();
    expect(screen.getByText('High Value Risk (1)')).toBeTruthy();
  });

  test('marks active queue correctly', () => {
    render(
      <SmartQueueRail
        activeQueue="ueberfaellig"
        counts={mockCounts}
        savedViews={[]}
        onQueueSelect={onQueueSelect}
      />
    );

    expect(screen.getByTestId('queue-item-Überfällig').getAttribute('data-active')).toBe('true');
    expect(screen.getByTestId('queue-item-Heute').getAttribute('data-active')).toBe('false');
  });

  test('calls onQueueSelect with queue id when clicked', async () => {
    const user = userEvent.setup();
    render(
      <SmartQueueRail
        activeQueue="heute"
        counts={mockCounts}
        savedViews={[]}
        onQueueSelect={onQueueSelect}
      />
    );

    await user.click(screen.getByTestId('queue-item-Überfällig'));
    expect(onQueueSelect).toHaveBeenCalledWith('ueberfaellig');
  });

  test('does not render saved views section when empty', () => {
    render(
      <SmartQueueRail
        activeQueue="heute"
        counts={mockCounts}
        savedViews={[]}
        onQueueSelect={onQueueSelect}
      />
    );

    expect(screen.queryByText('Gespeicherte Ansichten')).toBeNull();
  });

  test('renders saved views when provided', () => {
    render(
      <SmartQueueRail
        activeQueue="heute"
        counts={mockCounts}
        savedViews={mockSavedViews}
        onQueueSelect={onQueueSelect}
      />
    );

    expect(screen.getByText('Gespeicherte Ansichten')).toBeTruthy();
    expect(screen.getByTestId('queue-item-VIP Kunden')).toBeTruthy();
    expect(screen.getByTestId('queue-item-Neue Leads')).toBeTruthy();
  });

  test('calls onQueueSelect with prefixed id for saved views', async () => {
    const user = userEvent.setup();
    render(
      <SmartQueueRail
        activeQueue="heute"
        counts={mockCounts}
        savedViews={mockSavedViews}
        onQueueSelect={onQueueSelect}
      />
    );

    await user.click(screen.getByTestId('queue-item-VIP Kunden'));
    expect(onQueueSelect).toHaveBeenCalledWith('saved_1');
  });

  test('marks saved view as active when it matches activeQueue', () => {
    render(
      <SmartQueueRail
        activeQueue="saved_2"
        counts={mockCounts}
        savedViews={mockSavedViews}
        onQueueSelect={onQueueSelect}
      />
    );

    expect(screen.getByTestId('queue-item-Neue Leads').getAttribute('data-active')).toBe('true');
  });
});
