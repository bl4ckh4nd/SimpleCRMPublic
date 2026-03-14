import React from 'react';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '@/components/page-header';

describe('PageHeader', () => {
  test('renders title', () => {
    render(<PageHeader title="My Page" />);
    expect(screen.getByRole('heading', { name: 'My Page' })).toBeTruthy();
  });

  test('renders subtitle when provided', () => {
    render(<PageHeader title="My Page" subtitle="Subtitle text" />);
    expect(screen.getByText('Subtitle text')).toBeTruthy();
  });

  test('omits subtitle when not provided', () => {
    render(<PageHeader title="My Page" />);
    expect(screen.queryByText('Subtitle text')).toBeNull();
  });

  test('renders actions when provided', () => {
    render(
      <PageHeader
        title="My Page"
        actions={<button>Action</button>}
      />
    );
    expect(screen.getByRole('button', { name: 'Action' })).toBeTruthy();
  });

  test('omits actions when not provided', () => {
    render(<PageHeader title="My Page" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('renders toolbar when provided', () => {
    render(
      <PageHeader
        title="My Page"
        toolbar={<input placeholder="Search" />}
      />
    );
    expect(screen.getByPlaceholderText('Search')).toBeTruthy();
  });

  test('omits toolbar when not provided', () => {
    render(<PageHeader title="My Page" />);
    expect(screen.queryByPlaceholderText('Search')).toBeNull();
  });
});
