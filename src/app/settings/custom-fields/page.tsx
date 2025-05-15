"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { customFieldService } from "@/services/data/customFieldService"
import { CustomField } from "@/services/data/types"

// Schema for custom field form validation
const formSchema = z.object({
  name: z.string()
    .min(1, { message: "Name ist erforderlich" })
    .regex(/^[a-zA-Z0-9_]+$/, { message: "Name darf nur Buchstaben, Zahlen und Unterstriche enthalten" }),
  label: z.string().min(1, { message: "Bezeichnung ist erforderlich" }),
  type: z.enum(["text", "number", "date", "boolean", "select"], { 
    required_error: "Feldtyp ist erforderlich" 
  }),
  required: z.boolean().default(false),
  options: z.string().optional(),
  default_value: z.string().optional(),
  placeholder: z.string().optional(),
  description: z.string().optional(),
  display_order: z.coerce.number().int().default(0),
  active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

export default function CustomFieldsPage() {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      label: "",
      type: "text",
      required: false,
      options: "",
      default_value: "",
      placeholder: "",
      description: "",
      display_order: 0,
      active: true,
    },
  });

  // Load custom fields
  useEffect(() => {
    const loadCustomFields = async () => {
      setIsLoading(true);
      try {
        const fields = await customFieldService.getAllCustomFields();
        setCustomFields(fields);
      } catch (error) {
        console.error("Failed to load custom fields:", error);
        toast.error("Failed to load custom fields");
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomFields();
  }, []);

  // Reset form when dialog opens/closes or editing field changes
  useEffect(() => {
    if (isDialogOpen) {
      if (editingField) {
        // Parse options if it's a JSON string
        let options = editingField.options || "";
        
        form.reset({
          name: editingField.name,
          label: editingField.label,
          type: editingField.type as any,
          required: Boolean(editingField.required),
          options,
          default_value: editingField.default_value || "",
          placeholder: editingField.placeholder || "",
          description: editingField.description || "",
          display_order: editingField.display_order,
          active: Boolean(editingField.active),
        });
      } else {
        form.reset({
          name: "",
          label: "",
          type: "text",
          required: false,
          options: "",
          default_value: "",
          placeholder: "",
          description: "",
          display_order: 0,
          active: true,
        });
      }
    }
  }, [isDialogOpen, editingField, form]);

  const handleCreateField = () => {
    setEditingField(null);
    setIsDialogOpen(true);
  };

  const handleEditField = (field: CustomField) => {
    setEditingField(field);
    setIsDialogOpen(true);
  };

  // Handle delete field
  const handleDeleteField = async (field: CustomField) => {
    if (window.confirm(`Sind Sie sicher, dass Sie das Feld "${field.label}" löschen möchten?`)) {
      try {
        const success = await customFieldService.deleteCustomField(field.id);
        if (success) {
          setCustomFields(customFields.filter(f => f.id !== field.id));
          toast.success("Benutzerdefiniertes Feld erfolgreich gelöscht");
        } else {
          toast.error("Benutzerdefiniertes Feld konnte nicht gelöscht werden");
        }
      } catch (error) {
        console.error("Fehler beim Löschen des benutzerdefinierten Feldes:", error);
        toast.error("Beim Löschen des benutzerdefinierten Feldes ist ein Fehler aufgetreten");
      }
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      if (editingField) {
        // Update existing field
        const updatedField = await customFieldService.updateCustomField(editingField.id, data);
        if (updatedField) {
          setCustomFields(customFields.map(field => 
            field.id === editingField.id ? updatedField : field
          ));
          toast.success("Benutzerdefiniertes Feld erfolgreich aktualisiert");
          setIsDialogOpen(false);
        } else {
          toast.error("Benutzerdefiniertes Feld konnte nicht aktualisiert werden");
        }
      } else {
        // Create new field
        const newField = await customFieldService.createCustomField(data);
        if (newField) {
          setCustomFields([...customFields, newField]);
          toast.success("Benutzerdefiniertes Feld erfolgreich erstellt");
          setIsDialogOpen(false);
        } else {
          toast.error("Benutzerdefiniertes Feld konnte nicht erstellt werden");
        }
      }
    } catch (error) {
      console.error("Fehler beim Speichern des benutzerdefinierten Feldes:", error);
      toast.error("Beim Speichern des benutzerdefinierten Feldes ist ein Fehler aufgetreten");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Watch the type field to conditionally show options field
  const fieldType = form.watch("type");

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Benutzerdefinierte Felder</h1>
        <Button onClick={handleCreateField}>
          <Plus className="mr-2 h-4 w-4" /> Benutzerdefiniertes Feld hinzufügen
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Benutzerdefinierte Kundenfelder</CardTitle>
          <CardDescription>
            Definieren Sie benutzerdefinierte Felder, die beim Erstellen oder Bearbeiten von Kunden verfügbar sein werden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Lade benutzerdefinierte Felder...</span>
            </div>
          ) : customFields.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">Noch keine benutzerdefinierten Felder definiert.</p>
              <Button onClick={handleCreateField} className="mt-4">
                <Plus className="mr-2 h-4 w-4" /> Fügen Sie Ihr erstes benutzerdefiniertes Feld hinzu
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Bezeichnung</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Erforderlich</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reihenfolge</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customFields.map((field) => (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium">{field.name}</TableCell>
                      <TableCell>{field.label}</TableCell>
                      <TableCell>{field.type}</TableCell>
                      <TableCell>{field.required ? "Ja" : "Nein"}</TableCell>
                      <TableCell>
                        <Badge variant={field.active ? "default" : "secondary"}>
                          {field.active ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </TableCell>
                      <TableCell>{field.display_order}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditField(field)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteField(field)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingField ? "Benutzerdefiniertes Feld bearbeiten" : "Benutzerdefiniertes Feld erstellen"}
            </DialogTitle>
            <DialogDescription>
              {editingField
                ? "Aktualisieren Sie die Details dieses benutzerdefinierten Feldes."
                : "Fügen Sie ein neues benutzerdefiniertes Feld für Kunden hinzu."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="z.B. kundentyp" {...field} />
                      </FormControl>
                      <FormDescription>
                        Interner Name (keine Leerzeichen, Unterstriche verwenden)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bezeichnung</FormLabel>
                      <FormControl>
                        <Input placeholder="z.B. Kundentyp" {...field} />
                      </FormControl>
                      <FormDescription>
                        Anzeigename für Benutzer
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Feldtyp</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Feldtyp auswählen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Zahl</SelectItem>
                          <SelectItem value="date">Datum</SelectItem>
                          <SelectItem value="boolean">Ja/Nein</SelectItem>
                          <SelectItem value="select">Dropdown</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Die Art der Daten, die dieses Feld speichern wird
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="display_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Anzeigereihenfolge</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>
                        Reihenfolge, in der Felder angezeigt werden (niedrigere Zahlen zuerst)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {fieldType === "select" && (
                <FormField
                  control={form.control}
                  name="options"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Optionen</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='[{"value": "option1", "label": "Option 1"}, {"value": "option2", "label": "Option 2"}]'
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        JSON-Array von Optionen für Dropdown (siehe Platzhalter für Format)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="default_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Standardwert</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        Standardwert für dieses Feld (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="placeholder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Platzhalter</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        Platzhaltertext, der in der Eingabe angezeigt wird (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschreibung</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormDescription>
                      Hilfetext zur Erklärung dieses Feldes für Benutzer (optional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-4">
                <FormField
                  control={form.control}
                  name="required"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Pflichtfeld</FormLabel>
                        <FormDescription>
                          Dieses Feld beim Erstellen oder Bearbeiten von Kunden obligatorisch machen
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Aktiv</FormLabel>
                        <FormDescription>
                          Dieses Feld in Formularen und Ansichten anzeigen
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingField ? "Feld aktualisieren" : "Feld erstellen"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
