"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, CheckCircle, XCircle, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Product } from "@/types" // Import the frontend Product type
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useState } from "react"

// Helper function to format currency
const formatCurrency = (amount: number) => {
  // Handle potential non-numeric inputs gracefully
  if (isNaN(amount)) {
    return '-';
  }
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
};

// Define the columns for the Product table
export const columns: ColumnDef<Product>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
        return (
          <div className="flex space-x-2">
            <span className="max-w-[500px] truncate font-medium">
              {row.getValue("name")}
            </span>
          </div>
        )
      },
  },
  {
    accessorKey: "sku",
    header: "Artikel-Nr.",
    cell: ({ row }) => row.getValue("sku") || '-', // Display '-' if SKU is null
  },
  {
    accessorKey: "price",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="justify-end w-full" // Align header text right using flex justify
        >
          Preis
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const price = parseFloat(row.getValue("price"))
      return <div className="text-right font-medium pr-4">{formatCurrency(price)}</div> // Added padding
    },
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("isActive")
      return (
        <Badge variant={isActive ? "default" : "secondary"} className="capitalize">
          {isActive ? <CheckCircle className="mr-1 h-3 w-3 text-green-500" /> : <XCircle className="mr-1 h-3 w-3 text-red-500" />}
          {isActive ? 'Aktiv' : 'Inaktiv'}
        </Badge>
      )
    },
    filterFn: (row, id, value) => { // Custom filter for boolean
        return value.includes(row.getValue(id))
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => { // Pass table meta to access handlers
      const product = row.original
      // Type assertion for meta - ensure handlers are passed correctly in ProductTable
      const meta = table.options.meta as { 
        onEdit: (product: Product) => void;
        onDelete: (productId: number) => Promise<void>; // Assuming delete is async
      };

      if (!meta || typeof meta.onEdit !== 'function' || typeof meta.onDelete !== 'function') {
         console.error("Table meta actions not passed correctly!");
         return null; // Or some placeholder error indicator
      }

      const [showDeleteDialog, setShowDeleteDialog] = useState(false);

      const handleDelete = async () => {
          setShowDeleteDialog(true);
      }

      return (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Menü öffnen</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Aktionen</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(product.name)}>
                Namen kopieren
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => meta.onEdit(product)}> 
                <Pencil className="mr-2 h-4 w-4" /> Bearbeiten
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-100" onClick={handleDelete}> 
                <Trash2 className="mr-2 h-4 w-4" /> Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Produkt löschen</AlertDialogTitle>
                <AlertDialogDescription>
                  Sind Sie sicher, dass Sie das Produkt "{product.name}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction 
                  className="bg-red-600 hover:bg-red-700" 
                  onClick={() => meta.onDelete(product.id)}
                >
                  Löschen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
] 
