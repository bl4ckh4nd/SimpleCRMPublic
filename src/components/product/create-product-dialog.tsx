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
import { IPCChannels } from '@shared/ipc/channels';

interface CreateProductDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onProductCreated: () => void;
}

export function CreateProductDialog({ isOpen, onOpenChange, onProductCreated }: CreateProductDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (values: ProductFormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const dataToSend = {
        ...values,
        sku: values.sku || null, 
        description: values.description || null,
      };
      const result = await window.electronAPI.invoke(
        IPCChannels.Products.Create,
        dataToSend
      ) as { success: boolean, error?: string };
      if (result.success) {
        onProductCreated();
        onOpenChange(false);
      } else {
        setError(result.error || 'Ein unbekannter Fehler ist aufgetreten.');
      }
    } catch (err: unknown) {
      console.error('Error creating product:', err);
      setError(err instanceof Error ? err.message : 'Produkt konnte nicht erstellt werden.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Neues Produkt erstellen</DialogTitle>
          <DialogDescription>
            Füllen Sie die Details für das neue Produkt aus. Mit * markierte Felder sind erforderlich.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm font-medium text-destructive">Fehler: {error}</p>}
        <ProductForm 
          onSubmit={handleSubmit} 
          isSubmitting={isSubmitting}
          submitButtonText="Produkt erstellen"
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
} 
