"use client";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Clock, Users, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardService, DashboardStats, RecentCustomer, UpcomingTask } from "@/services/data/dashboardService";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCustomers, setRecentCustomers] = useState<RecentCustomer[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingStats(true);
        setLoadingCustomers(true);
        setLoadingTasks(true);
        setError(null);

        const [statsData, customersData, tasksData] = await Promise.all([
          dashboardService.getDashboardStats(),
          dashboardService.getRecentCustomers(5),
          dashboardService.getUpcomingTasks(5),
        ]);

        setStats(statsData);
        setRecentCustomers(customersData);
        setUpcomingTasks(tasksData);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setError("Fehler beim Laden der Dashboard-Daten.");
      } finally {
        setLoadingStats(false);
        setLoadingCustomers(false);
        setLoadingTasks(false);
      }
    };

    fetchData();
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (error) {
    return (
      <main className="flex-1 mt-0">
        <div className="container mx-auto max-w-7xl py-6">
          <div className="flex items-center justify-center h-64">
            <p className="text-red-500">{error}</p>
          </div>
        </div>
      </main>
    );
  }

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
              {loadingStats ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{stats?.totalCustomers ?? 0}</div>}
              {loadingStats ? <Skeleton className="h-4 w-3/4 mt-1" /> : <p className="text-xs text-muted-foreground">+{stats?.newCustomersLastMonth ?? 0} seit letztem Monat</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Aktive Deals</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{stats?.activeDealsValue?.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) ?? '0 €'}</div>}
              {loadingStats ? <Skeleton className="h-4 w-3/4 mt-1" /> : <p className="text-xs text-muted-foreground">{stats?.activeDealsCount ?? 0} Deals in der Pipeline</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ausstehende Aufgaben</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{stats?.pendingTasksCount ?? 0}</div>}
              {loadingStats ? <Skeleton className="h-4 w-3/4 mt-1" /> : <p className="text-xs text-muted-foreground">{stats?.dueTodayTasksCount ?? 0} fällig heute</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Konversionsrate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{stats?.conversionRate ?? 0}%</div>}
              {loadingStats ? <Skeleton className="h-4 w-3/4 mt-1" /> : <p className="text-xs text-muted-foreground"> {/* Placeholder for change, as this is hard to get from current data */}</p>}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Neueste Kunden</CardTitle>
              {loadingCustomers ? <Skeleton className="h-4 w-1/2 mt-1" /> : <CardDescription>Sie haben insgesamt {stats?.totalCustomers ?? 0} Kunden.</CardDescription>}
            </CardHeader>
            <CardContent>
              {loadingCustomers ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  ))}
                </div>
              ) : recentCustomers.length > 0 ? (
                <div className="space-y-4">
                  {recentCustomers.map((customer) => (
                    <div key={customer.id} className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-sm font-medium text-primary">
                          {getInitials(customer.name)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium leading-none">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">{customer.email}</p>
                      </div>
                      <div className="text-sm text-muted-foreground">{customer.dateAdded}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Keine neuen Kunden.</p>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/customers" className="flex w-full items-center justify-center">
                  Alle Kunden anzeigen
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Bevorstehende Aufgaben</CardTitle>
              {loadingTasks ? <Skeleton className="h-4 w-1/2 mt-1" /> : <CardDescription>Sie haben {stats?.pendingTasksCount ?? 0} ausstehende Aufgaben.</CardDescription>}
            </CardHeader>
            <CardContent>
              {loadingTasks ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  ))}
                </div>
              ) : upcomingTasks.length > 0 ? (
                <div className="space-y-4">
                  {upcomingTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          task.priority === "High" || task.priority === "Hoch"
                            ? "bg-red-100 text-red-600"
                            : task.priority === "Medium" || task.priority === "Mittel"
                              ? "bg-amber-100 text-amber-600"
                              : "bg-green-100 text-green-600"
                        }`}
                      >
                        <Clock className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium leading-none">{task.title}</p>
                        <p className="text-sm text-muted-foreground">{task.customerName ?? `Kunde ID: ${task.customer_id}`}</p>
                      </div>
                      <div className="text-sm text-muted-foreground">{task.dueDate}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Keine bevorstehenden Aufgaben.</p>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/tasks" className="flex w-full items-center justify-center">
                  Alle Aufgaben anzeigen
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  );
}

