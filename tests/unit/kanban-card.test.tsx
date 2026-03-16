import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock dnd-kit to avoid needing DndContext
jest.mock('@dnd-kit/sortable', () => ({
  useSortable: jest.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  })),
}));

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: jest.fn(() => ''),
    },
  },
}));

// Mock TanStack Router Link
jest.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params }: any) => (
    <a href={`${to}/${params?.dealId ?? ''}`}>{children}</a>
  ),
}));

// Mock Radix Select (portal-based)
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid="select" data-value={value}>
      {React.Children.map(children, (child: any) =>
        React.cloneElement(child, { onValueChange })
      )}
    </div>
  ),
  SelectTrigger: ({ children }: any) => <button data-testid="select-trigger">{children}</button>,
  SelectValue: () => <span data-testid="select-value" />,
  SelectContent: ({ children, onValueChange }: any) => (
    <div data-testid="select-content">
      {React.Children.map(children, (child: any) =>
        child?.props ? React.cloneElement(child, { onValueChange }) : child
      )}
    </div>
  ),
  SelectItem: ({ children, value, onValueChange }: any) => (
    <div
      data-testid={`select-item-${value}`}
      onClick={() => onValueChange?.(value)}
      role="option"
    >
      {children}
    </div>
  ),
}));

import { KanbanCard } from '@/components/deal/kanban-card';

const mockDeal = {
  id: 1,
  name: 'Enterprise Deal',
  customer: 'ACME Corp',
  value: '15000',
  createdDate: '2026-01-15',
  expectedCloseDate: '2026-06-30',
  stage: 'Qualifiziert',
};

describe('KanbanCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders deal name as link', () => {
    render(<KanbanCard deal={mockDeal} />);
    const link = screen.getByRole('link', { name: 'Enterprise Deal' });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toContain('1');
  });

  test('renders customer name', () => {
    render(<KanbanCard deal={mockDeal} />);
    expect(screen.getByText('ACME Corp')).toBeTruthy();
  });

  test('renders deal value with euro sign', () => {
    render(<KanbanCard deal={mockDeal} />);
    expect(screen.getByText(/15000 €/)).toBeTruthy();
  });

  test('renders expected close date', () => {
    render(<KanbanCard deal={mockDeal} />);
    expect(screen.getByText(/Abschluss:.*2026-06-30/)).toBeTruthy();
  });

  test('shows dynamic calculation label when value_calculation_method is dynamic', () => {
    const dynamicDeal = { ...mockDeal, value_calculation_method: 'dynamic' as const };
    render(<KanbanCard deal={dynamicDeal} />);
    expect(screen.getByText(/Dynamisch/i)).toBeTruthy();
  });

  test('does not show dynamic label for static calculation method', () => {
    render(<KanbanCard deal={mockDeal} />);
    expect(screen.queryByText(/Dynamisch/i)).toBeNull();
  });

  test('renders stage select when onStageChange is provided', () => {
    render(<KanbanCard deal={mockDeal} onStageChange={jest.fn()} />);
    expect(screen.getByTestId('select')).toBeTruthy();
  });

  test('does not render stage select when onStageChange is not provided', () => {
    render(<KanbanCard deal={mockDeal} />);
    expect(screen.queryByTestId('select')).toBeNull();
  });

  test('calls onStageChange with deal id and new stage', async () => {
    const user = userEvent.setup();
    const onStageChange = jest.fn();
    render(<KanbanCard deal={mockDeal} onStageChange={onStageChange} />);

    const angebotOption = screen.getByTestId('select-item-Angebot');
    await user.click(angebotOption);

    expect(onStageChange).toHaveBeenCalledWith(1, 'Angebot');
  });

  test('shows correct badge variant for Gewonnen stage', () => {
    const wonDeal = { ...mockDeal, stage: 'Gewonnen' };
    render(<KanbanCard deal={wonDeal} />);
    // Badge should render with the stage name
    expect(screen.getByText('Gewonnen')).toBeTruthy();
  });

  test('shows correct badge variant for Verloren stage', () => {
    const lostDeal = { ...mockDeal, stage: 'Verloren' };
    render(<KanbanCard deal={lostDeal} />);
    expect(screen.getByText('Verloren')).toBeTruthy();
  });

  test('shows dash when expectedCloseDate is empty', () => {
    const noDeal = { ...mockDeal, expectedCloseDate: '' };
    render(<KanbanCard deal={noDeal} />);
    expect(screen.getByText(/Abschluss:.*—/)).toBeTruthy();
  });

  test('applies drag styles when isDragging', () => {
    const { useSortable } = require('@dnd-kit/sortable');
    useSortable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: jest.fn(),
      transform: { x: 10, y: 5, scaleX: 1, scaleY: 1 },
      transition: 'transform 200ms',
      isDragging: true,
    });

    const { container } = render(<KanbanCard deal={mockDeal} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.opacity).toBe('0.5');
  });
});
