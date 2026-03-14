"use client"

import { Link, Outlet, useMatchRoute } from "@tanstack/react-router"
import { cn } from "@/lib/utils"
import { Database, FileText } from "lucide-react"

const navItems = [
  {
    title: "Datenbankverbindung",
    href: "/settings" as const,
    icon: Database,
  },
  {
    title: "Benutzerdefinierte Felder",
    href: "/settings/custom-fields" as const,
    icon: FileText,
  },
]

export default function SettingsLayout() {
  const matchRoute = useMatchRoute()

  return (
    <main className="flex-1">
      <div className="px-6 py-4">
        {/* Tab navigation */}
        <div className="border-b mb-6">
          <nav className="flex gap-1 -mb-px">
            {navItems.map((item) => {
              const isActive =
                item.href === "/settings"
                  ? !!matchRoute({ to: '/settings', fuzzy: false })
                  : !!matchRoute({ to: item.href, fuzzy: false })

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                    isActive
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              )
            })}
          </nav>
        </div>

        <Outlet />
      </div>
    </main>
  )
}
