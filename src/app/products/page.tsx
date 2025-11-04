"use client";

import React, { useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      console.log('Invoking products:get-all');
      const fetchedProducts = await window.electronAPI.invoke<typeof IPCChannels.Products.GetAll>(
        IPCChannels.Products.GetAll
      ) as Product[];
      console.log('Fetched products:', fetchedProducts);
      // Ensure isActive is boolean (it comes as 0/1 from SQLite)
      const mappedProducts = fetchedProducts.map((p) => ({
        ...p,
        isActive: Boolean(p.isActive),
      }));
      setProducts(mappedProducts);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message || 'Failed to fetch products');
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
    // The router should handle showing the loading.tsx component,
    // but we can keep a simple loader here as fallback or if needed.
    return <div>Loading products...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Produktliste</h1>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Neues Produkt erstellen
        </Button>
      </div>

      {/* Render ProductTable */}
      <ProductTable 
          data={products} 
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
  );
} 
