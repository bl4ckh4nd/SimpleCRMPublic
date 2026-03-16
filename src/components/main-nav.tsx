// @ts-nocheck
import { Link } from "@tanstack/react-router"
import { Users, FileBox, CheckSquare, CheckCircle, Settings, CalendarDays, Package, ListChecks, LayoutDashboard } from "lucide-react"
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

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav className="border-b">
      <div className="flex h-16 items-center px-4">
        <Link to="/" className="mr-6 flex items-center space-x-2">
          <CheckCircle className="h-6 w-6" />
          <span className="font-bold">SimpleCRM</span>
        </Link>
        <div className="flex flex-1 items-center space-x-4 lg:space-x-6">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary"
              )}
              activeProps={{ className: "text-primary font-semibold border-b-2 border-primary pb-[1.19rem] -mb-[1.19rem]" }}
              inactiveProps={{ className: "text-muted-foreground" }}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
        <Link
          to="/settings"
          className={cn(
            "ml-auto flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary"
          )}
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
