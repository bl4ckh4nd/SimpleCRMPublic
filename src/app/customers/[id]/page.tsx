"use client"
import { useParams, useNavigate, Link } from "@tanstack/react-router"; // Using TanStack Router for navigation
import { useState, useEffect } from "react"; // Added useState, useEffect
import { toast } from "sonner"; // Added toast
import {
  ArrowLeft,
  Edit,
  Trash2,
  Mail,
  Phone,
  Building,
  Calendar,
  Clock,
  Loader2,
  Copy, // Added Copy
  Link as LinkIcon, // Added LinkIcon for affiliate link
  User // Added User icon for customer number
} from "lucide-react"; // Corrected lucide-react import - removed duplicates
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added Select components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea"; // Added Textarea
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Added Table components
import type { Customer, Deal, Task } from "@/services/data/types" // Updated import
import { CustomFieldsForm } from "@/components/custom-fields-form";
// Import the specific route definition
import { customerDetailRoute } from "@/router"
import { getPrimaryPhone, getFormattedPhone } from "@/lib/contact-utils"

// Update interface to match route params - TanStack Router typically uses $paramName for file routes
// Removed RouteParams interface as it's not strictly needed when not using 'from' in useParams
// interface RouteParams {
//   id: string
// }

export default function CustomerDetailPage() {
  // Get params directly, without specifying a from path
  // The strict: false option allows accessing params in a more permissive way
  const params = useParams({ strict: false })
  // Access the parameter using the name defined in router.tsx: customerId
  const customerId = params.customerId as string // Cast as string since customerId is guaranteed to exist

  const navigate = useNavigate()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [isLoading, setIsLoading] = useState(true) // Add loading state
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [deals, setDeals] = useState<Deal[]>([]) // Add state for deals
  const [tasks, setTasks] = useState<Task[]>([]) // Add state for tasks
  const [isLoadingRelated, setIsLoadingRelated] = useState(false) // Loading state for related items
  // Initialize with empty or default values based on the Customer type
  const [editedCustomer, setEditedCustomer] = useState<Partial<Customer>>({
    customerNumber: "", // JTL customer number (read-only)
    name: "",
    firstName: "", // Added firstName
    email: "",
    phone: "",
    mobile: "", // Added mobile
    company: "",
    status: "Active", // Default status
    notes: "",
    street: "", // Added address fields
    zip: "",
    city: "",
    country: "",
    affiliateLink: "",
    customFields: {},
  })

  useEffect(() => {
    const fetchCustomer = async () => {
      // Check if customerId is valid before proceeding
      if (!customerId || customerId === 'undefined') {
        console.error("Customer ID is missing or invalid.");
        toast.error("Ungültige Kunden-ID.");
        navigate({ to: "/customers" });
        return;
      }

      setIsLoading(true);

      try {
        // Pass customerId string directly to the service
        const api = window.electronAPI as any; // Type assertion for direct invoke access
        const dbCustomer = await api.invoke('db:get-customer', customerId);
        console.log('Fetched customer data in component:', dbCustomer); // Log fetched data

        if (dbCustomer) {
          setCustomer(dbCustomer);
          // Pre-fill edit form with fetched data
          setEditedCustomer({
            customerNumber: dbCustomer.customerNumber || "",
            name: dbCustomer.name || "",
            firstName: dbCustomer.firstName || "",
            email: dbCustomer.email || "",
            phone: dbCustomer.phone || "",
            mobile: dbCustomer.mobile || "",
            company: dbCustomer.company || "",
            status: dbCustomer.status || "Active",
            notes: dbCustomer.notes || "",
            street: dbCustomer.street || "",
            zip: dbCustomer.zip || "", // Rely on dbCustomer.zip as per backend alias
            city: dbCustomer.city || "",
            country: dbCustomer.country || "",
            affiliateLink: dbCustomer.affiliateLink || "",
            customFields: dbCustomer.customFields || {},
          });
        } else {
          toast.error(`Kunde mit ID ${customerId} nicht gefunden.`);
          navigate({ to: "/customers" });
        }
      } catch (error) {
        console.error(`Failed to fetch customer with ID ${customerId}:`, error);
        toast.error("Fehler beim Laden des Kunden.");
        navigate({ to: "/customers" });
      }

      setIsLoading(false);
    };

    fetchCustomer();
  }, [customerId, navigate]);

  // Add a new useEffect to fetch deals and tasks
  useEffect(() => {
    const fetchRelatedItems = async () => {
      if (!customerId) return;

      setIsLoadingRelated(true);

      try {
        const api = window.electronAPI as any;

        // Fetch deals for this customer
        const customerDeals = await api.invoke('db:get-deals-for-customer', customerId);
        setDeals(customerDeals || []);

        // Fetch tasks for this customer
        const customerTasks = await api.invoke('db:get-tasks-for-customer', customerId);
        setTasks(customerTasks || []);
      } catch (error) {
        console.error('Failed to fetch related items:', error);
        toast.error("Fehler beim Laden von zugehörigen Deals und Aufgaben.");
      }

      setIsLoadingRelated(false);
    };

    fetchRelatedItems();
  }, [customerId]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2">Lade Kundendaten...</p>
      </div>
    )
  }

  if (!customer) {
    // Fallback if loading finished but customer is still null (e.g., error state handled in useEffect)
    return <div>Kunde nicht gefunden.</div>
  }

  const handleSaveChanges = async () => {
    if (!customer) return; // Should not happen if button is enabled

    try {
      // Construct the full updated customer object
      const updatedCustomer = {
        ...customer,
        ...editedCustomer,
        lastModifiedLocally: new Date().toISOString() // Update modification timestamp
      };

      // Use window.electronAPI directly
      const api = window.electronAPI as any;
      await api.invoke('db:update-customer', updatedCustomer);

      // Update local state
      setCustomer(updatedCustomer);
      setIsEditOpen(false);
      toast.success("Kunde erfolgreich aktualisiert.");
    } catch (error) {
      console.error("Failed to update customer:", error);
      toast.error("Fehler beim Speichern der Änderungen.");
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customer) return;

    try {
      // Use window.electronAPI directly
      const api = window.electronAPI as any;
      await api.invoke('db:delete-customer', customer.id);

      toast.success(`Kunde ${customer.name} gelöscht.`);
      navigate({ to: "/customers" });
    } catch (error) {
      console.error("Failed to delete customer:", error);
      toast.error("Fehler beim Löschen des Kunden.");
    }
  };

  // Helper to format date from DB if needed (assuming jtl_dateCreated is ISO string or similar)
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString("de-DE")
    } catch (e) {
      return dateString // Return original if parsing fails
    }
  }

  return (
    <div className="flex min-h-screen flex-col">

      <main className="flex-1">
        <div className="container mx-auto max-w-7xl py-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/customers" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                <span>Zurück zu Kundenliste</span>
              </Link>
              {/* Display full name if available */}
              <h1 className="text-3xl font-bold">{`${customer.firstName || ''} ${customer.name}`}</h1>
              <Badge
                variant={
                  customer.status === "Active" ? "default" : customer.status === "Lead" ? "secondary" : "outline"
                }
              >
                {customer.status}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    Bearbeiten
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[650px]"> {/* Increased width */}
                  <DialogHeader>
                    <DialogTitle>Kunde bearbeiten</DialogTitle>
                    <DialogDescription>Ändern Sie die Informationen des Kunden unten.</DialogDescription>
                  </DialogHeader>
                  <Tabs defaultValue="basic">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="basic">Grunddaten</TabsTrigger>
                      <TabsTrigger value="custom">Benutzerdefinierte Felder</TabsTrigger>
                    </TabsList>
                    <TabsContent value="basic">
                      <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
                        {editedCustomer.customerNumber && (
                          <div className="grid gap-2">
                            <Label htmlFor="customerNumber">Kundennummer (JTL)</Label>
                            <Input
                              id="customerNumber"
                              value={editedCustomer.customerNumber}
                              disabled
                              className="bg-gray-50 text-gray-500"
                            />
                          </div>
                        )}
                        <div className="grid gap-2">
                          <Label htmlFor="firstName">Vorname</Label>
                          <Input
                            id="firstName"
                            value={editedCustomer.firstName}
                            onChange={(e) => setEditedCustomer({ ...editedCustomer, firstName: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="name">Nachname</Label>
                          <Input
                            id="name"
                            value={editedCustomer.name}
                            onChange={(e) => setEditedCustomer({ ...editedCustomer, name: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="email">E-Mail</Label>
                          <Input
                            id="email"
                            type="email"
                            value={editedCustomer.email}
                            onChange={(e) => setEditedCustomer({ ...editedCustomer, email: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="phone">Telefon</Label>
                          <Input
                            id="phone"
                            value={editedCustomer.phone}
                            onChange={(e) => setEditedCustomer({ ...editedCustomer, phone: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="mobile">Mobil</Label>
                          <Input
                            id="mobile"
                            value={editedCustomer.mobile}
                            onChange={(e) => setEditedCustomer({ ...editedCustomer, mobile: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="company">Firma</Label>
                          <Input
                            id="company"
                            value={editedCustomer.company}
                            onChange={(e) => setEditedCustomer({ ...editedCustomer, company: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="street">Straße</Label>
                          <Input
                            id="street"
                            value={editedCustomer.street}
                            onChange={(e) => setEditedCustomer({ ...editedCustomer, street: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="zip">PLZ</Label>
                          <Input
                            id="zip"
                            value={editedCustomer.zip || ""} // Rely on editedCustomer.zip
                            onChange={(e) => setEditedCustomer({ ...editedCustomer, zip: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="city">Stadt</Label>
                          <Input
                            id="city"
                            value={editedCustomer.city}
                            onChange={(e) => setEditedCustomer({ ...editedCustomer, city: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="country">Land</Label>
                          <Input
                            id="country"
                            value={editedCustomer.country}
                            onChange={(e) => setEditedCustomer({ ...editedCustomer, country: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="status">Status</Label>
                          <Select
                            value={editedCustomer.status}
                            onValueChange={(value) => setEditedCustomer({ ...editedCustomer, status: value || 'Active' })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Status auswählen" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Active">Aktiv</SelectItem>
                              <SelectItem value="Lead">Lead</SelectItem>
                              <SelectItem value="Inactive">Inaktiv</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="affiliateLink">Affiliate Link</Label>
                          <Input
                            id="affiliateLink"
                            value={editedCustomer.affiliateLink}
                            onChange={(e) => setEditedCustomer({ ...editedCustomer, affiliateLink: e.target.value })}
                          />
                        </div>
                        {/* Notes spanning full width */}
                        <div className="grid gap-2 md:col-span-2">
                          <Label htmlFor="notes">Notizen</Label>
                          <Textarea
                            id="notes"
                            value={editedCustomer.notes}
                            onChange={(e) => setEditedCustomer({ ...editedCustomer, notes: e.target.value })}
                            placeholder="Fügen Sie Notizen zu diesem Kunden hinzu"
                            rows={4} // Increased rows
                          />
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="custom">
                      <CustomFieldsForm
                        customerId={customerId}
                        formData={editedCustomer}
                        onChange={(field, value) => {
                          // Handle nested fields (customFields.fieldName)
                          if (field.startsWith('customFields.')) {
                            const fieldName = field.split('.')[1];
                            setEditedCustomer(prev => ({
                              ...prev,
                              customFields: {
                                ...prev.customFields,
                                [fieldName]: value
                              }
                            }));
                          }
                        }}
                        className="py-4"
                      />
                    </TabsContent>
                  </Tabs>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                      Abbrechen
                    </Button>
                    <Button onClick={handleSaveChanges}>Änderungen speichern</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Löschen
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Kunde löschen</DialogTitle>
                    <DialogDescription>
                      Sind Sie sicher, dass Sie diesen Kunden löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline">Abbrechen</Button>
                    <Button variant="destructive" onClick={handleDeleteCustomer}>
                      Löschen
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Kundeninformationen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {customer.customerNumber && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Kundennr.: {customer.customerNumber}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.email || "-"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{getFormattedPhone(customer) || getPrimaryPhone(customer) || "-"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.company || "-"}</span>
                </div>
                 {/* Address Info */}
                <div className="flex items-start gap-2"> {/* Use items-start for multi-line */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span className="whitespace-pre-line">
                    {customer.street || ""}
                    {customer.street && (customer.zip || customer.city) ? <br /> : ""}
                    {customer.zip ? customer.zip : (customer.city || customer.country ? "PLZ: Nicht angegeben" : "")} {customer.city || ""}
                    {(customer.zip || customer.city) && customer.country ? <br /> : ""}
                    {customer.country || (customer.street || customer.zip || customer.city ? "" : "-")}
                  </span>
                </div>
                {/* Date fields */}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Hinzugefügt am {formatDate(customer.jtl_dateCreated || customer.dateAdded)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Letzte Änderung: {formatDate(customer.lastModifiedLocally)}</span>
                </div>
                {customer.jtl_kKunde && (
                  <div className="flex items-center gap-2">
                     <span className="font-semibold h-4 w-4 text-muted-foreground">JTL</span>
                     <span className="text-sm text-muted-foreground">ID: {customer.jtl_kKunde}</span>
                  </div>
                )}
              </CardContent>
            </Card>            <Tabs defaultValue="notes">
              <TabsList className="inline-flex h-auto w-full justify-start space-x-2 rounded-none border-b bg-transparent p-0">
                <TabsTrigger value="notes" className="relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none">Notizen</TabsTrigger>
                <TabsTrigger value="custom" className="relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none">Benutzerdefinierte Felder</TabsTrigger>
                <TabsTrigger value="deals" className="relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none">Deals</TabsTrigger>
                <TabsTrigger value="tasks" className="relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none">Aufgaben</TabsTrigger>
                <TabsTrigger value="affiliate" className="relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none">Affiliate</TabsTrigger>
              </TabsList>
              <TabsContent value="notes" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Notizen</CardTitle>
                    <CardDescription>Wichtige Informationen zu diesem Kunden</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {customer.notes ? (
                      <p>{customer.notes}</p>
                    ) : (
                      <p className="text-muted-foreground">Keine Notizen verfügbar. Fügen Sie Notizen hinzu, indem Sie den Kunden bearbeiten.</p>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" onClick={() => setIsEditOpen(true)}>
                      Notiz hinzufügen
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              <TabsContent value="custom" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Benutzerdefinierte Felder</CardTitle>
                    <CardDescription>Zusätzliche Informationen zu diesem Kunden</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {customer.customFields && Object.keys(customer.customFields).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(customer.customFields).map(([key, value]) => (
                          <div key={key} className="grid grid-cols-2 gap-2 border-b pb-2">
                            <div className="font-medium">{key}</div>
                            <div>{value !== null && value !== undefined ? String(value) : "-"}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Keine benutzerdefinierten Felder verfügbar. Fügen Sie benutzerdefinierte Felder hinzu, indem Sie den Kunden bearbeiten.</p>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" onClick={() => setIsEditOpen(true)}>
                      Benutzerdefinierte Felder bearbeiten
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              <TabsContent value="deals" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Deals</CardTitle>
                    <CardDescription>Deals im Zusammenhang mit diesem Kunden</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingRelated ? (
                      <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : deals.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Titel</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Wert</TableHead>
                            <TableHead>Abschlussdatum</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deals.map((deal) => (
                            <TableRow key={deal.id}>
                              <TableCell>
                                {/* Assuming deal detail page exists at /deals/[id] */}
                                <Link to="/deals/$id" params={{ id: deal.id.toString() }} className="hover:underline font-medium">
                                  {deal.name}
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Badge variant={deal.stage === 'Won' ? 'default' : deal.stage === 'Lost' ? 'destructive' : 'secondary'}>
                                  {deal.stage}
                                </Badge>
                              </TableCell>
                              <TableCell>{deal.value ? `${deal.value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}` : '-'}</TableCell>
                              <TableCell>{deal.expected_close_date ? formatDate(deal.expected_close_date) : '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-muted-foreground">Keine Deals für diesen Kunden verfügbar.</p>
                    )}
                  </CardContent>
                  <CardFooter className="gap-2">
                    <Button variant="outline" asChild>
                      {/* Link to deals list, potentially filtered by customer */}
                      <Link to="/deals" search={{ customerId: customer.id }}>Alle Deals anzeigen</Link>
                    </Button>
                    <Button asChild>
                      {/* Link to new deal page, passing customerId */}
                      <Link to="/deals/new" search={{ customerId: customer.id }}>Neuen Deal hinzufügen</Link>
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              <TabsContent value="tasks" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Aufgaben</CardTitle>
                    <CardDescription>Aufgaben im Zusammenhang mit diesem Kunden</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingRelated ? (
                      <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : tasks.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Titel</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Fällig am</TableHead>
                            <TableHead>Zugewiesen an</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tasks.map((task) => (
                            <TableRow key={task.id}>
                              <TableCell>
                                {/* Assuming task detail page exists at /tasks/[id] */}
                                <Link to="/tasks/$id" params={{ id: task.id.toString() }} className="hover:underline font-medium">
                                  {task.title}
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Badge variant={task.completed ? 'default' : 'secondary'}>
                                  {task.completed ? 'Completed' : 'Pending'}
                                </Badge>
                              </TableCell>
                              <TableCell>{task.due_date ? formatDate(task.due_date) : '-'}</TableCell>
                              <TableCell>{'-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-muted-foreground">Keine Aufgaben für diesen Kunden verfügbar.</p>
                    )}
                  </CardContent>
                  <CardFooter className="gap-2">
                    <Button variant="outline" asChild>
                      {/* Link to tasks list, potentially filtered by customer */}
                      <Link to="/tasks" search={{ customerId: customer.id }}>Alle Aufgaben anzeigen</Link>
                    </Button>
                    <Button asChild>
                      {/* Link to new task page, passing customerId */}
                      <Link to="/tasks/new" search={{ customerId: customer.id }}>Neue Aufgabe hinzufügen</Link>
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              <TabsContent value="affiliate" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Affiliate-Programm</CardTitle>
                    <CardDescription>Affiliate-Link und geworbene Kunden</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Ihr Affiliate-Link</Label>
                      <div className="flex items-center gap-2">
                        <Input value={customer.affiliateLink || "N/A"} readOnly />
                        <Button
                          variant="outline"
                          size="icon" // Make button smaller
                          disabled={!customer.affiliateLink}
                          onClick={() => {
                            navigator.clipboard.writeText(customer.affiliateLink || "")
                            toast.success("Affiliate-Link in die Zwischenablage kopiert")
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
}