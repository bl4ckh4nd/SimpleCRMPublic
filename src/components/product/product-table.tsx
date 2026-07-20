"use client"

import * as React from "react"
import { Product } from "@/types"
import { DataTable } from "@/components/ui/data-table"
import { columns } from "./product-columns"
import { EditProductDialog } from "./edit-product-dialog"
import { IPCChannels } from '@shared/ipc/channels';

interface ProductTableProps {
  data: Product[];
  actions?: React.ReactNode;
  onProductUpdated: () => void;
  onProductDeleted: () => void;
}

export function ProductTable({ data, actions, onProductUpdated, onProductDeleted }: ProductTableProps) {
  const [isEditDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setEditDialogOpen(true);
  };

  const handleDelete = async (productId: number) => {
    try {
      const result = await window.electronAPI.invoke(
        IPCChannels.Products.Delete,
        productId
      ) as { success: boolean, error?: string };
      if (result.success) {
        onProductDeleted();
      } else {
        console.error('Failed to delete product:', result.error);
        alert(`Fehler beim Löschen des Produkts: ${result.error}`);
      }
    } catch (err: unknown) {
      console.error('IPC Error deleting product:', err);
      alert(`Fehler beim Löschen des Produkts: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const meta = {
    onEdit: handleEdit,
    onDelete: handleDelete,
  }

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={data}
        meta={meta}
        actions={actions}
        searchKeys={['name', 'sku', 'description']}
        searchPlaceholder='Suche nach Name, Artikel-Nr. oder Beschreibung...'
      />
      {selectedProduct && (
        <EditProductDialog
          key={selectedProduct.id}
          product={selectedProduct}
          isOpen={isEditDialogOpen}
          onOpenChange={setEditDialogOpen}
          onProductUpdated={() => {
            onProductUpdated();
            setEditDialogOpen(false);
          }}
        />
      )}
    </div>
  )
} 
