"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { IPCChannels } from '@shared/ipc/channels';
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
  sku?: string
  productNumber?: string
}

interface ProductComboboxProps {
  value?: string | number | null
  onValueChange: (value: string | null) => void
  placeholder?: string
  disabled?: boolean
}

interface ProductRecord {
  id: number | string
  name?: string | null
  price?: number | string | null
  description?: string
  sku?: string | null
  productNumber?: string | null
  isActive?: boolean
}

const SEARCH_DELAY_MS = 300
const SEARCH_LIMIT = 50

const formatCurrency = (amount: number): string => {
  if (isNaN(amount)) return '-';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
};

function isActiveProduct(product: ProductRecord) {
  return product.isActive !== false
}

function normalizeProduct(product: ProductRecord): Product {
  return {
    id: product.id,
    name: product.name ?? 'Unbenanntes Produkt',
    price: typeof product.price === 'number' ? product.price : Number(product.price) || 0,
    description: product.description,
    sku: product.sku ?? undefined,
    productNumber: product.productNumber ?? product.sku ?? undefined,
  }
}

function matchesSearch(product: ProductRecord, query: string) {
  if (!query) {
    return true
  }

  const normalizedQuery = query.toLowerCase()
  const lowerName = (product.name ?? '').toLowerCase()
  const lowerSku = (product.sku ?? '').toLowerCase()
  return lowerName.includes(normalizedQuery) || lowerSku.includes(normalizedQuery)
}

function matchesSelectedValue(
  optionId: Product["id"] | null | undefined,
  value: string | number | null | undefined
) {
  return value != null && optionId !== undefined && String(optionId) === String(value)
}

export function ProductCombobox({
  value,
  onValueChange,
  placeholder = "Produkt auswählen...",
  disabled = false
}: ProductComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [products, setProducts] = React.useState<Product[]>([])
  const [loading, setLoading] = React.useState(false)
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null)

  React.useEffect(() => {
    let cancelled = false

    const timeoutId = window.setTimeout(async () => {
      setLoading(true)
      try {
        const results = await window.electronAPI.invoke(
          IPCChannels.Products.Search,
          { query: searchQuery, limit: SEARCH_LIMIT }
        ) as unknown as ProductRecord[]

        if (!cancelled) {
          setProducts(results.filter(isActiveProduct).map(normalizeProduct))
        }
      } catch (error) {
        console.error("[ProductCombobox] Failed to search products:", error)

        try {
          const allProducts = await window.electronAPI.invoke(
            IPCChannels.Products.GetAll
          ) as unknown as ProductRecord[]

          if (!cancelled) {
            setProducts(
              allProducts
                .filter(isActiveProduct)
                .filter((product) => matchesSearch(product, searchQuery))
                .slice(0, SEARCH_LIMIT)
                .map(normalizeProduct)
            )
          }
        } catch (fallbackError) {
          console.error("[ProductCombobox] Fallback also failed:", fallbackError)
          if (!cancelled) {
            setProducts([])
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }, searchQuery ? SEARCH_DELAY_MS : 0)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [searchQuery])

  React.useEffect(() => {
    if (value == null) {
      setSelectedProduct(null)
      return
    }

    if (matchesSelectedValue(selectedProduct?.id, value)) {
      return
    }

    let cancelled = false

    const loadProduct = async () => {
      try {
        const product = await window.electronAPI.invoke(
          IPCChannels.Products.GetById,
          Number(value)
        ) as unknown as ProductRecord | null

        if (!product || cancelled) {
          return
        }

        setSelectedProduct(normalizeProduct(product))
      } catch (error) {
        if (!cancelled) {
          console.error("[ProductCombobox] Failed to load product:", error)
        }
      }
    }

    void loadProduct()

    return () => {
      cancelled = true
    }
  }, [value, selectedProduct?.id])

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
                            matchesSelectedValue(product.id, value)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{product.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {formatCurrency(product.price)}
                        {(product.sku ?? product.productNumber) && ` • Nr: ${product.sku ?? product.productNumber}`}
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
