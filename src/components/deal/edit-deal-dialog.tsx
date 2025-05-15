import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Combobox } from "@/components/ui/combobox";
import { Trash2, PlusCircle } from "lucide-react";
import { Deal, DealStage } from "@/types/deal";
import { Product } from "@/types";

interface DealProductLink extends Product {
  deal_product_id: number;
  quantity: number;
  price_at_time_of_adding: number;
}

interface FetchedDealProduct extends Product {
  deal_product_id: number;
  deal_id: number;
  product_id: number;
  quantity: number;
  price_at_time_of_adding: number;
  dateAdded: string;
}

interface EditDealDialogProps {
  deal: Deal;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedDeal: Deal) => Promise<boolean>;
}

const formatCurrency = (amount: number): string => {
  if (isNaN(amount)) return '-';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
};

export function EditDealDialog({ deal, isOpen, onClose, onSave }: EditDealDialogProps) {
  const [editedDeal, setEditedDeal] = useState<Deal>({ ...deal });
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [dealProducts, setDealProducts] = useState<DealProductLink[]>([]);
  const [initialDealProducts, setInitialDealProducts] = useState<DealProductLink[]>([]);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [priceAtTime, setPriceAtTime] = useState<number>(0);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllProducts = useCallback(async () => {
    try {
      const products = await window.electronAPI.invoke<Product[]>('products:get-all');
      setAllProducts(products.filter((p: Product) => p.isActive));
    } catch (err) {
      console.error("Error fetching all products:", err);
      setError("Fehler beim Laden der Produktliste.");
    }
  }, []);

  const fetchDealProducts = useCallback(async (dealId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const fetched = await window.electronAPI.invoke<FetchedDealProduct[]>('deals:get-products', dealId);
      const linkedProducts: DealProductLink[] = fetched.map((p: FetchedDealProduct) => ({
          ...p,
      }));
      setDealProducts(linkedProducts);
      setInitialDealProducts(linkedProducts);
    } catch (err) {
      console.error(`Error fetching products for deal ${dealId}:`, err);
      setError("Fehler beim Laden der zugeordneten Produkte.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && deal) {
      setEditedDeal({ ...deal });
      setDealProducts([]);
      setInitialDealProducts([]);
      setError(null);
      setIsSaving(false);
      fetchAllProducts();
      fetchDealProducts(deal.id);
      setSelectedProductId(null);
      setQuantity(1);
      setPriceAtTime(0);
    } else {
      setDealProducts([]);
      setInitialDealProducts([]);
      setAllProducts([]);
    }
  }, [deal, isOpen, fetchAllProducts, fetchDealProducts]);

  useEffect(() => {
    const selectedProduct = allProducts.find(p => p.id === Number(selectedProductId));
    if (selectedProduct) {
      setPriceAtTime(selectedProduct.price);
    }
  }, [selectedProductId, allProducts]);

  const handleAddProduct = () => {
    if (!selectedProductId) {
        alert("Bitte wählen Sie ein Produkt aus.");
        return;
    }
    const productToAdd = allProducts.find(p => p.id === Number(selectedProductId));
    if (!productToAdd) return;

    const existingIndex = dealProducts.findIndex(p => p.id === productToAdd.id);

    if (existingIndex !== -1) {
        const updatedProducts = [...dealProducts];
        updatedProducts[existingIndex].quantity += quantity;
        setDealProducts(updatedProducts);
    } else {
        const newLink: DealProductLink = {
            ...productToAdd,
            deal_product_id: Date.now(),
            quantity: quantity,
            price_at_time_of_adding: priceAtTime
        };
        setDealProducts([...dealProducts, newLink]);
    }

    setSelectedProductId(null);
    setQuantity(1);
    setPriceAtTime(0);
  };

  const handleRemoveProduct = (productIdToRemove: number) => {
    setDealProducts(dealProducts.filter(p => p.id !== productIdToRemove));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    // If the calculation method is dynamic, recalculate the total value
    if (editedDeal.value_calculation_method === 'dynamic') {
      // Calculate the total value from products
      const totalValue = dealProducts.reduce((sum, product) => {
        return sum + (product.quantity * product.price_at_time_of_adding);
      }, 0);

      // Update the editedDeal with the calculated value
      editedDeal.value = totalValue.toString();
    }

    try {
      const dealSaveSuccess = await onSave(editedDeal);

      if (!dealSaveSuccess) {
        throw new Error("Fehler beim Speichern der Deal-Details.");
      }

      const productsToAdd = dealProducts.filter(dp => !initialDealProducts.some(idp => idp.id === dp.id));
      const productsToRemove = initialDealProducts.filter(idp => !dealProducts.some(dp => dp.id === idp.id));
      const productsToUpdate = dealProducts.filter(dp => {
          const initial = initialDealProducts.find(idp => idp.id === dp.id);
          return initial && initial.quantity !== dp.quantity;
      });

      const promises: Promise<{ success: boolean; error?: string; [key: string]: any }>[] = [];

      productsToAdd.forEach(p => {
        console.log(`Adding product ${p.id} to deal ${deal.id}`);
        promises.push(window.electronAPI.invoke('deals:add-product', {
            dealId: deal.id,
            productId: p.id,
            quantity: p.quantity,
            priceAtTime: p.price_at_time_of_adding
        }));
      });

      productsToRemove.forEach(p => {
          console.log(`Removing product ${p.id} from deal ${deal.id}`);
          promises.push(window.electronAPI.invoke('deals:remove-product', { dealId: deal.id, productId: p.id }));
      });

       productsToUpdate.forEach(p => {
          console.log(`Updating quantity for product ${p.id} in deal ${deal.id} to ${p.quantity}`);
          promises.push(window.electronAPI.invoke('deals:update-product-quantity', {
              dealId: deal.id,
              productId: p.id,
              newQuantity: p.quantity
          }));
      });

      const results = await Promise.all(promises);
      const failedResults = results.filter((r: { success: boolean; [key: string]: any }) => !r.success);

      if (failedResults.length > 0) {
        console.error("Errors during product link updates:", failedResults);
        throw new Error("Fehler beim Aktualisieren der Produktverknüpfungen.");
      }

      onClose();

    } catch (err: any) {
      console.error("Error during save:", err);
      setError(err.message || "Ein Fehler ist beim Speichern aufgetreten.");
    } finally {
      setIsSaving(false);
    }
  };

  const productOptions = allProducts.map(p => ({ value: p.id.toString(), label: `${p.name} (${formatCurrency(p.price)})` }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Deal bearbeiten: {editedDeal.name}</DialogTitle>
          <DialogDescription>
            Bearbeiten Sie die Details des Deals und fügen Sie Produkte hinzu.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm font-medium text-destructive px-6 py-2">Fehler: {error}</p>}

        <div className="grid gap-4 py-4 px-6 overflow-y-auto flex-grow">
          <div className="grid gap-2">
            <Label htmlFor="edit-name">Deal-Name</Label>
            <Input id="edit-name" value={editedDeal.name} onChange={(e) => setEditedDeal({ ...editedDeal, name: e.target.value })} disabled={isSaving}/>
          </div>
           <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="edit-customer">Kunde</Label>
                <Input id="edit-customer" value={editedDeal.customer} onChange={(e) => setEditedDeal({ ...editedDeal, customer: e.target.value })} disabled={isSaving}/>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="edit-value-calculation-method">Wertberechnung</Label>
                <Select
                  value={editedDeal.value_calculation_method || 'static'}
                  onValueChange={(value) => setEditedDeal({
                    ...editedDeal,
                    value_calculation_method: value as 'static' | 'dynamic'
                  })}
                  disabled={isSaving}
                >
                  <SelectTrigger id="edit-value-calculation-method">
                    <SelectValue placeholder="Berechnungsmethode auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="static">Statisch (manuell)</SelectItem>
                    <SelectItem value="dynamic">Dynamisch (aus Produkten)</SelectItem>
                  </SelectContent>
                </Select>
            </div>
           </div>
           <div className="grid gap-2">
              <Label htmlFor="edit-value">Wert (€){editedDeal.value_calculation_method === 'dynamic' ? ' (wird automatisch berechnet)' : ''}</Label>
              <Input
                id="edit-value"
                type="number"
                step="0.01"
                value={editedDeal.value}
                onChange={(e) => setEditedDeal({ ...editedDeal, value: e.target.value })}
                disabled={isSaving || editedDeal.value_calculation_method === 'dynamic'}
              />
           </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-stage">Phase</Label>
            <Select value={editedDeal.stage} onValueChange={(value) => setEditedDeal({ ...editedDeal, stage: value as DealStage })} disabled={isSaving}>
              <SelectTrigger id="edit-stage"><SelectValue placeholder="Phase auswählen" /></SelectTrigger>
              <SelectContent>
                 {Object.values(DealStage).map(stage => (
                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                 ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-expected-close-date">Voraussichtliches Abschlussdatum</Label>
            <Input id="edit-expected-close-date" type="date" value={editedDeal.expectedCloseDate?.split('.').reverse().join('-') || ''} onChange={(e) => {const dateValue = e.target.value; const formattedDate = dateValue ? dateValue.split('-').reverse().join('.') : ''; setEditedDeal({ ...editedDeal, expectedCloseDate: formattedDate }); }} disabled={isSaving}/>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-notes">Notizen</Label>
            <Textarea id="edit-notes" value={editedDeal.notes || ''} onChange={(e) => setEditedDeal({ ...editedDeal, notes: e.target.value })} className="min-h-[80px]" disabled={isSaving}/>
          </div>

          <div className="space-y-4 pt-4 border-t mt-4">
              <h3 className="text-lg font-semibold">Produkte</h3>
              <div className="flex items-end gap-2 p-3 border rounded-md bg-muted/40">
                 <div className="flex-grow grid gap-1.5">
                     <Label htmlFor="product-select">Produkt auswählen</Label>
                     <Combobox
                         options={productOptions}
                         value={selectedProductId}
                         onChange={setSelectedProductId}
                         placeholder="Produkt suchen..."
                         disabled={isSaving}
                     />
                 </div>
                 <div className="grid gap-1.5 w-24">
                     <Label htmlFor="product-quantity">Menge</Label>
                     <Input id="product-quantity" type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value) || 1)} disabled={isSaving || !selectedProductId}/>
                 </div>
                  <div className="grid gap-1.5 w-28">
                     <Label htmlFor="product-price">Preis (€)</Label>
                     <Input id="product-price" type="number" step="0.01" value={priceAtTime} onChange={(e) => setPriceAtTime(Number(e.target.value) || 0)} disabled={isSaving || !selectedProductId}/>
                 </div>
                 <Button onClick={handleAddProduct} disabled={isSaving || !selectedProductId} size="icon" variant="outline">
                     <PlusCircle className="h-4 w-4" />
                     <span className="sr-only">Produkt hinzufügen</span>
                 </Button>
              </div>

              {isLoading ? (
                 <p>Zugeordnete Produkte werden geladen...</p>
              ) : dealProducts.length > 0 ? (
                  <div className="rounded-md border">
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Produkt</TableHead>
                                <TableHead className="text-right w-[80px]">Menge</TableHead>
                                <TableHead className="text-right w-[100px]">Preis</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dealProducts.map((p: DealProductLink) => (
                                <TableRow key={p.deal_product_id}>
                                    <TableCell className="font-medium">{p.name}</TableCell>
                                    <TableCell className="text-right">{p.quantity}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(p.price_at_time_of_adding)}</TableCell>
                                    <TableCell>
                                         <Button variant="ghost" size="icon" onClick={() => handleRemoveProduct(p.id)} disabled={isSaving} className="text-muted-foreground hover:text-destructive h-8 w-8">
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Produkt entfernen</span>
                                         </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                     </Table>
                  </div>
              ) : (
                 <p className="text-sm text-muted-foreground text-center py-4">Noch keine Produkte zu diesem Deal hinzugefügt.</p>
              )}
          </div>
        </div>

        <DialogFooter className="px-6 pb-4 pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? "Wird gespeichert..." : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
