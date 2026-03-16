import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@dnd-kit/core', () => ({
  useDroppable: jest.fn(() => ({
    setNodeRef: jest.fn(),
    isOver: false,
  })),
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div data-testid="sortable-context">{children}</div>,
  verticalListSortingStrategy: {},
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
  CSS: { Transform: { toString: jest.fn(() => '') } },
}));

jest.mock('@tanstack/react-router', () => ({
  Link: ({ children }: any) => <a>{children}</a>,
}));

// Mock Select components used inside KanbanCard
jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: () => <span />,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div role="option">{children}</div>,
}));

import { KanbanColumn } from '@/components/deal/kanban-column';

const makeDeals = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Deal ${i + 1}`,
    customer: `Customer ${i + 1}`,
    value: '1000',
    createdDate: '2026-01-01',
    expectedCloseDate: '2026-12-31',
    stage: 'Qualifiziert',
  }));

describe('KanbanColumn', () => {
  test('renders column title', () => {
    render(<KanbanColumn id="qualifiziert" title="Qualifiziert" deals={[]} />);
    expect(screen.getByText(/Qualifiziert/i)).toBeTruthy();
  });

  test('shows deal count in title', () => {
    const deals = makeDeals(3);
    render(<KanbanColumn id="qualifiziert" title="Qualifiziert" deals={deals} />);
    expect(screen.getByText('(3)')).toBeTruthy();
  });

  test('shows zero count when no deals', () => {
    render(<KanbanColumn id="qualifiziert" title="Qualifiziert" deals={[]} />);
    expect(screen.getByText('(0)')).toBeTruthy();
  });

  test('renders all deal cards', () => {
    const deals = makeDeals(3);
    render(<KanbanColumn id="qualifiziert" title="Qualifiziert" deals={deals} />);
    expect(screen.getByText('Deal 1')).toBeTruthy();
    expect(screen.getByText('Deal 2')).toBeTruthy();
    expect(screen.getByText('Deal 3')).toBeTruthy();
  });

  test('wraps cards in SortableContext', () => {
    render(<KanbanColumn id="qualifiziert" title="Qualifiziert" deals={makeDeals(1)} />);
    expect(screen.getByTestId('sortable-context')).toBeTruthy();
  });

  test('applies isOver styling when dragging over', () => {
    const { useDroppable } = require('@dnd-kit/core');
    useDroppable.mockReturnValue({ setNodeRef: jest.fn(), isOver: true });

    const { container } = render(
      <KanbanColumn id="qualifiziert" title="Qualifiziert" deals={[]} />
    );

    const dropZone = container.querySelector('.ring-2');
    expect(dropZone).toBeTruthy();
  });
});
