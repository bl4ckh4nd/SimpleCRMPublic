"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ProductForm } from "./product-form"
import { Product } from "@/types"
import { IPCChannels } from '@shared/ipc/channels';

interface EditProductDialogProps {
  product: Product | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onProductUpdated: () => void; // Callback to refetch data
}

export function EditProductDialog({ product, isOpen, onOpenChange, onProductUpdated }: EditProductDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (values: any) => {
    if (!product) return; // Should not happen if dialog is open with a product

    setIsSubmitting(true);
    setError(null);
    try {
      console.log(`Invoking products:update for ID ${product.id} with values:`, values);
      // Ensure SKU and description are null if empty strings
      const dataToSend = {
        ...values,
        sku: values.sku || null,
        description: values.description || null,
      };
      const result = await window.electronAPI.invoke<typeof IPCChannels.Products.Update>(
        IPCChannels.Products.Update,
        { id: product.id, productData: dataToSend }
      ) as { success: boolean, error?: string };
      console.log('Update result:', result);
      if (result.success) {
        onProductUpdated(); // Call callback to refetch
        onOpenChange(false); // Close dialog
        // Optional: Show success toast
      } else {
        setError(result.error || 'Ein unbekannter Fehler ist aufgetreten.');
      }
    } catch (err: any) {
      console.error('Error updating product:', err);
      setError(err.message || 'Produkt konnte nicht aktualisiert werden.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If no product is provided, don't render the dialog content
  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Produkt bearbeiten: {product.name}</DialogTitle>
          <DialogDescription>
            Ändern Sie die Details für das Produkt. Mit * markierte Felder sind erforderlich.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm font-medium text-destructive">Fehler: {error}</p>}
        <ProductForm 
          product={product} // Pass product data to pre-fill the form
          onSubmit={handleSubmit} 
          isSubmitting={isSubmitting}
          submitButtonText="Änderungen speichern"
          onCancel={() => onOpenChange(false)} // Add cancel handler
        />
      </DialogContent>
    </Dialog>
  )
} 
