"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ProductForm, type ProductFormValues } from "./product-form"
import { Product } from "@/types"
import { IPCChannels } from '@shared/ipc/channels';

interface EditProductDialogProps {
  product: Product | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onProductUpdated: () => void;
}

export function EditProductDialog({ product, isOpen, onOpenChange, onProductUpdated }: EditProductDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (values: ProductFormValues) => {
    if (!product) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const dataToSend = {
        ...values,
        sku: values.sku || null,
        description: values.description || null,
      };
      const result = await window.electronAPI.invoke(
        IPCChannels.Products.Update,
        { id: product.id, productData: dataToSend }
      ) as { success: boolean, error?: string };
      if (result.success) {
        onProductUpdated();
        onOpenChange(false);
      } else {
        setError(result.error || 'Ein unbekannter Fehler ist aufgetreten.');
      }
    } catch (err: unknown) {
      console.error('Error updating product:', err);
      setError(err instanceof Error ? err.message : 'Produkt konnte nicht aktualisiert werden.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          product={product}
          onSubmit={handleSubmit} 
          isSubmitting={isSubmitting}
          submitButtonText="Änderungen speichern"
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
} 
