import { useState, useEffect, useCallback } from "react" // Added useCallback
import { useParams } from "@tanstack/react-router"
// Removed MainNav import as it's not used directly here
import { DealHeader, DealMetadata, DealNotes } from "@/components/deal/deal-components"
import { DealDetailSkeleton } from "@/components/deal/deal-skeleton"
import { EditDealDialog } from "@/components/deal/edit-deal-dialog"
import { Deal } from "@/types/deal"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Edit, Trash2, Package, ListChecks, Info, Loader2 } from "lucide-react" // Added Loader2
import { Button } from "@/components/ui/button"
import { Link, useNavigate } from "@tanstack/react-router"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Added Table imports
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Product } from "@/types"; // Import Product type

// Interface for the product data linked to a deal, including quantity and price at time
interface DealProductLink extends Product {
  deal_product_id: number; // ID of the link entry itself
  quantity: number;
  price_at_time_of_adding: number;
  dateAdded: string; // Keep dateAdded if needed
}

interface PageParams {
  id: string
}

export default function DealDetailPage() {
  const { dealId } = useParams({ from: '/deals/$dealId' })
  const navigate = useNavigate()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  // Removed initialDealsList state as data is fetched via IPC now
  // const [initialDealsList, setInitialDealsList] = useState<Deal[]>(initialDeals)
  const [dealProducts, setDealProducts] = useState<DealProductLink[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState<boolean>(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  // Fetch deal details
  useEffect(() => {
    // Simulate API request with a short delay
    const fetchDeal = async () => {
      setIsLoading(true);
      setDeal(null); // Reset deal state before fetching
      try {
        // Add check for electronAPI existence
        if (window.electronAPI?.invoke) {
          const dealData = await window.electronAPI.invoke<Deal | null>('deals:get-by-id', Number(dealId));
          setDeal(dealData); // Set dealData (which could be null)
        } else {
          console.error("window.electronAPI or invoke method not found.");
          setDeal(null); // Ensure deal is null if API is missing
        }
      } catch (error: any) { // Explicitly type error
        console.error("Error fetching deal:", error);
        setDeal(null); // Set to null on error
      } finally {
        setIsLoading(false);
      }
    };

    if (dealId) {
      fetchDeal();
    } else {
      // No dealId provided, stop loading and ensure deal is null
      setIsLoading(false);
      setDeal(null);
    }
  }, [dealId]); // Dependency array is correct

  // Fetch linked products when deal is loaded
  const fetchDealProducts = useCallback(async () => {
    if (!deal?.id) return;
    setIsProductsLoading(true);
    setProductsError(null);
    try {
      // Add check for electronAPI existence
      if (window.electronAPI?.invoke) {
        const products = await window.electronAPI.invoke<DealProductLink[]>('deals:get-products', deal.id);
        setDealProducts(products);
      } else {
         console.error("window.electronAPI or invoke method not found.");
         setProductsError("Fehler: API nicht verfügbar.");
      }
    } catch (err: any) { // Explicitly type error
      console.error(`Error fetching products for deal ${deal.id}:`, err);
      setProductsError(err.message || "Fehler beim Laden der Produkte.");
    } finally {
      setIsProductsLoading(false);
    }
  }, [deal]); // Depend on deal object

  useEffect(() => {
    if (deal) {
      fetchDealProducts();
    } else {
      setDealProducts([]); // Clear products if no deal
    }
  }, [deal, fetchDealProducts]); // Run when deal changes

  // Handle saving edited deal (including product links via EditDealDialog)
  const handleEditDeal = async (updatedDealData: Deal): Promise<boolean> => {
    setIsLoading(true); // Show loading indicator while saving
    try {
      // Add check for electronAPI existence
      if (!window.electronAPI?.invoke) {
        throw new Error("API not available for saving.");
      }

      const result = await window.electronAPI.invoke<{ success: boolean; error?: string }>(
        'deals:update',
        { id: Number(dealId), dealData: updatedDealData }
      );

      if (result.success) {
        // Re-fetch the deal data to show updated info
        const refreshedDeal = await window.electronAPI.invoke<Deal | null>('deals:get-by-id', Number(dealId));
        if (refreshedDeal) {
          setDeal(refreshedDeal);
          // Re-fetch products as well, as they might have changed in the dialog
          fetchDealProducts();
        }
        setIsLoading(false);
        return true; // Indicate success
      } else {
        console.error("Error updating deal:", result.error);
        setIsLoading(false);
        return false; // Indicate failure
      }
    } catch (error: any) { // Explicitly type error
      console.error("Error updating deal:", error);
      // Potentially show error message to user via toast or state
      setIsLoading(false);
      return false; // Indicate failure
    }
  };
  
  // Handle deleting the deal
  const handleDeleteDeal = async () => {
    if (!deal) return;
    setIsLoading(true);
    try {
      // First, attempt to delete associated products (optional, depends on desired cascade behavior)
      // If using ON DELETE CASCADE in DB schema, this might not be needed
      // const productLinks = await window.electronAPI.invoke<DealProductLink[]>('deals:get-products', deal.id);
      // for (const link of productLinks) {
      //   await window.electronAPI.invoke('deals:remove-product', { dealId: deal.id, productId: link.product_id });
      // }

      // Then, delete the deal itself (assuming DB handles cascade or products are removed)
      // NOTE: Need a 'deals:delete' handler in main.js and sqlite-service.ts
      // For now, we'll just navigate away as before, assuming deletion happens elsewhere or is not yet implemented
      // const deleteResult = await window.electronAPI.invoke('deals:delete', deal.id);
      // if (deleteResult.success) {
      //   navigate({ to: '/deals' });
      // } else {
      //   console.error("Failed to delete deal:", deleteResult.error);
      //   // Show error to user
      // }
      
      // TEMPORARY: Navigate away as the delete IPC handler isn't implemented yet
      console.warn("Deal deletion IPC handler not implemented. Navigating away.");
      navigate({ to: '/deals' });

    } catch (error: any) { // Explicitly type error
      console.error("Error deleting deal:", error);
      // Show error to user
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to format currency
  const formatCurrency = (amount: number | string | undefined): string => {
    const numAmount = Number(amount);
    if (isNaN(numAmount)) return '-';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(numAmount);
  };

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
                  <h3 className="mt-4 text-lg font-semibold">Deal not found</h3>
                  <p className="mb-4 mt-2 text-sm text-muted-foreground">
                    The deal you're looking for doesn't exist or you don't have access to it.
                  </p>
                  <Button asChild>
                    <Link to="/deals">Go back to deals</Link>
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

                {/* Tabs for Details, Products, Tasks */}
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
                    <TabsTrigger value="details">
                      <Info className="mr-1 h-4 w-4" /> Details
                    </TabsTrigger>
                    <TabsTrigger value="products">
                      <Package className="mr-1 h-4 w-4" /> Products
                    </TabsTrigger>
                    <TabsTrigger value="tasks">
                       <ListChecks className="mr-1 h-4 w-4" /> Tasks
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="details" className="mt-4 space-y-6">
                    <DealMetadata deal={deal} />
                    <DealNotes deal={deal} />
                  </TabsContent>
                  <TabsContent value="products" className="mt-4">
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
                              <TableHead className="text-right">Preis (bei Hinzufügen)</TableHead>
                              <TableHead className="text-right">Gesamt</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dealProducts.map((p) => (
                              <TableRow key={p.deal_product_id}>
                                <TableCell className="font-medium">{p.name}</TableCell>
                                <TableCell>{p.sku || '-'}</TableCell>
                                <TableCell className="text-right">{p.quantity}</TableCell>
                                <TableCell className="text-right">{formatCurrency(p.price_at_time_of_adding)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(p.quantity * p.price_at_time_of_adding)}</TableCell>
                              </TableRow>
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
                     {/* Placeholder for Tasks */}
                     <div className="rounded-lg border p-4">
                      <h4 className="mb-2 text-lg font-semibold">Tasks</h4>
                      <p className="text-sm text-muted-foreground">
                        Aufgaben im Zusammenhang mit diesem Deal werden hier angezeigt. (Funktionalität kommt bald)
                      </p>
                      {/* Example structure - replace with actual component */}
                      {/* <TaskList dealId={deal.id} /> */}
                     </div>
                  </TabsContent>
                </Tabs>
                
                {/* Edit Deal Dialog */}
                {deal && (
                  <EditDealDialog 
                    deal={deal} 
                    isOpen={isEditDialogOpen} 
                    onClose={() => setIsEditDialogOpen(false)}
                    onSave={handleEditDeal}
                  />
                )}
                
                {/* Delete Deal Confirmation */}
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

// Removed initialDeals constant as data is fetched via IPC

