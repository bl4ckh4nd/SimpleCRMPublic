import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock SnoozePopover to avoid complex UI dependencies
jest.mock('@/components/followup/snooze-popover', () => ({
  SnoozePopover: ({ children, onSnooze }: any) => (
    <div data-testid="snooze-popover" onClick={() => onSnooze('2026-03-20T09:00:00Z')}>
      {children}
    </div>
  ),
}));

import { QuickActions } from '@/components/followup/quick-actions';

const defaultProps = {
  onLogCall: jest.fn(),
  onLogEmail: jest.fn(),
  onAddNote: jest.fn(),
  onSnooze: jest.fn(),
  onComplete: jest.fn(),
  sourceType: 'task' as const,
};

describe('QuickActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders all three core action buttons', () => {
    render(<QuickActions {...defaultProps} />);

    expect(screen.getByRole('button', { name: /Anruf/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Mail/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Notiz/i })).toBeTruthy();
  });

  test('renders Snooze and Erledigt buttons for task source type', () => {
    render(<QuickActions {...defaultProps} sourceType="task" />);

    expect(screen.getByRole('button', { name: /Snooze/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Erledigt/i })).toBeTruthy();
  });

  test('does not render Snooze and Erledigt buttons for deal source type', () => {
    render(<QuickActions {...defaultProps} sourceType="deal" />);

    expect(screen.queryByRole('button', { name: /Snooze/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Erledigt/i })).toBeNull();
  });

  test('calls onLogCall when Anruf button clicked', async () => {
    const user = userEvent.setup();
    render(<QuickActions {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /Anruf/i }));
    expect(defaultProps.onLogCall).toHaveBeenCalledTimes(1);
  });

  test('calls onLogEmail when Mail button clicked', async () => {
    const user = userEvent.setup();
    render(<QuickActions {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /Mail/i }));
    expect(defaultProps.onLogEmail).toHaveBeenCalledTimes(1);
  });

  test('calls onAddNote when Notiz button clicked', async () => {
    const user = userEvent.setup();
    render(<QuickActions {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /Notiz/i }));
    expect(defaultProps.onAddNote).toHaveBeenCalledTimes(1);
  });

  test('calls onComplete when Erledigt button clicked', async () => {
    const user = userEvent.setup();
    render(<QuickActions {...defaultProps} sourceType="task" />);

    await user.click(screen.getByRole('button', { name: /Erledigt/i }));
    expect(defaultProps.onComplete).toHaveBeenCalledTimes(1);
  });

  test('calls onSnooze through SnoozePopover', async () => {
    const user = userEvent.setup();
    render(<QuickActions {...defaultProps} sourceType="task" />);

    const snoozePopover = screen.getByTestId('snooze-popover');
    await user.click(snoozePopover);
    expect(defaultProps.onSnooze).toHaveBeenCalledWith('2026-03-20T09:00:00Z');
  });
});
