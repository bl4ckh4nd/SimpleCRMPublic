"use client"

import React, { useState, useEffect, Fragment } from "react"
import { CalendarDays, ChevronDown, Pencil, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react"
import { Link, useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { ToastAction } from "@/components/ui/toast"
import ExportButton from "@/components/export-button"
import { CustomerCombobox, type CustomerOption } from "@/components/customer-combobox"
import { taskService } from "@/services/data/taskService"
import { calendarService, TASK_EVENT_DEFAULT_COLOR, TASK_EVENT_COMPLETED_COLOR } from "@/services/data/calendarService"
import { useToast } from "@/components/ui/use-toast"
import { Task } from "@/services/data/types"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"

// Match the database structure
interface TaskData {
  id?: number;
  customer_id: number;
  title: string;
  description: string;
  due_date: string;
  priority: string;
  completed: boolean;
  calendar_event_id: number | null;
}

// Front-end display object with customer name
interface TaskDisplay extends TaskData {
  id: number;
  customer_name: string;
}

const createEmptyTask = (): Omit<TaskData, 'id'> => ({
  customer_id: 0,
  title: "",
  description: "",
  due_date: "",
  priority: "Medium",
  completed: false,
  calendar_event_id: null,
});

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalTasks, setTotalTasks] = useState(0)
  const [limit] = useState(10)

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'High' | 'Medium' | 'Low'>('all')
  
  const { toast } = useToast()

  const [newTask, setNewTask] = useState<Omit<TaskData, 'id'>>(createEmptyTask())
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [addToCalendar, setAddToCalendar] = useState(false)
  const [calendarToggleTouched, setCalendarToggleTouched] = useState(false)
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null)
  const [taskMarkedForDelete, setTaskMarkedForDelete] = useState<TaskDisplay | null>(null)

  const navigate = useNavigate()

  const handleDueDateChange = (value: string) => {
    setNewTask((prev) => ({ ...prev, due_date: value }))
    if (!value) {
      setAddToCalendar(false)
      setCalendarToggleTouched(false)
    } else if (!calendarToggleTouched) {
      setAddToCalendar(true)
    }
  }

  const handleCustomerValueChange = (value: string) => {
    setNewTask((prev) => ({ ...prev, customer_id: Number(value) }))
  }

  const handleCustomerSelect = (customer: CustomerOption | null) => {
    setSelectedCustomerName(customer?.name ?? null)
  }

  const formatDueDateForDisplay = (value: string) => {
    if (!value) return "Kein Fälligkeitsdatum"

    const [year, month, day] = value.split("-").map(Number)
    let date: Date

    if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
      date = new Date(year, month - 1, day)
    } else {
      date = new Date(value)
    }

    if (Number.isNaN(date.getTime())) return "Kein Fälligkeitsdatum"

    return date.toLocaleDateString()
  }

  // Load tasks from database
  useEffect(() => {
    loadTasks()
  }, [currentPage, statusFilter, priorityFilter, searchQuery])


  const loadTasks = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Calculate offset based on current page
      const offset = (currentPage - 1) * limit
      
      // Build filter object
      const filter: { completed?: boolean; priority?: string; query?: string } = {}
      
      if (statusFilter === 'completed') filter.completed = true
      if (statusFilter === 'pending') filter.completed = false
      if (priorityFilter !== 'all') filter.priority = priorityFilter
      if (searchQuery.trim()) filter.query = searchQuery
      
      const result = await taskService.getAllTasks(limit, offset, filter)
      
      // Map backend data to frontend display format
      const displayTasks = result.map(task => {
        const calendarEventId =
          task.calendar_event_id === null || task.calendar_event_id === undefined
            ? null
            : Number(task.calendar_event_id)

        const normalizedCalendarEventId =
          calendarEventId !== null && !Number.isNaN(calendarEventId) ? calendarEventId : null

        return {
          id: Number(task.id),
          customer_id: Number(task.customer_id),
          title: task.title,
          description: task.description || '',
          due_date: task.due_date || '',
          priority: task.priority,
          completed: Boolean(task.completed),
          calendar_event_id: normalizedCalendarEventId,
          customer_name: task.customer_name || 'Unknown Customer'
        }
      })
      
      setTasks(displayTasks)
      // TODO: In a real app, we would need a count endpoint to get the total
      // For now, we'll just assume there are more if we got a full page
      setTotalTasks(currentPage * limit + (displayTasks.length === limit ? limit : 0))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
      toast({
        title: "Error",
        description: "Failed to load tasks. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddTask = async () => {
    if (isSubmitting) return

    const trimmedTitle = newTask.title.trim()
    const trimmedDescription = newTask.description?.trim() ?? ""

    if (!trimmedTitle) {
      toast({
        title: "Validierungsfehler",
        description: "Bitte geben Sie einen Aufgabentitel ein.",
        variant: "destructive"
      })
      return
    }

    if (!newTask.customer_id) {
      toast({
        title: "Validierungsfehler",
        description: "Bitte wählen Sie einen Kunden aus.",
        variant: "destructive"
      })
      return
    }

    if (addToCalendar && !newTask.due_date) {
      toast({
        title: "Validierungsfehler",
        description: "Um die Aufgabe in den Kalender zu übernehmen, muss ein Fälligkeitsdatum festgelegt werden.",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    const payload = {
      ...newTask,
      title: trimmedTitle,
      description: trimmedDescription,
      calendar_event_id: null,
    }

    try {
      const result = await taskService.createTask(payload)

      if (result.success) {
        const dueDateSnapshot = newTask.due_date
        const customerNameSnapshot = selectedCustomerName
        const taskId = typeof result.id === 'number' ? result.id : null
        let calendarEventCreated = false
        let calendarError: Error | null = null

        if (addToCalendar && dueDateSnapshot) {
          try {
            const calendarResult = await calendarService.addTaskEvent({
              title: trimmedTitle,
              description: trimmedDescription || undefined,
              dueDate: dueDateSnapshot,
              customerName: customerNameSnapshot || undefined,
            })
            if (typeof calendarResult.id !== 'number') {
              throw new Error("Kalenderereignis wurde erstellt, aber es wurde keine Ereignis-ID zurückgegeben.")
            }

            if (taskId !== null) {
              const updateResponse = await taskService.updateTask(taskId, { calendar_event_id: calendarResult.id })
              if (!updateResponse.success) {
                throw new Error(updateResponse.error || "Kalender-ID konnte nicht der Aufgabe zugeordnet werden.")
              }
            }

            calendarEventCreated = true
          } catch (error) {
            calendarError = error instanceof Error ? error : new Error("Kalendereintrag fehlgeschlagen")
            console.error("Kalendereintrag konnte nicht erstellt werden:", error)
          }
        }

        const actionButton = dueDateSnapshot
          ? (
            <ToastAction
              altText="Kalender öffnen"
              onClick={() => navigate({ to: "/calendar", search: { date: dueDateSnapshot } })}
            >
              Kalender öffnen
            </ToastAction>
          )
          : undefined

        if (calendarError) {
          toast({
            title: "Aufgabe gespeichert",
            description: "Die Aufgabe wurde gespeichert, der Kalendereintrag konnte jedoch nicht erstellt werden.",
            variant: "destructive",
            action: actionButton,
          })
        } else {
          toast({
            title: calendarEventCreated ? "Aufgabe geplant" : "Aufgabe gespeichert",
            description: calendarEventCreated
              ? "Die Aufgabe wurde gespeichert und dem Kalender hinzugefügt."
              : "Die Aufgabe wurde gespeichert.",
            action: calendarEventCreated ? actionButton : undefined,
          })
        }

        setIsAddTaskOpen(false)
        setNewTask(createEmptyTask())
        setAddToCalendar(false)
        setCalendarToggleTouched(false)
        setSelectedCustomerName(null)
        loadTasks()
      } else {
        toast({
          title: "Fehler",
          description: result.error || "Aufgabe konnte nicht erstellt werden.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Aufgabe konnte nicht erstellt werden:", error)
      toast({
        title: "Fehler",
        description: "Es ist ein unerwarteter Fehler aufgetreten.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleTaskCompletion = async (id: number) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return

    const nextCompleted = !task.completed

    try {
      const result = await taskService.toggleTaskCompletion(id, nextCompleted)

      if (!result.success) {
        toast({
          title: "Fehler",
          description: result.error || "Aufgabe konnte nicht aktualisiert werden.",
          variant: "destructive"
        })
        return
      }

      setTasks(prev => prev.map(t =>
        t.id === id ? { ...t, completed: nextCompleted } : t
      ))

      if (task.calendar_event_id) {
        try {
          await calendarService.updateTaskEvent(task.calendar_event_id, {
            completed: nextCompleted,
          })
        } catch (calendarError) {
          console.error("Kalenderereignis konnte nicht aktualisiert werden:", calendarError)
          const message = calendarError instanceof Error ? calendarError.message : String(calendarError)
          toast({
            title: "Kalender nicht erreichbar",
            description: "Der Kalendereintrag konnte nicht aktualisiert werden.",
            variant: "destructive",
          })

          const shouldUnlink = /nicht gefunden|not found|no such/i.test(message)
          if (shouldUnlink) {
            try {
              await taskService.updateTask(id, { calendar_event_id: null })
              setTasks(prev => prev.map(t =>
                t.id === id ? { ...t, calendar_event_id: null } : t
              ))
            } catch (unlinkError) {
              console.error("Kalender-Verknüpfung konnte nicht entfernt werden:", unlinkError)
            }
          }
        }
      }
    } catch (error) {
      console.error("Aufgabe konnte nicht aktualisiert werden:", error)
      toast({
        title: "Fehler",
        description: "Beim Aktualisieren der Aufgabe ist ein unerwarteter Fehler aufgetreten.",
        variant: "destructive"
      })
    }
  }

  // Handle filter changes
  const handleStatusFilterChange = (status: 'all' | 'completed' | 'pending') => {
    setStatusFilter(status)
    setCurrentPage(1) // Reset to first page when filter changes
  }

  const handlePriorityFilterChange = (priority: 'all' | 'High' | 'Medium' | 'Low') => {
    setPriorityFilter(priority)
    setCurrentPage(1) // Reset to first page when filter changes
  }

  // Calculate total pages for pagination
  const totalPages = Math.max(1, Math.ceil(totalTasks / limit))

  return (
    <main className="flex-1">
      <div className="container mx-auto max-w-7xl py-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Aufgaben</h1>
            <p className="text-muted-foreground">Verwalten Sie Ihre Aufgaben und Aktivitäten</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Aufgaben suchen..."
                className="pl-8 md:w-[300px]"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1) // Reset to first page when search changes
                }}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Filter
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleStatusFilterChange('all')}>
                  Alle Aufgaben {statusFilter === 'all' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilterChange('completed')}>
                  Abgeschlossene Aufgaben {statusFilter === 'completed' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilterChange('pending')}>
                  Ausstehende Aufgaben {statusFilter === 'pending' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePriorityFilterChange('High')}>
                  Hohe Priorität {priorityFilter === 'High' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePriorityFilterChange('Medium')}>
                  Mittlere Priorität {priorityFilter === 'Medium' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePriorityFilterChange('Low')}>
                  Niedrige Priorität {priorityFilter === 'Low' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePriorityFilterChange('all')}>
                  Alle Prioritäten {priorityFilter === 'all' && '✓'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ExportButton data={tasks} fileName="tasks.json">
              Exportieren
            </ExportButton>
            <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Aufgabe hinzufügen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Neue Aufgabe hinzufügen</DialogTitle>
                  <DialogDescription>Geben Sie unten die Details der Aufgabe ein, um sie hinzuzufügen.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Aufgabentitel</Label>
                    <Input
                      id="title"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="Nachverfolgungsanruf"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Beschreibung</Label>
                    <Textarea
                      id="description"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      placeholder="Neue Produktfunktionen besprechen"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="customer_id">Kunde</Label>
                    <CustomerCombobox
                      value={newTask.customer_id || undefined}
                      onValueChange={handleCustomerValueChange}
                      onCustomerSelect={handleCustomerSelect}
                      placeholder="Kunde auswählen..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="due_date">Fälligkeitsdatum</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => handleDueDateChange(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Aufgaben mit Fälligkeitsdatum erscheinen als ganztägiger Eintrag im Kalender.
                    </p>
                  </div>
                  <div className="flex items-start justify-between gap-4 rounded-md border border-input bg-muted/20 px-3 py-2">
                    <div>
                      <Label htmlFor="add-to-calendar" className="font-medium leading-none">In Kalender eintragen</Label>
                      <p className="text-xs text-muted-foreground">
                        Aktivieren Sie diese Option, um die Aufgabe automatisch im Kalender zu planen.
                      </p>
                    </div>
                    <Switch
                      id="add-to-calendar"
                      checked={addToCalendar}
                      onCheckedChange={(checked) => {
                        setAddToCalendar(checked)
                        setCalendarToggleTouched(true)
                      }}
                      disabled={!newTask.due_date}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="priority">Priorität</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Priorität auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Niedrig</SelectItem>
                        <SelectItem value="Medium">Mittel</SelectItem>
                        <SelectItem value="High">Hoch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddTaskOpen(false)} disabled={isSubmitting}>
                    Abbrechen
                  </Button>
                  <Button onClick={handleAddTask} disabled={isSubmitting}>
                    {isSubmitting ? "Speichere..." : "Aufgabe hinzufügen"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Aufgabenliste</CardTitle>
            <CardDescription>
              {loading 
                ? "Laden..." 
                : `${tasks.length} Aufgabe${tasks.length !== 1 ? 'n' : ''} gefunden.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="text-destructive">{error}</p>
            ) : loading ? (
              <div className="flex justify-center py-6">
                <p>Aufgaben werden geladen...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex justify-center py-6">
                <p>Keine Aufgaben gefunden.</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Aufgabe</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead className="hidden md:table-cell">Fälligkeitsdatum</TableHead>
                      <TableHead>Priorität</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              checked={task.completed} 
                              onCheckedChange={() => toggleTaskCompletion(task.id)} 
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={task.completed ? 'line-through text-muted-foreground' : ''}>
                            {task.title}
                          </span>
                          {task.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {task.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Link 
                            to="/customers/$customerId" 
                            params={{ customerId: task.customer_id.toString() }} 
                            className="hover:underline"
                          >
                            {task.customer_name}
                          </Link>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <span>{formatDueDateForDisplay(task.due_date)}</span>
                            {task.calendar_event_id && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                title="Im Kalender anzeigen"
                                aria-label="Im Kalender anzeigen"
                                disabled={!task.due_date}
                                onClick={() => {
                                  const search = task.due_date
                                    ? { date: task.due_date }
                                    : {};
                                  navigate({ to: "/calendar", search });
                                }}
                              >
                                <CalendarDays
                                  className="h-4 w-4"
                                  style={{ color: task.completed ? TASK_EVENT_COMPLETED_COLOR : TASK_EVENT_DEFAULT_COLOR }}
                                />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              task.priority === "High"
                                ? "destructive"
                                : task.priority === "Medium"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {task.priority === "High" ? "Hoch" : task.priority === "Medium" ? "Mittel" : "Niedrig"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        
                        {/* Generate page numbers */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => 
                            // Show first page, last page, and pages around current page
                            page === 1 || 
                            page === totalPages || 
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          )
                          .map((page, i, array) => (
                            <Fragment key={page}>
                              {i > 0 && array[i - 1] !== page - 1 && (
                                <PaginationItem>
                                  <span className="px-2">...</span>
                                </PaginationItem>
                              )}
                              <PaginationItem>
                                <PaginationLink
                                  onClick={() => setCurrentPage(page)}
                                  isActive={page === currentPage}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            </Fragment>
                          ))
                        }
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
