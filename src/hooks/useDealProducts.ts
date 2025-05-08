import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Product, DealProductLink } from '@/types';
import { handleApiError } from '@/lib/api-error-handler';

export function useDealProducts(dealId: number | undefined) {
  const { toast } = useToast(); // Keep for success toasts
  const [dealProducts, setDealProducts] = useState<DealProductLink[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState<boolean>(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  const fetchDealProducts = useCallback(async () => {
    if (!dealId) {
      setDealProducts([]);
      setIsProductsLoading(false);
      setProductsError(null);
      return;
    }
    setIsProductsLoading(true);
    setProductsError(null);
    try {
      if (window.electronAPI?.invoke) {
        const products = await window.electronAPI.invoke<DealProductLink[]>('deals:get-products', dealId);
        setDealProducts(products || []);
      } else {
        console.error("window.electronAPI or invoke method not found for deals:get-products.");
        console.error("window.electronAPI or invoke method not found for deals:get-products.");
        handleApiError(null, "Produkte laden", "API nicht verfügbar.");
        setProductsError("API nicht verfügbar."); // Still set local error state if needed for UI
        setDealProducts([]);
      }
    } catch (err: any) {
      handleApiError(err, "Produkte laden");
      setProductsError(err.message || "Fehler beim Laden der Produkte."); // Still set local error state
      setDealProducts([]);
    } finally {
      setIsProductsLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    fetchDealProducts();
  }, [fetchDealProducts]);

  const handleAddProductToDeal = async (productId: number, quantity: number, price: number): Promise<boolean> => {
    if (!dealId) {
      toast({ variant: "destructive", title: "Fehler", description: "Deal ID nicht gefunden." });
      return false;
    }
    // Consider adding a specific loading state for this action if granular feedback is needed
    // For now, relies on the general isProductsLoading for table refresh indication
    try {
      if (!window.electronAPI?.invoke) {
        throw new Error("API not available for adding product.");
      }
      const result = await window.electronAPI.invoke<{ success: boolean; dealProduct?: DealProductLink; error?: string }>(
        'deals:add-product',
        { dealId, productId, quantity, price }
      );
      if (result.success) { // Check only for success flag from backend
        toast({ title: "Erfolg", description: "Produkt erfolgreich zum Deal hinzugefügt." });
        fetchDealProducts(); // Refresh products list
        return true;
      } else {
        // If success is false, then there should be an error message
        handleApiError(result.error || "Unbekannter Fehler", "Produkt hinzufügen", "Produkt konnte nicht hinzugefügt werden.");
        return false;
      }
    } catch (error: any) {
      handleApiError(error, "Produkt hinzufügen", "Produkt konnte nicht hinzugefügt werden.");
      return false;
    }
  };

  const handleUpdateDealProduct = async (dealProductId: number, newQuantity: number, newPrice: number): Promise<void> => {
    if (newQuantity <= 0 || newPrice < 0) {
        toast({ variant: "destructive", title: "Ungültige Eingabe", description: "Menge muss größer 0 und Preis darf nicht negativ sein." });
        fetchDealProducts(); // Re-fetch to revert optimistic UI or reset inputs
        return;
    }
    try {
        if (!window.electronAPI?.invoke) {
            throw new Error("API not available for updating product.");
        }
        const result = await window.electronAPI.invoke<{ success: boolean; dealProduct?: DealProductLink; error?: string }>(
            'deals:update-product',
            { dealProductId, quantity: newQuantity, price: newPrice }
        );
        if (result.success && result.dealProduct) {
            toast({ title: "Aktualisiert", description: "Produkt im Deal aktualisiert." });
            fetchDealProducts();
        } else {
            handleApiError(result.error, "Produkt aktualisieren", "Produkt konnte nicht aktualisiert werden.");
            fetchDealProducts(); // Re-fetch to ensure UI consistency
        }
    } catch (error: any) {
        handleApiError(error, "Produkt aktualisieren", "Produkt konnte nicht aktualisiert werden.");
        fetchDealProducts(); // Re-fetch to ensure UI consistency
    }
  };

  const handleRemoveDealProduct = async (dealProductId: number): Promise<void> => {
    try {
        if (!window.electronAPI?.invoke) {
            throw new Error("API not available for removing product.");
        }
        const result = await window.electronAPI.invoke<{ success: boolean; error?: string }>(
            'deals:remove-product',
            { dealProductId }
        );
        if (result.success) {
            toast({ title: "Entfernt", description: "Produkt aus Deal entfernt." });
            fetchDealProducts();
        } else {
            handleApiError(result.error, "Produkt entfernen", "Produkt konnte nicht entfernt werden.");
        }
    } catch (error: any) {
        handleApiError(error, "Produkt entfernen", "Produkt konnte nicht entfernt werden.");
    }
  };

  return {
    dealProducts,
    isProductsLoading,
    productsError,
    fetchDealProducts, // Exposing fetch in case parent component needs to trigger manually
    handleAddProductToDeal,
    handleUpdateDealProduct,
    handleRemoveDealProduct,
  };
}