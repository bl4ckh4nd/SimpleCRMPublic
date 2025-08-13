"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Product {
  id: number | string
  name: string
  price: number
  description?: string
  productNumber?: string
}

interface ProductComboboxProps {
  value?: string | number | null
  onValueChange: (value: string | null) => void
  placeholder?: string
  disabled?: boolean
}

const formatCurrency = (amount: number): string => {
  if (isNaN(amount)) return '-';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
};

export function ProductCombobox({
  value,
  onValueChange,
  placeholder = "Produkt auswählen...",
  disabled = false
}: ProductComboboxProps) {
  console.log(`🔍 [ProductCombobox] Component initialized with value: ${value}`);
  
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [products, setProducts] = React.useState<Product[]>([])
  const [loading, setLoading] = React.useState(false)
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null)

  // Load products with search
  React.useEffect(() => {
    console.log(`🔍 [ProductCombobox] useEffect triggered for searchQuery: "${searchQuery}"`);
    
    const searchProducts = async () => {
      console.log(`🔍 [ProductCombobox] Starting product search for: "${searchQuery}"`);
      const startTime = Date.now();
      
      setLoading(true)
      try {
        console.log(`🔍 [ProductCombobox] Calling products:search with query: "${searchQuery}", limit: 50`);
        const results = await window.electronAPI.invoke('products:search', searchQuery, 50) as Product[]
        console.log(`🔍 [ProductCombobox] Received ${results.length} products in ${Date.now() - startTime}ms`);
        setProducts(results.filter(p => (p as any).isActive !== false))
      } catch (error) {
        console.error('🚨 [ProductCombobox] Failed to search products:', error)
        // Fallback to get-all if search doesn't exist
        try {
          console.log(`🔍 [ProductCombobox] Falling back to products:get-all`);
          const allProducts = await window.electronAPI.invoke('products:get-all') as Product[]
          const filteredProducts = allProducts
            .filter(p => (p as any).isActive !== false)
            .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .slice(0, 50)
          console.log(`🔍 [ProductCombobox] Fallback: Received ${filteredProducts.length} products`);
          setProducts(filteredProducts)
        } catch (fallbackError) {
          console.error('🚨 [ProductCombobox] Fallback also failed:', fallbackError)
          setProducts([])
        }
      } finally {
        setLoading(false)
      }
    }

    // Debounce search
    const timeoutId = setTimeout(() => {
      console.log(`🔍 [ProductCombobox] Debounce timeout reached, executing search...`);
      searchProducts()
    }, searchQuery ? 300 : 0)

    return () => {
      console.log(`🔍 [ProductCombobox] Cleaning up timeout for: "${searchQuery}"`);
      clearTimeout(timeoutId)
    }
  }, [searchQuery])

  // Load selected product details if value is provided
  React.useEffect(() => {
    if (value && !selectedProduct) {
      console.log(`🔍 [ProductCombobox] Loading product details for value: ${value}`);
      
      const loadProduct = async () => {
        const startTime = Date.now();
        try {
          console.log(`🔍 [ProductCombobox] Calling products:get-by-id for ID: ${value}`);
          const product = await window.electronAPI.invoke('products:get-by-id', value) as any
          console.log(`🔍 [ProductCombobox] Received product details in ${Date.now() - startTime}ms:`, product ? product.name : 'null');
          
          if (product) {
            setSelectedProduct({
              id: product.id,
              name: product.name,
              price: product.price || 0,
              description: product.description,
              productNumber: product.productNumber
            })
          }
        } catch (error) {
          console.error('🚨 [ProductCombobox] Failed to load product:', error)
        }
      }
      loadProduct()
    }
  }, [value, selectedProduct])

  const handleSelect = (product: Product) => {
    setSelectedProduct(product)
    onValueChange(product.id.toString())
    setOpen(false)
    setSearchQuery("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="truncate">
            {selectedProduct ? selectedProduct.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] max-w-[400px] max-h-[350px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Produkt suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <CommandList className="max-h-[250px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <CommandEmpty>
                {searchQuery ? "Keine Produkte gefunden." : "Geben Sie einen Suchbegriff ein..."}
              </CommandEmpty>
            ) : (
              <CommandGroup className="p-1">
                {products.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={product.id.toString()}
                    onSelect={() => handleSelect(product)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === product.id || value === product.id.toString()
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{product.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {formatCurrency(product.price)}
                        {product.productNumber && ` • Nr: ${product.productNumber}`}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}