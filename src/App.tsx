import { Outlet } from '@tanstack/react-router';
import { ThemeProvider } from "next-themes";
import Titlebar from '@/components/ui/titlebar';
import { MainNav } from '@/components/main-nav';
import { UpdateStatusDisplay } from '@/components/update-status-display';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/sonner';

export default function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <div className="flex h-dvh min-w-0 flex-col overflow-hidden">
      <Titlebar />
      <MainNav />
      <UpdateStatusDisplay />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>
      </div>
      <Toaster position="bottom-right" />
    </ThemeProvider>
  );
}
