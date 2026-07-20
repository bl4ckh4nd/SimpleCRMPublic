import type { HTMLAttributes } from "react"
import { Link } from "@tanstack/react-router"
import { Users, FileBox, CheckSquare, Settings, CalendarDays, Package, ListChecks, LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"

const navLinks = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/followup", label: "Nachverfolgung", icon: ListChecks },
  { to: "/customers", label: "Kunden", icon: Users },
  { to: "/deals", label: "Deals", icon: FileBox },
  { to: "/tasks", label: "Aufgaben", icon: CheckSquare },
  { to: "/products", label: "Produkte", icon: Package },
  { to: "/calendar", label: "Kalender", icon: CalendarDays },
] as const

const navLinkClassName =
  "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary"

const activeNavLinkClassName =
  "text-primary font-semibold border-b-2 border-primary pb-[1.19rem] -mb-[1.19rem]"

export function MainNav({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <nav className={cn("border-b", className)} {...props}>
      <div className="flex h-16 items-center px-4">
        <div className="flex flex-1 items-center space-x-4 lg:space-x-6">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={navLinkClassName}
              activeProps={{ className: activeNavLinkClassName }}
              inactiveProps={{ className: "text-muted-foreground" }}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
        <Link
          to="/settings"
          className={`${navLinkClassName} ml-auto`}
          activeProps={{ className: "text-primary" }}
          inactiveProps={{ className: "text-muted-foreground" }}
        >
          <Settings className="h-4 w-4" />
          <span>Einstellungen</span>
        </Link>
      </div>
    </nav>
  )
}
