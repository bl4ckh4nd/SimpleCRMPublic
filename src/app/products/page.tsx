"use client";

import React, { useState, useEffect } from 'react';
import { PlusCircle, Package, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductTable } from '@/components/product/product-table';
import { CreateProductDialog } from '@/components/product/create-product-dialog';
import { Product } from '@/types'; // Assuming Product type will be defined in src/types/index.ts
import { IPCChannels } from '@shared/ipc/channels';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!window.electronAPI?.invoke) {
        throw new Error('Electron API nicht verfügbar. Bitte starten Sie die Anwendung neu.');
      }
      const fetchedProducts = await window.electronAPI.invoke(
        IPCChannels.Products.GetAll
      ) as Product[];
      // Ensure isActive is boolean (it comes as 0/1 from SQLite)
      const mappedProducts = fetchedProducts.map((p) => ({
        ...p,
        isActive: Boolean(p.isActive),
      }));
      setProducts(mappedProducts);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message || 'Produkte konnten nicht geladen werden.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
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


  if (isLoading) {
    return (
      <main className="flex-1">
        <div className="px-6 py-4">
          <div className="flex justify-center items-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Produkte werden geladen...</span>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1">
        <div className="px-6 py-4">
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Produkte konnten nicht geladen werden
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={fetchProducts}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Erneut versuchen
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1">
    <div className="px-6 py-4">
      {/* Render ProductTable */}
      <ProductTable
          data={products}
          actions={
            <Button onClick={() => setCreateDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Neues Produkt
            </Button>
          }
          onProductUpdated={handleProductUpdated}
          onProductDeleted={handleProductDeleted}
      /> 

      {/* Render CreateProductDialog */}
      <CreateProductDialog 
        isOpen={isCreateDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        onProductCreated={handleProductCreated} 
      /> 

    </div>
    </main>
  );
}
