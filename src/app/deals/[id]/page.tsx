import { useState, useEffect, useCallback } from "react";
import { useDealProducts } from "@/hooks/useDealProducts";
import { DealProductLink } from "@/types"; // Corrected import for DealProductLink
import { useParams } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { DealHeader, DealMetadata, DealNotes } from "@/components/deal/deal-components";
import { DealDetailSkeleton } from "@/components/deal/deal-skeleton";
import { EditDealDialog } from "@/components/deal/edit-deal-dialog";
import { Deal } from "@/types/deal";
import { Customer, Product } from "@/types"; // Correctly import Customer and Product
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit, Trash2, Package, ListChecks, Info, Loader2, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "@tanstack/react-router";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Added for CustomerDetails
import { ProductCombobox } from "@/components/product-combobox";

interface PageParams {
  id: string;
}

interface JtlFirma { kFirma: number; cName: string; }
interface JtlWarenlager { kWarenlager: number; cName: string; }
interface JtlZahlungsart { kZahlungsart: number; cName: string; }
interface JtlVersandart { kVersandart: number; cName: string; }

// Define the expected response structure from 'jtl:create-order' IPC call
interface JtlOrderCreationResponse {
  success: boolean;
  error?: string;
  jtlOrderNumber?: string;
}

export default function DealDetailPage() {
  const { dealId: routeDealId } = useParams({ from: '/deals/$dealId' }); // Renamed to avoid conflict with deal object
  const dealId = Number(routeDealId); // Ensure dealId is a number for API calls
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  // Product related states and functions are now managed by useDealProducts hook
  const [customerForOrder, setCustomerForOrder] = useState<Customer | null>(null);
  const [jtlFirmen, setJtlFirmen] = useState<JtlFirma[]>([]);
  const [jtlWarenlager, setJtlWarenlager] = useState<JtlWarenlager[]>([]);
  const [jtlZahlungsarten, setJtlZahlungsarten] = useState<JtlZahlungsart[]>([]);
  const [jtlVersandarten, setJtlVersandarten] = useState<JtlVersandart[]>([]);
  const [isLoadingJtlData, setIsLoadingJtlData] = useState(false);
  const [isCreateJtlOrderDialogOpen, setIsCreateJtlOrderDialogOpen] = useState(false);
  const [selectedFirma, setSelectedFirma] = useState<string>("");
  const [selectedWarenlager, setSelectedWarenlager] = useState<string>("");
  const [selectedZahlungsart, setSelectedZahlungsart] = useState<string>("");
  const [selectedVersandart, setSelectedVersandart] = useState<string>("");
  const [isSubmittingJtlOrder, setIsSubmittingJtlOrder] = useState(false);

  useEffect(() => {
    const fetchDealAndCustomer = async () => {
      setIsLoading(true);
      setDeal(null);
      setCustomerForOrder(null);
      try {
        if (window.electronAPI?.invoke) {
          const dealData = await window.electronAPI.invoke<Deal | null>('deals:get-by-id', dealId);
          setDeal(dealData);
          if (dealData?.customer_id) {
            const customerData = await window.electronAPI.invoke<Customer | null>('db:get-customer', dealData.customer_id);
            setCustomerForOrder(customerData);
          }
        } else {
          console.error("window.electronAPI or invoke method not found.");
          setDeal(null);
          setCustomerForOrder(null);
        }
      } catch (error: any) {
        console.error("Error fetching deal or customer:", error);
        setDeal(null);
        setCustomerForOrder(null);
      } finally {
        setIsLoading(false);
      }
    };
    if (routeDealId) { // Use routeDealId for dependency
      fetchDealAndCustomer();
    }
  }, [routeDealId, dealId]);

  // Function to update deal value when products change (for dynamic calculation)
  const handleProductsChange = useCallback((products: DealProductLink[]) => {
    if (deal?.value_calculation_method === 'dynamic' && products.length > 0) {
      // Calculate total value from products
      const totalValue = products.reduce((sum, product) => {
        return sum + (product.quantity * product.price_at_time_of_adding);
      }, 0);

      // Update the deal in the UI with the new calculated value
      if (deal) {
        setDeal({
          ...deal,
          value: totalValue.toString()
        });
      }
    }
  }, [deal]);

  // Initialize the useDealProducts hook
  const {
    dealProducts,
    isProductsLoading,
    productsError,
    // fetchDealProducts, // Not directly called from here anymore, hook handles its own fetching
    handleAddProductToDeal,
    handleUpdateDealProduct,
    handleRemoveDealProduct
  } = useDealProducts(deal?.id, handleProductsChange);

  useEffect(() => {
    const fetchJtlEntities = async () => {
      if (!window.electronAPI?.invoke) return;
      setIsLoadingJtlData(true);
      try {
        const [firmen, warenlager, zahlungsarten, versandarten] = await Promise.all([
          window.electronAPI.invoke<JtlFirma[]>('jtl:get-firmen'),
          window.electronAPI.invoke<JtlWarenlager[]>('jtl:get-warenlager'),
          window.electronAPI.invoke<JtlZahlungsart[]>('jtl:get-zahlungsarten'),
          window.electronAPI.invoke<JtlVersandart[]>('jtl:get-versandarten'),
        ]);
        setJtlFirmen(firmen || []);
        setJtlWarenlager(warenlager || []);
        setJtlZahlungsarten(zahlungsarten || []);
        setJtlVersandarten(versandarten || []);
      } catch (error) {
        console.error("Error fetching JTL entities:", error);
        toast({ variant: "destructive", title: "Fehler", description: "JTL-Auswahllisten konnten nicht geladen werden." });
      } finally {
        setIsLoadingJtlData(false);
      }
    };
    fetchJtlEntities();
    }, []);

  // The useEffect that previously called fetchDealProducts is now handled within the useDealProducts hook.

  const handleEditDeal = async (updatedDealData: Deal): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (!window.electronAPI?.invoke) {
        throw new Error("API not available for saving.");
      }
      const result = await window.electronAPI.invoke<{ success: boolean; error?: string }>(
        'deals:update',
        { id: dealId, dealData: updatedDealData }
      );
      if (result.success) {
        // Define type for service response; Deal is imported from "@/types/deal"
        // This type represents the object structure returned by 'deals:get-by-id'
        type DealResponseFromService = Omit<Deal, 'customer'> & { customer_name: string };

        const response = await window.electronAPI.invoke<DealResponseFromService | null>('deals:get-by-id', dealId);
        if (response) {
          const { customer_name, ...baseDealData } = response;
          // Construct the deal object for state:
          // - It conforms to the Deal type.
          // - Deal.customer is populated from the fetched customer_name.
          // - customer_name property itself is not part of this state object.
          const dealForState: Deal = {
            ...baseDealData,
            customer: customer_name,
          };
          setDeal(dealForState);
          // fetchDealProducts(); // This will be triggered by the hook due to deal.id change if necessary
        }
        setIsLoading(false);
        return true;
      } else {
        console.error("Error updating deal:", result.error);
        setIsLoading(false);
        return false;
      }
    } catch (error: any) {
      console.error("Error updating deal:", error);
      setIsLoading(false);
      return false;
    }
  };

  const handleDeleteDeal = async () => {
    if (!deal) return;
    setIsLoading(true);
    try {
      // For now, we'll just navigate away as before, assuming deletion happens elsewhere or is not yet implemented
      console.warn("Deal deletion IPC handler not implemented. Navigating away.");
      navigate({ to: '/deals' });
    } catch (error: any) {
      console.error("Error deleting deal:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number | string | undefined): string => {
    const numAmount = Number(amount);
    if (isNaN(numAmount)) return '-';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(numAmount);
  };

  const handleOpenCreateJtlOrderDialog = () => {
    if (!deal || !customerForOrder) {
      toast({ variant: "destructive", title: "Fehler", description: "Deal- oder Kundendaten nicht geladen." });
      return;
    }
    // Add this check for jtl_kKunde
    if (!customerForOrder.jtl_kKunde) {
      toast({ variant: "destructive", title: "Fehler", description: "Dem Kunden ist keine JTL Kundennummer (jtl_kKunde) zugeordnet. Auftragserstellung nicht möglich." });
      return;
    }
    if (dealProducts.length === 0) {
      toast({ variant: "destructive", title: "Fehler", description: "Keine Produkte im Deal für den Auftrag." });
      return;
    }
    if (jtlFirmen.length > 0 && !selectedFirma) setSelectedFirma(String(jtlFirmen[0].kFirma));
    if (jtlWarenlager.length > 0 && !selectedWarenlager) setSelectedWarenlager(String(jtlWarenlager[0].kWarenlager));
    if (jtlZahlungsarten.length > 0 && !selectedZahlungsart) setSelectedZahlungsart(String(jtlZahlungsarten[0].kZahlungsart));
    if (jtlVersandarten.length > 0 && !selectedVersandart) setSelectedVersandart(String(jtlVersandarten[0].kVersandart));
    setIsCreateJtlOrderDialogOpen(true);
  };

  const handleCreateJtlOrder = async () => {
    if (!deal || !customerForOrder || !selectedFirma || !selectedWarenlager || !selectedZahlungsart || !selectedVersandart) {
      toast({ variant: "destructive", title: "Fehler", description: "Bitte alle JTL-Optionen auswählen und sicherstellen, dass Deal- und Kundendaten geladen sind." });
      return;
    }
    setIsSubmittingJtlOrder(true);

    let cStrasse = customerForOrder.street || "";
    let cHausnummer = "";
    const streetParts = customerForOrder.street?.match(/(.+?)\s*(\d+[a-zA-Z]*(-[\d\w]+)?\s*[a-zA-Z]?$)/);
    if (streetParts && streetParts.length > 2) {
        cStrasse = streetParts[1].trim();
        cHausnummer = streetParts[2].trim();
    }

    let cLandISO = customerForOrder.country || "";
    if (cLandISO.toLowerCase() === "deutschland") cLandISO = "DE";
    // Add more country mappings as needed

    const orderProducts = dealProducts
      .map(p => ({
        kArtikel: p.jtl_kArtikel || 0,
        cName: p.name,
        cArtNr: p.sku || "",
        nAnzahl: p.quantity,
        fPreis: p.price_at_time_of_adding,
      }))
      .filter(p => p.kArtikel > 0);

    if (orderProducts.length !== dealProducts.length) {
        console.warn("Einige Produkte konnten nicht für den JTL-Auftrag übernommen werden, da die jtl_kArtikel fehlt oder ungültig ist.");
        toast({ variant: "default", title: "Hinweis", description: "Einige Produkte ohne gültige JTL Artikel ID wurden nicht übernommen." });
    }
    if (orderProducts.length === 0) {
        toast({ variant: "destructive", title: "Fehler", description: "Keine gültigen Produkte für den JTL Auftrag gefunden (fehlende oder ungültige jtl_kArtikel)." });
        setIsSubmittingJtlOrder(false);
        return;
    }

    const orderInput = {
      simpleCrmCustomerId: customerForOrder.id, // Changed from customerForOrder.jtl_kKunde
      cAnrede: customerForOrder.salutation || "",
      cFirma: customerForOrder.company_name || (customerForOrder.is_company ? customerForOrder.name : ""),
      cName: customerForOrder.is_company ? (customerForOrder.contact_person_name || customerForOrder.name) : customerForOrder.name,
      cStrasse: cStrasse,
      cHausnummer: cHausnummer,
      cPLZ: customerForOrder.zip || "",
      cOrt: customerForOrder.city || "",
      cLandISO: cLandISO,
      cTel: customerForOrder.phone || "",
      cMobil: customerForOrder.mobile || "",
      cEmail: customerForOrder.email || "",
      cZusatz: customerForOrder.notes || "",

      kFirma: parseInt(selectedFirma),
      kWarenlager: parseInt(selectedWarenlager),
      kZahlungsart: parseInt(selectedZahlungsart),
      kVersandart: parseInt(selectedVersandart),
      products: orderProducts,
    };

    try {
      if (!window.electronAPI?.invoke) throw new Error("Electron API not available");
      // Explicitly type the result of the invoke call
      const result = await window.electronAPI.invoke<JtlOrderCreationResponse>('jtl:create-order', orderInput);

      if (result.success) {
        toast({ title: "Erfolg", description: `JTL Auftrag ${result.jtlOrderNumber ? result.jtlOrderNumber : ''} erfolgreich erstellt.` });
        setIsCreateJtlOrderDialogOpen(false);
      } else {
        throw new Error(result.error || "Unbekannter Fehler beim Erstellen des JTL Auftrags.");
      }
    } catch (error: any) {
      console.error("Error creating JTL order:", error);
      toast({ variant: "destructive", title: "Fehler", description: error.message });
    } finally {
      setIsSubmittingJtlOrder(false);
    }
    };

    // Product handling functions (handleAddProductToDeal, handleUpdateDealProduct, handleRemoveDealProduct)
    // are now part of the useDealProducts hook and are destructured above.

    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">
        <div className="container mx-auto max-w-7xl py-6">
          <div className="mb-6">
            <Button variant="ghost" asChild className="mb-6 gap-1">
              <Link to="/deals">
                <ArrowLeft className="h-4 w-4" />
                Zurück zu Deals
              </Link>
            </Button>

            {isLoading ? (
              <DealDetailSkeleton />
            ) : !deal ? (
              <div className="flex h-[400px] w-full flex-col items-center justify-center rounded-md border border-dashed p-8 text-center animate-in fade-in-50">
                <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                  <h3 className="mt-4 text-lg font-semibold">Deal nicht gefunden</h3>
                  <p className="mb-4 mt-2 text-sm text-muted-foreground">
                    Der gesuchte Deal existiert nicht oder Sie haben keinen Zugriff darauf.
                  </p>
                  <Button asChild>
                    <Link to="/deals">Zurück zu Deals</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <DealHeader deal={deal} />
                  <div className="flex gap-2 self-start">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => setIsEditDialogOpen(true)}
                    >
                      <Edit className="h-4 w-4" />
                      Bearbeiten
                    </Button>
                    <Dialog open={isCreateJtlOrderDialogOpen} onOpenChange={setIsCreateJtlOrderDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1" onClick={handleOpenCreateJtlOrderDialog} disabled={isLoadingJtlData || !dealProducts || dealProducts.length === 0 || !customerForOrder || !customerForOrder.jtl_kKunde}>
                          <FilePlus2 className="h-4 w-4" />
                          JTL Auftrag erstellen
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>JTL Auftrag erstellen</DialogTitle>
                          <DialogDescription>
                            Wählen Sie die erforderlichen JTL-Optionen für diesen Auftrag aus.
                          </DialogDescription>
                        </DialogHeader>
                        {isLoadingJtlData ? (
                          <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                        ) : (
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="jtlFirma" className="text-right">Firma</Label>
                              <Select value={selectedFirma} onValueChange={setSelectedFirma} name="jtlFirma">
                                <SelectTrigger className="col-span-3">
                                  <SelectValue placeholder="Firma auswählen" />
                                </SelectTrigger>
                                <SelectContent>
                                  {jtlFirmen.map(f => <SelectItem key={f.kFirma} value={String(f.kFirma)}>{f.cName}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="jtlWarenlager" className="text-right">Warenlager</Label>
                              <Select value={selectedWarenlager} onValueChange={setSelectedWarenlager} name="jtlWarenlager">
                                <SelectTrigger className="col-span-3">
                                  <SelectValue placeholder="Warenlager auswählen" />
                                </SelectTrigger>
                                <SelectContent>
                                  {jtlWarenlager.map(w => <SelectItem key={w.kWarenlager} value={String(w.kWarenlager)}>{w.cName}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="jtlZahlungsart" className="text-right">Zahlungsart</Label>
                              <Select value={selectedZahlungsart} onValueChange={setSelectedZahlungsart} name="jtlZahlungsart">
                                <SelectTrigger className="col-span-3">
                                  <SelectValue placeholder="Zahlungsart auswählen" />
                                </SelectTrigger>
                                <SelectContent>
                                  {jtlZahlungsarten.map(z => <SelectItem key={z.kZahlungsart} value={String(z.kZahlungsart)}>{z.cName}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="jtlVersandart" className="text-right">Versandart</Label>
                              <Select value={selectedVersandart} onValueChange={setSelectedVersandart} name="jtlVersandart">
                                <SelectTrigger className="col-span-3">
                                  <SelectValue placeholder="Versandart auswählen" />
                                </SelectTrigger>
                                <SelectContent>
                                  {jtlVersandarten.map(v => <SelectItem key={v.kVersandart} value={String(v.kVersandart)}>{v.cName}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button type="button" variant="outline">Abbrechen</Button>
                          </DialogClose>
                          <Button type="button" onClick={handleCreateJtlOrder} disabled={isSubmittingJtlOrder || isLoadingJtlData || !selectedFirma || !selectedWarenlager || !selectedZahlungsart || !selectedVersandart}>
                            {isSubmittingJtlOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Auftrag erstellen
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Löschen
                    </Button>
                  </div>
                </div>
                <Separator />

                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
                    <TabsTrigger value="overview">
                      <Info className="mr-1 h-4 w-4" /> Übersicht
                    </TabsTrigger>
                    <TabsTrigger value="products">
                      <Package className="mr-1 h-4 w-4" /> Produkte
                    </TabsTrigger>
                    <TabsTrigger value="tasks">
                       <ListChecks className="mr-1 h-4 w-4" /> Aufgaben
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="mt-4 space-y-6">
                    {/* Customer Details Section */}
                    {customerForOrder && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Kundendetails</CardTitle>
                          <CardDescription>Informationen zum zugehörigen Kunden.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <p><strong>Name:</strong> {customerForOrder.name}</p>
                          {customerForOrder.company_name && <p><strong>Firma:</strong> {customerForOrder.company_name}</p>}
                          <p><strong>E-Mail:</strong> {customerForOrder.email || "-"}</p>
                          <p><strong>Telefon:</strong> {customerForOrder.phone || "-"}</p>
                          <p><strong>Mobil:</strong> {customerForOrder.mobile || "-"}</p>
                          <p><strong>Adresse:</strong> {customerForOrder.street || "-"}, {customerForOrder.zip || "-"} {customerForOrder.city || "-"}, {customerForOrder.country || "-"}</p>
                          {customerForOrder.jtl_kKunde && <p><strong>JTL Kundennr.:</strong> {customerForOrder.jtl_kKunde}</p>}
                        </CardContent>
                      </Card>
                    )}

                    {/* Deal Products Section - reusing existing product table logic */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle>Produkte im Deal</CardTitle>
                          <CardDescription>Aktuell diesem Deal zugeordnete Produkte.</CardDescription>
                        </div>
                        <Button onClick={() => setIsAddProductDialogOpen(true)} size="sm" className="gap-1">
                          <Package className="h-4 w-4" /> Produkt hinzufügen
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-lg border">
                          {isProductsLoading ? (
                            <div className="flex items-center justify-center p-8">
                              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                              <span>Produkte werden geladen...</span>
                            </div>
                          ) : productsError ? (
                            <p className="p-4 text-center text-destructive">{productsError}</p>
                          ) : dealProducts.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Produkt</TableHead>
                                  <TableHead>SKU</TableHead>
                                  <TableHead className="text-right">Menge</TableHead>
                                  <TableHead className="text-right">Preis</TableHead>
                                  <TableHead className="text-right">Gesamt</TableHead>
                                  <TableHead className="text-right">Aktion</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {dealProducts.map((p) => (
                                  <DealProductRow
                                    key={p.deal_product_id}
                                    product={p}
                                    onUpdateProduct={handleUpdateDealProduct}
                                    onRemoveProduct={handleRemoveDealProduct}
                                    formatCurrency={formatCurrency}
                                  />
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="p-4 text-center text-sm text-muted-foreground">
                              Keine Produkte zu diesem Deal hinzugefügt.
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <DealMetadata deal={deal} />
                    <DealNotes deal={deal} />
                  </TabsContent>
                  <TabsContent value="products" className="mt-4">
                     {/* This tab's content can be removed if products are fully integrated into "Übersicht" */}
                     {/* For now, keeping it as a separate view as well, but it's redundant if above is complete */}
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Alle Produkte im Deal (Detailansicht)</h3>
                       {/* Button to add product might be redundant if also in Übersicht */}
                       <Button onClick={() => setIsAddProductDialogOpen(true)} size="sm" className="gap-1">
                        <Package className="h-4 w-4" /> Produkt hinzufügen
                      </Button>
                    </div>
                    <div className="rounded-lg border">
                      {isProductsLoading ? (
                        <div className="flex items-center justify-center p-8">
                          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                          <span>Produkte werden geladen...</span>
                        </div>
                      ) : productsError ? (
                        <p className="p-4 text-center text-destructive">{productsError}</p>
                      ) : dealProducts.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Produkt</TableHead>
                              <TableHead>SKU</TableHead>
                              <TableHead className="text-right">Menge</TableHead>
                              <TableHead className="text-right">Preis</TableHead>
                              <TableHead className="text-right">Gesamt</TableHead>
                              <TableHead className="text-right">Aktion</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dealProducts.map((p) => (
                              <DealProductRow
                                key={p.deal_product_id}
                                product={p}
                                onUpdateProduct={handleUpdateDealProduct}
                                onRemoveProduct={handleRemoveDealProduct}
                                formatCurrency={formatCurrency}
                              />
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="p-4 text-center text-sm text-muted-foreground">
                          Keine Produkte zu diesem Deal hinzugefügt.
                        </p>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="tasks" className="mt-4">
                     <div className="rounded-lg border p-4">
                      <h4 className="mb-2 text-lg font-semibold">Aufgaben</h4>
                      <p className="text-sm text-muted-foreground">
                        Aufgaben im Zusammenhang mit diesem Deal werden hier angezeigt. (Funktionalität kommt bald)
                      </p>
                     </div>
                  </TabsContent>
                </Tabs>

                {deal && (
                  <EditDealDialog
                    deal={deal}
                    isOpen={isEditDialogOpen}
                    onClose={() => setIsEditDialogOpen(false)}
                    onSave={handleEditDeal}
                  />
                  )}

                  {deal && (
                    <AddProductDialog
                      isOpen={isAddProductDialogOpen}
                      onClose={() => setIsAddProductDialogOpen(false)}
                      onAddProduct={handleAddProductToDeal}
                      dealId={deal.id}
                    />
                  )}

                  <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                      <AlertDialogTitle>Deal löschen</AlertDialogTitle>
                      <AlertDialogDescription>
                        Sind Sie sicher, dass Sie den Deal "{deal.name}" löschen möchten?
                        Diese Aktion kann nicht rückgängig gemacht werden.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={handleDeleteDeal}
                      >
                        Löschen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
  }

  // DealProductRow component
  interface DealProductRowProps {
    product: DealProductLink;
    onUpdateProduct: (dealProductId: number, newQuantity: number, newPrice: number) => void;
    onRemoveProduct: (dealProductId: number) => void;
    formatCurrency: (amount: number | string | undefined) => string;
  }

  function DealProductRow({ product, onUpdateProduct, onRemoveProduct, formatCurrency }: DealProductRowProps) {
    const [currentQuantity, setCurrentQuantity] = useState(product.quantity);
    const [currentPrice, setCurrentPrice] = useState(product.price_at_time_of_adding);

    // Update local state if the product prop changes (e.g., after a fetchDealProducts call)
    useEffect(() => {
      setCurrentQuantity(product.quantity);
      setCurrentPrice(product.price_at_time_of_adding);
    }, [product.quantity, product.price_at_time_of_adding]);

    const onQuantityBlur = () => {
      // Check if the value actually changed before calling update
      if (currentQuantity !== product.quantity || currentPrice !== product.price_at_time_of_adding) {
        onUpdateProduct(product.deal_product_id, currentQuantity, currentPrice);
      }
    };

    const onPriceBlur = () => {
      // Check if the value actually changed before calling update
      if (currentPrice !== product.price_at_time_of_adding || currentQuantity !== product.quantity) {
        onUpdateProduct(product.deal_product_id, currentQuantity, currentPrice);
      }
    };

    return (
      <TableRow>
        <TableCell className="font-medium">{product.name}</TableCell>
        <TableCell>{product.sku || '-'}</TableCell>
        <TableCell className="text-right w-28">
          <Input
            type="number"
            value={currentQuantity}
            onChange={(e) => setCurrentQuantity(Number(e.target.value))}
            onBlur={onQuantityBlur}
            className="h-8 text-right"
            min="1"
          />
        </TableCell>
        <TableCell className="text-right w-32">
          <Input
            type="number"
            value={currentPrice}
            onChange={(e) => setCurrentPrice(Number(e.target.value))}
            onBlur={onPriceBlur}
            className="h-8 text-right"
            min="0"
            step="0.01"
          />
        </TableCell>
        <TableCell className="text-right">{formatCurrency(currentQuantity * currentPrice)}</TableCell>
        <TableCell className="text-right w-20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemoveProduct(product.deal_product_id)}
            title="Produkt entfernen"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </TableCell>
      </TableRow>
    );
  }

  // AddProductDialog component (can be moved to a new file later)
  interface AddProductDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAddProduct: (productId: number, quantity: number, price: number) => Promise<boolean>;
    dealId: number; // Though not directly used in this version of dialog, good for context/future
  }

  function AddProductDialog({ isOpen, onClose, onAddProduct }: AddProductDialogProps) {
    const { toast } = useToast();
    // Removed allProducts and isLoadingProducts - ProductCombobox handles this internally
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [quantity, setQuantity] = useState<number>(1);
    const [price, setPrice] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Utility function from parent scope
    const formatCurrency = (amount: number | string | undefined): string => {
      const numAmount = Number(amount);
      if (isNaN(numAmount)) return '-';
      return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(numAmount);
    };

    useEffect(() => {
      if (isOpen) {
        setSelectedProductId(null);
        setQuantity(1);
        setPrice(0);
        // Removed fetchAllProducts - ProductCombobox handles product loading internally
      }
    }, [isOpen]);

    const handleProductChange = async (productIdString: string | null) => {
      setSelectedProductId(productIdString);
      if (productIdString) {
        try {
          const selectedProduct = await window.electronAPI?.invoke('products:get-by-id', Number(productIdString)) as Product;
          if (selectedProduct) {
            setPrice(selectedProduct.price || 0);
          } else {
            setPrice(0);
          }
        } catch (error) {
          console.error("Error fetching product details:", error);
          setPrice(0);
        }
      } else {
        setPrice(0);
      }
    };

    const handleSubmit = async () => {
      if (!selectedProductId || quantity <= 0 || price < 0) {
        toast({ variant: "destructive", title: "Validierung fehlgeschlagen", description: "Bitte wählen Sie ein Produkt und geben Sie eine gültige Menge und einen gültigen Preis ein." });
        return;
      }
      setIsSubmitting(true);
      const success = await onAddProduct(Number(selectedProductId), quantity, price);
      if (success) {
        // Toast for success is handled by onAddProduct's caller or onAddProduct itself
        onClose();
      }
      // If not success, error toast is handled by onAddProduct
      setIsSubmitting(false);
    };

    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Produkt zum Deal hinzufügen</DialogTitle>
            <DialogDescription>
              Wählen Sie ein Produkt aus und geben Sie Menge und Preis an.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="product" className="text-right">Produkt</Label>
              <div className="col-span-3">
                <ProductCombobox
                  value={selectedProductId}
                  onValueChange={handleProductChange}
                  placeholder="Produkt suchen..."
                  disabled={isSubmitting}
                />
              </div>
            </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right">Menge</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="col-span-3"
                  min="1"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">Preis</Label>
                <Input
                  id="price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="col-span-3"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            </DialogClose>
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !selectedProductId}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

