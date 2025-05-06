import { Link } from "@tanstack/react-router"
import { Users, FileBox, CheckSquare, CheckCircle, Settings, CalendarDays, Package } from "lucide-react"
import { cn } from "@/lib/utils"


export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav className="border-b">
      <div className="flex h-16 items-center px-4">
        <Link to="/" className="mr-6 flex items-center space-x-2">
          <CheckCircle className="h-6 w-6" />
          <span className="hidden font-bold sm:inline-block">SimpleCRM</span>
        </Link>
        <div className="flex items-center space-x-4 lg:space-x-6">
          <Link
            to="/customers"
            className={cn(
              "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary"
            )}
            activeProps={{ className: "text-primary" }}
            inactiveProps={{ className: "text-muted-foreground" }}
          >
            <Users className="h-4 w-4" />
            <span>Kunden</span>
          </Link>
          <Link
            to="/deals"
            className={cn(
              "flex items-center space-x-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            )}
            activeProps={{ className: "text-primary" }}
            inactiveProps={{ className: "text-muted-foreground" }}
          >
            <FileBox className="h-4 w-4" />
            <span>Deals</span>
          </Link>
          <Link
            to="/tasks"
            className={cn(
              "flex items-center space-x-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            )}
            activeProps={{ className: "text-primary" }}
            inactiveProps={{ className: "text-muted-foreground" }}
          >
            <CheckSquare className="h-4 w-4" />
            <span>Aufgaben</span>
          </Link>
          <Link
            to="/products"
            className={cn(
              "flex items-center space-x-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            )}
            activeProps={{ className: "text-primary" }}
            inactiveProps={{ className: "text-muted-foreground" }}
          >
            <Package className="h-4 w-4" />
            <span>Produkte</span>
          </Link>
          <Link
            to="/calendar"
            className={cn(
              "flex items-center space-x-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            )}
            activeProps={{ className: "text-primary" }}
            inactiveProps={{ className: "text-muted-foreground" }}
          >
            <CalendarDays className="h-4 w-4" />
            <span>Kalender</span>
          </Link>
          <Link
            to="/settings"
            className={cn(
              "flex items-center space-x-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            )}
            activeProps={{ className: "text-primary" }}
            inactiveProps={{ className: "text-muted-foreground" }}
          >
            <Settings className="h-4 w-4" />
            <span>Einstellungen</span>
          </Link>
        </div>

      </div>
    </nav>
  )
}

