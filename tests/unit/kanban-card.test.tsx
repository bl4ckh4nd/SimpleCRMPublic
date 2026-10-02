import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSortable } from '@dnd-kit/sortable';

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
  Link: ({ children, to, params }: unknown) => (
    <a href={`${to}/${params?.dealId ?? ''}`}>{children}</a>
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
    expect(screen.getByText(/15\.000,00\s*€/)).toBeTruthy();
  });

  test('renders expected close date', () => {
    render(<KanbanCard deal={mockDeal} />);
    expect(screen.getByText(/Abschluss am.*30\.6\.2026/)).toBeTruthy();
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

  test('renders stage action when onStageChange is provided', () => {
    render(<KanbanCard deal={mockDeal} onStageChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Phase für Enterprise Deal ändern' })).toBeTruthy();
  });

  test('does not render stage action without onStageChange', () => {
    render(<KanbanCard deal={mockDeal} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText('Qualifiziert')).toBeNull();
  });

  test('calls onStageChange from the action menu', async () => {
    const user = userEvent.setup();
    const onStageChange = jest.fn();
    render(<KanbanCard deal={mockDeal} onStageChange={onStageChange} />);
    await user.click(screen.getByRole('button', { name: 'Phase für Enterprise Deal ändern' }));
    await user.click(screen.getByRole('menuitem', { name: 'Angebot' }));
    expect(onStageChange).toHaveBeenCalledWith(1, 'Angebot');
  });

  test('shows dash when expectedCloseDate is empty', () => {
    const noDeal = { ...mockDeal, expectedCloseDate: '' };
    render(<KanbanCard deal={noDeal} />);
    expect(screen.getByText(/Abschluss am.*—/)).toBeTruthy();
  });

  test('applies drag styles when isDragging', () => {
    jest.mocked(useSortable).mockReturnValue({
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
