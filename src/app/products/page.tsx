"use client";

import { useState, useEffect, useRef } from 'react';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductTable } from '@/components/product/product-table';
import { CreateProductDialog } from '@/components/product/create-product-dialog';
import { Product } from '@/types'; // Assuming Product type will be defined in src/types/index.ts
import { IPCChannels } from '@shared/ipc/channels';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from '@/components/page-header';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);

  const readGeneration = useRef(0);
  const fetchProducts = async () => {
    const generation = ++readGeneration.current;
    setIsLoading(true);
    setError(null);
    try {
      if (!window.electronAPI?.invoke) {
        throw new Error('Electron API nicht verfügbar. Bitte starten Sie die Anwendung neu.');
      }
      const fetchedProducts = await window.electronAPI.invoke(
        IPCChannels.Products.GetAll
      ) as unknown as Product[];
      // Ensure isActive is boolean (it comes as 0/1 from SQLite)
      const mappedProducts = fetchedProducts.map((p) => ({
        ...p,
        isActive: Boolean(p.isActive),
      }));
      if (generation === readGeneration.current) setProducts(mappedProducts);
    } catch (err: unknown) {
      console.error('Error fetching products:', err);
      if (generation === readGeneration.current) setError(err instanceof Error ? err.message : 'Produkte konnten nicht geladen werden.');
    } finally {
      if (generation === readGeneration.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    return () => { readGeneration.current++; };
  }, []);

  const handleProductCreated = () => {
    fetchProducts(); // Refetch products after creation
  };

  const handleProductUpdated = () => {
    fetchProducts(); // Refetch products after update
  };

  const handleProductDeleted = () => {
    fetchProducts(); // Refetch products after deletion
  };



  return (
    <main className="flex-1">
    <div className="px-4 py-4 sm:px-6">
      <PageHeader
        title="Produkte"
        subtitle="Produkte und Preise für Deals verwalten."
        actions={<Button onClick={() => setCreateDialogOpen(true)}><PlusCircle /> Neues Produkt</Button>}
      />
      {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}<Button variant="outline" size="sm" disabled={isLoading} onClick={fetchProducts}>Erneut versuchen</Button></AlertDescription></Alert>}
      {isLoading && <p role="status" className="flex items-center gap-2 py-4 text-muted-foreground"><RefreshCw className="size-4 animate-spin" />Produkte werden geladen…</p>}
      {(products.length > 0 || (!error && !isLoading)) && <ProductTable
          data={products}
          onProductUpdated={handleProductUpdated}
          onProductDeleted={handleProductDeleted}
      />}

      <CreateProductDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onProductCreated={handleProductCreated}
      />

    </div>
    </main>
  );
}
