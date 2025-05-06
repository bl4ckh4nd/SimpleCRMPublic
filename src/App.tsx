// Import Geist fonts via CSS instead
import './fonts.css';
import './styles/globals.css'; // Import global styles
import { Outlet } from '@tanstack/react-router';
// Import ThemeProvider
import { ThemeProvider } from "next-themes"; // Import from next-themes
import Titlebar from '@/components/ui/titlebar'; // Import Titlebar
import { MainNav } from '@/components/main-nav'; // Import MainNav

export default function App() {
  return (
    // Wrap everything in ThemeProvider if you use it
    <ThemeProvider
      attribute="class"
      defaultTheme="light" // Or your preferred default
      enableSystem
      disableTransitionOnChange
    >
      {/* Render the Titlebar first */}
      <Titlebar />
      <MainNav /> {/* Added MainNav here */}

      {/* Main content area with padding-top to account for the fixed titlebar */}
      {/* The h-8 class on Titlebar corresponds to 2rem, so pt-8 is appropriate */}
      <div className="font-sans antialiased">
        {/* Outlet renders the matched route component */}
        <Outlet />
      </div>
    </ThemeProvider>
  );
}
