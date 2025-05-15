"use client"

import { useState, useEffect } from "react"
// Updated imports: Outlet and useMatchRoute
import { Link, useRouter, Outlet, useMatchRoute } from "@tanstack/react-router" 
import { cn } from "@/lib/utils"
// Button import was removed as it's not used directly in this version of the layout
// import { Button } from "@/components/ui/button" 
import {
  Database,
  // Settings2, // Settings2 icon not used
  FileText,
  // Users, // Users icon not used
  ChevronRight
} from "lucide-react"

interface SettingsLayoutProps {
  // Children prop is no longer needed when using Outlet
}

export default function SettingsLayout({}: SettingsLayoutProps) { // Removed children from props
  const router = useRouter()
  const matchRoute = useMatchRoute() // Hook for matching routes

  // Add debug logs
  console.log('[SettingsLayout] Rendering. Router state location:', router.state.location)
  
  // Log when component mounts/unmounts
  useEffect(() => {
    console.log('[SettingsLayout] Component mounted. Path from router state:', router.state.location.pathname)
    return () => console.log('[SettingsLayout] Component unmounted')
  }, [router.state.location.pathname])

  const navItems = [
    {
      title: "Datenbankverbindung", // Translated
      href: "/settings", // This is the target path for the Link
      icon: Database,
      // Check if this route (or its index) is active.
      // The `to` path for matchRoute should be the route path as defined in router.tsx
      isActive: () => !!matchRoute({ to: '/settings/', fuzzy: false }) || !!matchRoute({ to: '/settings', fuzzy: false }),
    },
    {
      title: "Benutzerdefinierte Felder", // Translated
      href: "/settings/custom-fields", // Target path for the Link
      icon: FileText,
      isActive: () => !!matchRoute({ to: '/settings/custom-fields', fuzzy: false }),
    }
  ]

  return (
    <div className="container mx-auto py-6">
      {/* Render the debug component at the top */}
      {/* <SettingsDebugComponent /> */} {/* Commented out or remove if no longer needed */}
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0 mt-4">
        <aside className="lg:w-1/5">
          <div className="space-y-4">
            <div className="px-3 py-2">
              <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                Einstellungen {/* Translated */}
              </h2>
              <div className="space-y-1">
                {navItems.map((item) => {
                  const active = item.isActive(); // Call the function to get boolean
                  console.log(`[SettingsLayout] NavItem: ${item.title}, Href: ${item.href}, IsActive: ${active}`);
                  return (
                    <Link
                      key={item.href}
                      to={item.href} // Use the direct href for navigation
                      // onClick={() => console.log(`[SettingsLayout] Link clicked: ${item.href}`)} // Optional: keep for debugging clicks
                      className={cn(
                        "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "transparent"
                      )}
                      // activeProps can also be used for styling active links, TanStack Router handles this
                      // activeProps={{ className: "bg-accent text-accent-foreground" }}
                    >
                      <div className="flex items-center">
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.title}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 opacity-50" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>
        <div className="flex-1">
          {/* Outlet will render the matched child route component */}
          <Outlet />
        </div>
      </div>
    </div>
  )
}
