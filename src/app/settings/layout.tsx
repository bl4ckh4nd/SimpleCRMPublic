"use client"

import { Link, Outlet, useMatchRoute } from "@tanstack/react-router"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Bell, Database, FileText } from "lucide-react"

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
  {
    title: "E-Mail-Benachrichtigungen",
    href: "/settings/notifications" as const,
    icon: Bell,
  },
]

export default function SettingsLayout() {
  const matchRoute = useMatchRoute()
  const { theme = "light", setTheme } = useTheme()

  return (
    <main className="flex-1">
      <div className="px-4 py-4 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          <Label htmlFor="appearance">Darstellung</Label>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger id="appearance" className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="light">Hell</SelectItem><SelectItem value="dark">Dunkel</SelectItem><SelectItem value="system">System</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="border-b mb-6">
          <nav aria-label="Einstellungen" className="flex flex-wrap gap-1 -mb-px">
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
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
