import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, activeProps, inactiveProps, ...rest }: any) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

import { MainNav } from '@/components/main-nav';

describe('MainNav', () => {
  test('renders the SimpleCRM brand link', () => {
    render(<MainNav />);
    expect(screen.getByText('SimpleCRM')).toBeTruthy();
  });

  test('renders all main navigation links', () => {
    render(<MainNav />);

    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Nachverfolgung')).toBeTruthy();
    expect(screen.getByText('Kunden')).toBeTruthy();
    expect(screen.getByText('Deals')).toBeTruthy();
    expect(screen.getByText('Aufgaben')).toBeTruthy();
    expect(screen.getByText('Produkte')).toBeTruthy();
    expect(screen.getByText('Kalender')).toBeTruthy();
  });

  test('renders settings link', () => {
    render(<MainNav />);
    expect(screen.getByText('Einstellungen')).toBeTruthy();
  });

  test('nav links point to correct routes', () => {
    render(<MainNav />);

    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));

    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/followup');
    expect(hrefs).toContain('/customers');
    expect(hrefs).toContain('/deals');
    expect(hrefs).toContain('/tasks');
    expect(hrefs).toContain('/products');
    expect(hrefs).toContain('/calendar');
    expect(hrefs).toContain('/settings');
  });

  test('renders inside a nav element', () => {
    const { container } = render(<MainNav />);
    expect(container.querySelector('nav')).toBeTruthy();
  });
});
