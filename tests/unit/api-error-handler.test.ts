const mockToast = jest.fn();

jest.mock('@/components/ui/use-toast', () => ({
  toast: mockToast,
}));

import { handleApiError } from '@/lib/api-error-handler';

describe('handleApiError', () => {
  beforeEach(() => {
    mockToast.mockReset();
  });

  test('shows toast with context title', () => {
    handleApiError(new Error('Something failed'), 'fetching customers');

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Fehler: fetching customers',
        variant: 'destructive',
      })
    );
  });

  test('uses Error.message as description', () => {
    handleApiError(new Error('Connection refused'), 'saving data');

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Connection refused',
      })
    );
  });

  test('uses string error directly', () => {
    handleApiError('Something went wrong', 'loading products');

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Something went wrong',
      })
    );
  });

  test('uses errorDetails.userMessage when available', () => {
    const error = {
      errorDetails: {
        userMessage: 'Verbindung zum Server fehlgeschlagen',
        suggestion: 'Prüfen Sie Ihre Netzwerkverbindung',
      },
    };

    handleApiError(error, 'connecting');

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('Verbindung zum Server fehlgeschlagen'),
      })
    );
  });

  test('appends suggestion when errorDetails.suggestion present', () => {
    const error = {
      errorDetails: {
        userMessage: 'Auth failed',
        suggestion: 'Check credentials',
      },
    };

    handleApiError(error, 'login');

    const call = mockToast.mock.calls[0][0];
    expect(call.description).toContain('Auth failed');
    expect(call.description).toContain('Check credentials');
    expect(call.description).toContain('Lösungsvorschlag');
  });

  test('uses backend error string from { success: false, error: "..." } shape', () => {
    const backendError = { success: false, error: 'Record not found' };

    handleApiError(backendError, 'deleting customer');

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Record not found',
      })
    );
  });

  test('uses fallback message for null error', () => {
    handleApiError(null, 'unknown operation');

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Ein unerwarteter Fehler ist aufgetreten.',
      })
    );
  });

  test('uses custom fallback message when provided', () => {
    handleApiError(null, 'something', 'Benutzerdefinierter Fehler');

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Benutzerdefinierter Fehler',
      })
    );
  });

  test('uses fallback for empty string error', () => {
    handleApiError('', 'test context');

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Ein unerwarteter Fehler ist aufgetreten.',
      })
    );
  });

  test('uses fallback when errorDetails has no userMessage, still appends suggestion', () => {
    const error = {
      errorDetails: {
        // userMessage is missing — falls back to default message
        suggestion: 'Try again',
      },
    };

    handleApiError(error, 'context');

    const call = mockToast.mock.calls[0][0];
    expect(call.description).toContain('Ein unerwarteter Fehler ist aufgetreten.');
    expect(call.description).toContain('Try again');
  });

  test('uses Error fallback message when error.message is empty', () => {
    const err = new Error('');
    handleApiError(err, 'context');

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Ein unerwarteter Fehler ist aufgetreten.',
      })
    );
  });

  test('uses errorDetails.userMessage over Error.message', () => {
    const error = new Error('low-level error');
    (error as any).errorDetails = { userMessage: 'Benutzerfreundliche Meldung' };

    handleApiError(error, 'context');

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Benutzerfreundliche Meldung',
      })
    );
  });
});
