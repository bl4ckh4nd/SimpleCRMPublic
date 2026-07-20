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

interface CustomerRecord {
  id: number | string
  name?: string
  firstName?: string
  company?: string
  customerNumber?: string
  email?: string
}

const SEARCH_DELAY_MS = 300

function normalizeCustomer(customer: CustomerRecord): CustomerOption {
  return {
    id: customer.id,
    name: customer.name || customer.firstName || customer.company || "Unknown",
    customerNumber: customer.customerNumber,
    email: customer.email,
  }
}

function matchesSelectedValue(
  optionId: CustomerOption["id"] | null | undefined,
  value: string | number | undefined
) {
  return value !== undefined && optionId !== undefined && String(optionId) === String(value)
}

export function CustomerCombobox({
  value,
  onValueChange,
  placeholder = "Kunde auswählen...",
  disabled = false,
  onCustomerSelect
}: CustomerComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [customers, setCustomers] = React.useState<CustomerOption[]>([])
  const [loading, setLoading] = React.useState(false)
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerOption | null>(null)

  React.useEffect(() => {
    let cancelled = false

    const timeoutId = window.setTimeout(async () => {
      setLoading(true)
      try {
        const results = await window.electronAPI.invoke(
          IPCChannels.Db.SearchCustomers,
          { query: searchQuery }
        ) as unknown as CustomerOption[]

        if (!cancelled) {
          setCustomers(results)
        }
      } catch (error) {
        console.error("[CustomerCombobox] Failed to search customers:", error)
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
    if (value === undefined) {
      setSelectedCustomer(null)
      onCustomerSelect?.(null)
      return
    }

    if (matchesSelectedValue(selectedCustomer?.id, value)) {
      return
    }

    let cancelled = false

    const loadCustomer = async () => {
      try {
        const customer = await window.electronAPI.invoke(
          IPCChannels.Db.GetCustomer,
          Number(value)
        ) as unknown as CustomerRecord | null

        if (!customer || cancelled) {
          return
        }

        const normalizedCustomer = normalizeCustomer(customer)
        setSelectedCustomer(normalizedCustomer)
        onCustomerSelect?.(normalizedCustomer)
      } catch (error) {
        if (!cancelled) {
          console.error("[CustomerCombobox] Failed to load customer:", error)
        }
      }
    }

    void loadCustomer()

    return () => {
      cancelled = true
    }
  }, [value, selectedCustomer?.id, onCustomerSelect])

  const handleSelect = (customer: CustomerOption) => {
    setSelectedCustomer(customer)
    onValueChange(customer.id.toString())
    onCustomerSelect?.(customer)
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
                            matchesSelectedValue(customer.id, value)
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
