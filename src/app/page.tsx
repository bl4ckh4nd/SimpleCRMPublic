import { Link } from "@tanstack/react-router"
import { ArrowRight, BarChart3, Clock, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="flex-1 mt-0">
      <div className="container mx-auto max-w-7xl py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button size="sm" asChild>
            <Link to="/customers/new">
              <span>Neuer Kunde</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Gesamtkunden</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">+2 seit letztem Monat</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Aktive Deals</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12.500 €</div>
              <p className="text-xs text-muted-foreground">3 Deals in der Pipeline</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ausstehende Aufgaben</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7</div>
              <p className="text-xs text-muted-foreground">2 fällig heute</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Konversionsrate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24%</div>
              <p className="text-xs text-muted-foreground">+5% seit letztem Monat</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Neueste Kunden</CardTitle>
              <CardDescription>Sie haben insgesamt 24 Kunden.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentCustomers.map((customer) => (
                  <div key={customer.id} className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-sm font-medium text-primary">
                        {customer.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-none">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">{customer.email}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">{customer.date}</div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                <Link href="/customers" className="flex w-full items-center justify-center">
                  Alle Kunden anzeigen
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Bevorstehende Aufgaben</CardTitle>
              <CardDescription>Sie haben 7 ausstehende Aufgaben.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        task.priority === "Hoch"
                          ? "bg-red-100 text-red-600"
                          : task.priority === "Mittel"
                            ? "bg-amber-100 text-amber-600"
                            : "bg-green-100 text-green-600"
                      }`}
                    >
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-none">{task.title}</p>
                      <p className="text-sm text-muted-foreground">{task.customer}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">{task.dueDate}</div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                <Link href="/tasks" className="flex w-full items-center justify-center">
                  Alle Aufgaben anzeigen
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  )
}

const recentCustomers = [
  {
    id: 1,
    name: "Johann Schmidt",
    email: "johann@acmecorp.de",
    date: "vor 2 Tagen",
  },
  {
    id: 2,
    name: "Sarah Müller",
    email: "sarah@techinc.de",
    date: "vor 3 Tagen",
  },
  {
    id: 3,
    name: "Michael Braun",
    email: "michael@lokalgeschaeft.de",
    date: "vor 5 Tagen",
  },
  {
    id: 4,
    name: "Emilia Davis",
    email: "emilia@handwerksbaeckerei.de",
    date: "vor 1 Woche",
  },
  {
    id: 5,
    name: "David Wilson",
    email: "david@wilsondesign.de",
    date: "vor 2 Wochen",
  },
  {
    id: 6,
    name: "Jennifer Taylor",
    email: "jennifer@taylorfit.de",
    date: "vor 3 Wochen",
  },
];

const upcomingTasks = [
  {
    id: 1,
    title: "Nachfassanruf",
    customer: "Johann Schmidt",
    dueDate: "Heute",
    priority: "Hoch",
  },
  {
    id: 2,
    title: "Angebot senden",
    customer: "Sarah Müller",
    dueDate: "Heute",
    priority: "Mittel",
  },
  {
    id: 3,
    title: "Produktdemo",
    customer: "Michael Braun",
    dueDate: "Morgen",
    priority: "Hoch",
  },
  {
    id: 4,
    title: "Check-in-E-Mail",
    customer: "Emilia Davis",
    dueDate: "In 2 Tagen",
    priority: "Niedrig",
  },
  {
    id: 5,
    title: "Rechnungserinnerung",
    customer: "David Wilson",
    dueDate: "In 3 Tagen",
    priority: "Mittel",
  },
  {
    id: 6,
    title: "Installation planen",
    customer: "Jennifer Taylor",
    dueDate: "In 4 Tagen",
    priority: "Mittel",
  },
];

