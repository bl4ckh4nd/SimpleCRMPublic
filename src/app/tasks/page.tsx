"use client"

import React, { useState, useEffect, Fragment } from "react"
import { ChevronDown, Plus, Search, SlidersHorizontal } from "lucide-react"
import { Link } from "@tanstack/react-router"

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
import ExportButton from "@/components/export-button"
import { taskService } from "@/services/data/taskService"
import { customerService } from "@/services/data/customerService"
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
}

// Front-end display object with customer name
interface TaskDisplay extends TaskData {
  id: number;
  customer_name: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalTasks, setTotalTasks] = useState(0)
  const [limit] = useState(10)

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'High' | 'Medium' | 'Low'>('all')
  
  const { toast } = useToast()

  const [newTask, setNewTask] = useState<Omit<TaskData, 'id'>>({
    customer_id: 0,
    title: "",
    description: "",
    due_date: "",
    priority: "Medium",
    completed: false
  })

  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)

  // Load tasks from database
  useEffect(() => {
    loadTasks()
  }, [currentPage, statusFilter, priorityFilter, searchQuery])

  // Load customers for the dropdown
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoadingCustomers(true)
      try {
        const result = await customerService.getAllCustomers()
        setCustomers(result.map(c => ({ 
          id: c.id.toString(), 
          name: c.name || c.firstName || 'Unknown' 
        })))
      } catch (error) {
        console.error('Failed to load customers:', error)
      } finally {
        setLoadingCustomers(false)
      }
    }

    fetchCustomers()
  }, [])

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
      const displayTasks = result.map(task => ({
        id: Number(task.id),
        customer_id: Number(task.customer_id),
        title: task.title,
        description: task.description || '',
        due_date: task.due_date,
        priority: task.priority,
        completed: Boolean(task.completed),
        customer_name: task.customer_name || 'Unknown Customer'
      }))
      
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
    if (!newTask.title || !newTask.customer_id || !newTask.due_date) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    try {
      const result = await taskService.createTask(newTask)
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Task created successfully",
        })
        setIsAddTaskOpen(false)
        // Reset form
        setNewTask({
          customer_id: 0,
          title: "",
          description: "",
          due_date: "",
          priority: "Medium",
          completed: false
        })
        // Refresh task list
        loadTasks()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create task",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    }
  }

  const toggleTaskCompletion = async (id: number) => {
    try {
      const task = tasks.find(t => t.id === id)
      if (!task) return
      
      const result = await taskService.toggleTaskCompletion(id, !task.completed)
      
      if (result.success) {
        // Update the local state to reflect the change
        setTasks(tasks.map(task => 
          task.id === id ? { ...task, completed: !task.completed } : task
        ))
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update task",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
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
                    <Select
                      value={newTask.customer_id ? newTask.customer_id.toString() : ''}
                      onValueChange={(value) => setNewTask({ ...newTask, customer_id: Number(value) })}
                      disabled={loadingCustomers}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingCustomers ? "Kunden werden geladen..." : "Kunden auswählen"} />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="due_date">Fälligkeitsdatum</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
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
                  <Button variant="outline" onClick={() => setIsAddTaskOpen(false)}>
                    Abbrechen
                  </Button>
                  <Button onClick={handleAddTask}>Aufgabe hinzufügen</Button>
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
                          {new Date(task.due_date).toLocaleDateString()}
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


