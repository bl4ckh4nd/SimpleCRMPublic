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
  DialogTrigger,
} from "@/components/ui/dialog"
import { ProductForm } from "./product-form"
import { IPCChannels } from '@shared/ipc/channels';

interface CreateProductDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onProductCreated: () => void; // Callback to refetch data
}

export function CreateProductDialog({ isOpen, onOpenChange, onProductCreated }: CreateProductDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    setError(null);
    try {
      console.log('Invoking products:create with values:', values);
      // Ensure SKU and description are null if empty strings
      const dataToSend = {
        ...values,
        sku: values.sku || null, 
        description: values.description || null,
      };
      const result = await window.electronAPI.invoke<typeof IPCChannels.Products.Create>(
        IPCChannels.Products.Create,
        dataToSend
      ) as { success: boolean, error?: string };
      console.log('Create result:', result);
      if (result.success) {
        onProductCreated(); // Call callback to refetch
        onOpenChange(false); // Close dialog
        // Optional: Show success toast
      } else {
        setError(result.error || 'Ein unbekannter Fehler ist aufgetreten.');
      }
    } catch (err: any) {
      console.error('Error creating product:', err);
      setError(err.message || 'Produkt konnte nicht erstellt werden.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* Optional: If triggered by a button elsewhere, DialogTrigger isn't needed here 
      <DialogTrigger asChild>
        <Button>Neues Produkt</Button>
      </DialogTrigger> 
      */}
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
          onCancel={() => onOpenChange(false)} // Add cancel handler
        />
        {/* Footer removed as submit/cancel are now part of ProductForm */}
      </DialogContent>
    </Dialog>
  )
} 
