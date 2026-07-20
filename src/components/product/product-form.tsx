"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { type SubmitHandler, useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Product } from "@/types"

const formSchema = z.object({
  name: z.string().min(1, { message: "Produktname ist erforderlich." }),
  sku: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  price: z.number().min(0, { message: "Preis darf nicht negativ sein." }),
  isActive: z.boolean(),
});

export type ProductFormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  product?: Product | null;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  isSubmitting: boolean;
  submitButtonText?: string;
  onCancel?: () => void;
}

function getDefaultValues(product?: Product | null): ProductFormValues {
  return {
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    description: product?.description ?? "",
    price: product?.price ?? 0,
    isActive: product?.isActive ?? true,
  }
}

export function ProductForm({ 
  product, 
  onSubmit,
  isSubmitting,
  submitButtonText = "Speichern",
  onCancel
}: ProductFormProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(product),
    mode: "onChange",
  });

  const handleSubmit: SubmitHandler<ProductFormValues> = async (data) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Produktname *</FormLabel>
              <FormControl>
                <Input placeholder="z.B. SuperWidget Pro" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU (Artikelnummer)</FormLabel>
                <FormControl>
                  <Input placeholder="z.B. SWP-123" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Beschreibung</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Beschreiben Sie das Produkt..."
                  className="resize-none"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preis (€) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    value={field.value}
                    onChange={(event) => field.onChange(Number(event.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Produkt Aktiv
                </FormLabel>
                <FormDescription>
                  Aktive Produkte können ausgewählt und zu Deals hinzugefügt werden.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
           {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                  Abbrechen
              </Button>
           )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Wird gespeichert..." : submitButtonText}
          </Button>
        </div>
      </form>
    </Form>
  )
}
