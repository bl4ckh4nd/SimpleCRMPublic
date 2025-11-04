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
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface CustomerOption {
  id: number | string
  name: string
  customerNumber?: string
  email?: string
}

interface CustomerComboboxProps {
  value?: string | number
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  onCustomerSelect?: (customer: CustomerOption | null) => void
}

export function CustomerCombobox({
  value,
  onValueChange,
  placeholder = "Kunde auswählen...",
  disabled = false,
  onCustomerSelect
}: CustomerComboboxProps) {
  console.log(`🔍 [CustomerCombobox] Component initialized with value: ${value}`);
  
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [customers, setCustomers] = React.useState<CustomerOption[]>([])
  const [loading, setLoading] = React.useState(false)
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerOption | null>(null)

  // Load initial customers and search
  React.useEffect(() => {
    console.log(`🔍 [CustomerCombobox] useEffect triggered for searchQuery: "${searchQuery}"`);
    
    const searchCustomers = async () => {
      console.log(`🔍 [CustomerCombobox] Starting customer search for: "${searchQuery}"`);
      const startTime = Date.now();
      
      setLoading(true)
      try {
        console.log(`🔍 [CustomerCombobox] Calling db:search-customers with query: "${searchQuery}", limit: 50`);
        const results = await window.electronAPI.invoke<typeof IPCChannels.Db.SearchCustomers>(
          IPCChannels.Db.SearchCustomers,
          searchQuery,
          50
        ) as CustomerOption[]
        console.log(`🔍 [CustomerCombobox] Received ${results.length} customers in ${Date.now() - startTime}ms`);
        setCustomers(results)
      } catch (error) {
        console.error('🚨 [CustomerCombobox] Failed to search customers:', error)
      } finally {
        setLoading(false)
      }
    }

    // Debounce search
    const timeoutId = setTimeout(() => {
      console.log(`🔍 [CustomerCombobox] Debounce timeout reached, executing search...`);
      searchCustomers()
    }, searchQuery ? 300 : 0)

    return () => {
      console.log(`🔍 [CustomerCombobox] Cleaning up timeout for: "${searchQuery}"`);
      clearTimeout(timeoutId)
    }
  }, [searchQuery])

  // Load selected customer details if value is provided
  React.useEffect(() => {
    if (value && !selectedCustomer) {
      console.log(`🔍 [CustomerCombobox] Loading customer details for value: ${value}`);
      
      const loadCustomer = async () => {
        const startTime = Date.now();
        try {
          console.log(`🔍 [CustomerCombobox] Calling db:get-customer for ID: ${value}`);
          const customer = await window.electronAPI.invoke<typeof IPCChannels.Db.GetCustomer>(
            IPCChannels.Db.GetCustomer,
            value
          ) as any
          console.log(`🔍 [CustomerCombobox] Received customer details in ${Date.now() - startTime}ms:`, customer ? customer.name : 'null');
          
          if (customer) {
            const normalizedCustomer: CustomerOption = {
              id: customer.id,
              name: customer.name || customer.firstName || customer.company || 'Unknown',
              customerNumber: customer.customerNumber,
              email: customer.email
            }
            setSelectedCustomer(normalizedCustomer)
            onCustomerSelect?.(normalizedCustomer)
          }
        } catch (error) {
          console.error('🚨 [CustomerCombobox] Failed to load customer:', error)
        }
      }
      loadCustomer()
    }
  }, [value, selectedCustomer])

  const handleSelect = (customer: CustomerOption) => {
    setSelectedCustomer(customer)
    onValueChange(customer.id.toString())
    onCustomerSelect?.(customer)
    setOpen(false)
    setSearchQuery("")
  }

  React.useEffect(() => {
    if (!value) {
      setSelectedCustomer(null)
      onCustomerSelect?.(null)
    }
  }, [value, onCustomerSelect])

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
            {selectedCustomer ? selectedCustomer.name : placeholder}
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
              placeholder="Kunde suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <CommandList className="max-h-[250px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : customers.length === 0 ? (
              <CommandEmpty>
                {searchQuery ? "Keine Kunden gefunden." : "Geben Sie einen Suchbegriff ein..."}
              </CommandEmpty>
            ) : (
              <CommandGroup className="p-1">
                {customers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={customer.id.toString()}
                    onSelect={() => handleSelect(customer)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === customer.id || value === customer.id.toString()
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{customer.name}</div>
                      {(customer.customerNumber || customer.email) && (
                        <div className="text-xs text-muted-foreground truncate">
                          {customer.customerNumber && `Nr: ${customer.customerNumber}`}
                          {customer.customerNumber && customer.email && " • "}
                          {customer.email}
                        </div>
                      )}
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
