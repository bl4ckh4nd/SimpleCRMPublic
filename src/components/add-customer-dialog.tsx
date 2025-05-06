import { useState } from "react";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { localDataService } from "@/services/data/localDataService";
import type { Customer } from "@/services/data/types";
import { Plus } from "lucide-react";

interface AddCustomerDialogProps {
  onCustomerAdded?: (customer: Customer) => void;
}

export function AddCustomerDialog({ onCustomerAdded }: AddCustomerDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Omit<Customer, 'id' | 'jtl_kKunde'>>({
    name: '',
    firstName: '',
    company: '',
    email: '',
    phone: '',
    mobile: '',
    street: '',
    zipCode: '',
    city: '',
    country: '',
    status: 'Active',
    notes: '',
    affiliateLink: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      firstName: '',
      company: '',
      email: '',
      phone: '',
      mobile: '',
      street: '',
      zipCode: '',
      city: '',
      country: '',
      status: 'Active',
      notes: '',
      affiliateLink: '',
    });
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.name) {
      toast.error("Name ist ein Pflichtfeld.");
      return;
    }

    setIsLoading(true);
    try {
      // Create a new customer, setting jtl_kKunde to 0 since it's a manual entry
      const newCustomer = await localDataService.createCustomer({
        ...formData,
        jtl_kKunde: 0 // This will be ignored by the database as it's a foreign synced ID
      });
      
      toast.success("Kunde erfolgreich erstellt.");
      setIsOpen(false);
      resetForm();
      
      // Notify parent component if callback is provided
      if (onCustomerAdded) {
        onCustomerAdded(newCustomer);
      }
    } catch (error) {
      console.error("Failed to create customer:", error);
      toast.error("Fehler beim Erstellen des Kunden.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="whitespace-nowrap">
          <Plus className="mr-2 h-4 w-4" /> Kunde hinzufügen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Neuen Kunden hinzufügen</DialogTitle>
          <DialogDescription>
            Geben Sie die Details für den neuen Kunden ein.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="firstName">Vorname</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Nachname*</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mobile">Mobil</Label>
            <Input
              id="mobile"
              value={formData.mobile}
              onChange={(e) => handleChange('mobile', e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="company">Firma</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => handleChange('company', e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="street">Straße</Label>
            <Input
              id="street"
              value={formData.street}
              onChange={(e) => handleChange('street', e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="zipCode">PLZ</Label>
            <Input
              id="zipCode"
              value={formData.zipCode}
              onChange={(e) => handleChange('zipCode', e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="city">Stadt</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="country">Land</Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => handleChange('country', e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleChange('status', value)}
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
              value={formData.affiliateLink}
              onChange={(e) => handleChange('affiliateLink', e.target.value)}
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="notes">Notizen</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Fügen Sie Notizen zu diesem Kunden hinzu"
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            setIsOpen(false);
            resetForm();
          }}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Erstelle...' : 'Kunde erstellen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 