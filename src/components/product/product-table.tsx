"use client"

import * as React from "react"
import { Product } from "@/types"
import { DataTable } from "@/components/ui/data-table" // Assuming generic DataTable exists
import { columns } from "./product-columns"
import { EditProductDialog } from "./edit-product-dialog" // Import Edit dialog

interface ProductTableProps {
  data: Product[];
  onProductUpdated: () => void; // Callback after successful update
  onProductDeleted: () => void; // Callback after successful deletion
}

export function ProductTable({ data, onProductUpdated, onProductDeleted }: ProductTableProps) {
  const [isEditDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);

  // Handler to open the edit dialog
  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setEditDialogOpen(true);
  };

  // Handler for deleting a product (calls IPC)
  const handleDelete = async (productId: number) => {
    try {
      console.log(`Invoking products:delete for ID: ${productId}`);
      const result = await window.electronAPI.invoke('products:delete', productId) as { success: boolean, error?: string };
      console.log('Delete result:', result);
      if (result.success) {
        onProductDeleted(); // Trigger refetch via callback
        // Optional: Show success toast/notification
      } else {
        console.error('Failed to delete product:', result.error);
        alert(`Fehler beim Löschen des Produkts: ${result.error}`); // Show error to user
      }
    } catch (err: any) {
      console.error('IPC Error deleting product:', err);
      alert(`Fehler beim Löschen des Produkts: ${err.message}`);
    }
  };

  // Define meta object to pass handlers to columns
  const meta = {
    onEdit: handleEdit,
    onDelete: handleDelete,
  }

  return (
    <div className="space-y-4">
      <DataTable columns={columns} data={data} meta={meta} /> 
      {/* Render Edit Dialog */} 
      {selectedProduct && (
        <EditProductDialog
          key={selectedProduct.id} // Ensure dialog re-renders when product changes
          product={selectedProduct}
          isOpen={isEditDialogOpen}
          onOpenChange={setEditDialogOpen}
          onProductUpdated={() => {
            onProductUpdated(); // Trigger refetch via callback
            setEditDialogOpen(false); // Close dialog on success
          }}
        />
      )}
    </div>
  )
} 