import type { HTMLAttributes } from "react"
import { Link } from "@tanstack/react-router"
import { Users, FileBox, CheckSquare, Settings, CalendarDays, Package, ListChecks, LayoutDashboard, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const navLinks = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/followup", label: "Nachverfolgung", icon: ListChecks },
  { to: "/customers", label: "Kunden", icon: Users },
  { to: "/deals", label: "Deals", icon: FileBox },
  { to: "/tasks", label: "Aufgaben", icon: CheckSquare },
  { to: "/products", label: "Produkte", icon: Package },
  { to: "/calendar", label: "Kalender", icon: CalendarDays },
  { to: "/settings", label: "Einstellungen", icon: Settings },
] as const

export function MainNav({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <nav aria-label="Hauptnavigation" className={cn("shrink-0 border-b", className)} {...props}>
      <div className="hidden h-16 items-stretch gap-4 px-6 lg:flex">
        {navLinks.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to}
            activeOptions={{ exact: to === "/" }}
            className={cn("flex items-center gap-2 border-b-2 text-sm font-medium transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", to === "/settings" && "ml-auto")}
            activeProps={{ className: "border-primary text-foreground font-semibold", 'aria-current': 'page' }}
            inactiveProps={{ className: "border-transparent text-muted-foreground" }}>
            <Icon className="h-4 w-4" aria-hidden="true" />{label}
          </Link>
        ))}
      </div>
      <div className="flex items-center px-4 py-2 lg:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" aria-label="Seiten öffnen"><Menu />Seiten</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-[var(--radix-dropdown-menu-content-available-height)] w-64 overflow-y-auto">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <DropdownMenuItem key={to} asChild>
                <Link to={to} activeOptions={{ exact: to === "/" }} activeProps={{ 'aria-current': 'page', className: "bg-accent font-semibold" }}><Icon aria-hidden="true" />{label}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
