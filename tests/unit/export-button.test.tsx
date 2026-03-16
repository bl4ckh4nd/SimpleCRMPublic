import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExportButton from '@/components/export-button';

const saveCSVMock = jest.fn();
const saveDataMock = jest.fn();
const toastSuccessMock = jest.fn();
const toastErrorMock = jest.fn();

jest.mock('@/lib/electron-utils', () => ({
  saveCSVToDesktop: (...args: unknown[]) => saveCSVMock(...args),
  saveDataToDesktop: (...args: unknown[]) => saveDataMock(...args),
}));

jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  }),
}));

// Radix DropdownMenu uses portals which don't render in JSDOM.
// Replace with a flat stub so menu items are always visible in tests.
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    asChild ? <>{children}</> : <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

const sampleData = [
  { id: 1, name: 'Alice', city: 'Berlin' },
  { id: 2, name: 'Bob', city: 'Hamburg' },
];

describe('ExportButton', () => {
  beforeEach(() => {
    saveCSVMock.mockReset().mockReturnValue(true);
    saveDataMock.mockReset().mockReturnValue(true);
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  test('renders the trigger button with default label', () => {
    render(<ExportButton data={sampleData} fileName="test.json" />);
    // The trigger button renders the text "Exportieren" (without CSV/JSON prefix)
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(1);
    const buttons = screen.getAllByRole('button');
    const trigger = buttons.find(b => b.textContent?.includes('Exportieren') && !b.textContent?.includes('CSV') && !b.textContent?.includes('JSON'));
    expect(trigger).toBeTruthy();
  });

  test('shows CSV and JSON menu items', () => {
    render(<ExportButton data={sampleData} fileName="test.json" />);
    expect(screen.getByText(/CSV exportieren/i)).toBeTruthy();
    expect(screen.getByText(/JSON exportieren/i)).toBeTruthy();
  });

  test('calls saveCSVToDesktop with .csv filename on CSV click', async () => {
    render(<ExportButton data={sampleData} fileName="customers.json" />);
    fireEvent.click(screen.getByText(/CSV exportieren/i));

    await waitFor(() => {
      expect(saveCSVMock).toHaveBeenCalledWith(sampleData, 'customers.csv');
    });
  });

  test('calls saveDataToDesktop with .json filename on JSON click', async () => {
    render(<ExportButton data={sampleData} fileName="customers.json" />);
    fireEvent.click(screen.getByText(/JSON exportieren/i));

    await waitFor(() => {
      expect(saveDataMock).toHaveBeenCalledWith(sampleData, 'customers.json');
    });
  });

  test('strips existing extension before applying new one', async () => {
    render(<ExportButton data={sampleData} fileName="export.csv" />);
    fireEvent.click(screen.getByText(/CSV exportieren/i));

    await waitFor(() => {
      expect(saveCSVMock).toHaveBeenCalledWith(sampleData, 'export.csv');
    });
  });

  test('shows success toast after CSV export', async () => {
    render(<ExportButton data={sampleData} fileName="test.json" />);
    fireEvent.click(screen.getByText(/CSV exportieren/i));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Als CSV exportiert');
    });
  });

  test('shows success toast after JSON export', async () => {
    render(<ExportButton data={sampleData} fileName="test.json" />);
    fireEvent.click(screen.getByText(/JSON exportieren/i));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Als JSON exportiert');
    });
  });

  test('shows error toast when CSV export fails', async () => {
    saveCSVMock.mockReturnValue(false);
    render(<ExportButton data={sampleData} fileName="test.json" />);
    fireEvent.click(screen.getByText(/CSV exportieren/i));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Export fehlgeschlagen');
    });
  });

  test('shows error toast when JSON export fails', async () => {
    saveDataMock.mockReturnValue(false);
    render(<ExportButton data={sampleData} fileName="test.json" />);
    fireEvent.click(screen.getByText(/JSON exportieren/i));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Export fehlgeschlagen');
    });
  });

  test('renders custom children text inside trigger button', () => {
    render(<ExportButton data={sampleData} fileName="test.json">Daten exportieren</ExportButton>);
    expect(screen.getByText('Daten exportieren')).toBeTruthy();
  });
});
