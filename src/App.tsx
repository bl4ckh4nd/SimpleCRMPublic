// Import Geist fonts via CSS instead
import './fonts.css';
import './styles/globals.css'; // Import global styles
import { Outlet } from '@tanstack/react-router';
import { ThemeProvider } from "next-themes";
import Titlebar from '@/components/ui/titlebar';
import { MainNav } from '@/components/main-nav';
import { UpdateStatusDisplay } from '@/components/update-status-display';
import { ErrorBoundary } from '@/components/error-boundary';

export default function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <Titlebar />
      <MainNav />
      <UpdateStatusDisplay />
      <div className="font-sans antialiased">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>
    </ThemeProvider>
  );
}
