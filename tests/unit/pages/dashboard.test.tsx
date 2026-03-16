import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

jest.mock('@/lib/utils', () => ({
  cn: (...c: any[]) => c.filter(Boolean).join(' '),
}));

const mockDashboardService = {
  getDashboardStats: jest.fn(),
  getRecentCustomers: jest.fn(),
  getUpcomingTasks: jest.fn(),
};

jest.mock('@/services/data/dashboardService', () => ({
  dashboardService: mockDashboardService,
}));

// Suppress skeleton/card/button imports
jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div data-testid="skeleton" className={className} />,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, asChild }: any) =>
    asChild
      ? <div>{children}</div>
      : <button onClick={onClick}>{children}</button>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
  CardFooter: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));

import DashboardPage from '@/app/page';

const mockStats = {
  totalCustomers: 10,
  activeDealsCount: 5,
  totalDealsValue: 50000,
  pendingTasksCount: 3,
  overdueTasksCount: 1,
  wonDealsCount: 2,
};

const mockCustomers = [
  { id: 1, name: 'Müller', firstName: 'Hans', status: 'Active', dateCreated: '2026-03-01' },
];

const mockTasks = [
  { id: 1, title: 'Follow up', customer_name: 'ACME', due_date: '2026-04-01', completed: 0 },
];

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDashboardService.getDashboardStats.mockResolvedValue(mockStats);
    mockDashboardService.getRecentCustomers.mockResolvedValue(mockCustomers);
    mockDashboardService.getUpcomingTasks.mockResolvedValue(mockTasks);
  });

  test('shows loading skeletons initially', () => {
    render(<DashboardPage />);
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('shows error message when data loading fails', async () => {
    mockDashboardService.getDashboardStats.mockRejectedValue(new Error('Network error'));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Fehler beim Laden/i)).toBeTruthy();
    });
  });

  test('shows retry button on error', async () => {
    mockDashboardService.getDashboardStats.mockRejectedValue(new Error('fail'));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Erneut versuchen/i)).toBeTruthy();
    });
  });

  test('displays customer name after loading', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Müller')).toBeTruthy();
    });
  });

  test('displays task title after loading', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Follow up')).toBeTruthy();
    });
  });

  test('shows onboarding when all counts are zero', async () => {
    const emptyStats = { ...mockStats, totalCustomers: 0, activeDealsCount: 0, pendingTasksCount: 0 };
    mockDashboardService.getDashboardStats.mockResolvedValue(emptyStats);
    mockDashboardService.getRecentCustomers.mockResolvedValue([]);
    mockDashboardService.getUpcomingTasks.mockResolvedValue([]);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Willkommen bei SimpleCRM/i)).toBeTruthy();
    });
  });

  test('calls all three service methods on mount', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockDashboardService.getDashboardStats).toHaveBeenCalledTimes(1);
      expect(mockDashboardService.getRecentCustomers).toHaveBeenCalledWith(5);
      expect(mockDashboardService.getUpcomingTasks).toHaveBeenCalledWith(5);
    });
  });
});
