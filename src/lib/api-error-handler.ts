import { toast } from '@/components/ui/use-toast';

/**
 * Centralized API error handler.
 * Logs the error and shows a toast notification.
 * @param error The error object or message.
 * @param context A string describing the context where the error occurred (e.g., "fetching products", "adding product").
 * @param userFriendlyBaseMessage An optional base message for the toast. If the error object contains a message, it might be used.
 */
export function handleApiError(
  error: any,
  context: string,
  userFriendlyBaseMessage = "Ein unerwarteter Fehler ist aufgetreten."
): void {
  console.error(`API Error in ${context}:`, error);

  let description = userFriendlyBaseMessage;

  // Check for detailed error information first
  if (error?.errorDetails) {
    description = error.errorDetails.userMessage || userFriendlyBaseMessage;
    if (error.errorDetails.suggestion) {
      description += `\n\nLösungsvorschlag: ${error.errorDetails.suggestion}`;
    }
  } else if (error instanceof Error) {
    description = error.message || userFriendlyBaseMessage;
  } else if (typeof error === 'string' && error.length > 0) {
    description = error;
  } else if (error && typeof error.error === 'string' && error.error.length > 0) {
    // For backend responses like { success: false, error: "message" }
    description = error.error;
  }

  toast({
    variant: "destructive",
    title: `Fehler: ${context}`,
    description: description,
  });
}