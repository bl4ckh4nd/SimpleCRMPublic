"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { Loader2 } from "lucide-react"
import { customFieldService } from "@/services/data/customFieldService"
import { CustomField, CustomFieldOption } from "@/services/data/types"
import { UseFormReturn } from "react-hook-form"

interface CustomFieldsFormProps {
  customerId?: string | number
  form?: UseFormReturn<any>
  formData?: Record<string, any>
  onChange?: (field: string, value: any) => void
  className?: string
}

export function CustomFieldsForm({
  customerId,
  form,
  formData,
  onChange,
  className = ""
}: CustomFieldsFormProps) {
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadCustomFields = async () => {
      setIsLoading(true)
      try {
        const fields = await customFieldService.getActiveCustomFields()
        setCustomFields(fields)
      } catch (error) {
        console.error("Failed to load custom fields:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadCustomFields()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Loading custom fields...</span>
      </div>
    )
  }

  if (customFields.length === 0) {
    return null
  }

  // Parse options for select fields
  const parseOptions = (optionsString?: string): CustomFieldOption[] => {
    if (!optionsString) return []
    
    try {
      return JSON.parse(optionsString)
    } catch (error) {
      console.error("Failed to parse options:", error)
      return []
    }
  }

  // Render field based on type
  const renderField = (field: CustomField) => {
    const fieldName = `customFields.${field.name}`
    const fieldValue = formData?.customFields?.[field.name] || field.default_value || ""
    
    // If using React Hook Form
    if (form) {
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>{field.label}{field.required ? " *" : ""}</FormLabel>
              <FormControl>
                {renderFormControl(field, formField)}
              </FormControl>
              {field.description && (
                <FormDescription>{field.description}</FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      )
    }
    
    // If using controlled components
    return (
      <div key={field.id} className="grid gap-2">
        <Label htmlFor={`custom-${field.name}`}>
          {field.label}{field.required ? " *" : ""}
        </Label>
        {renderControlledField(field, fieldValue)}
        {field.description && (
          <p className="text-sm text-muted-foreground">{field.description}</p>
        )}
      </div>
    )
  }

  // Render form control for React Hook Form
  const renderFormControl = (field: CustomField, formField: any) => {
    switch (field.type) {
      case "text":
        return (
          <Input
            {...formField}
            placeholder={field.placeholder}
          />
        )
      case "number":
        return (
          <Input
            {...formField}
            type="number"
            placeholder={field.placeholder}
          />
        )
      case "date":
        return (
          <Input
            {...formField}
            type="date"
            placeholder={field.placeholder}
          />
        )
      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`custom-${field.name}`}
              checked={formField.value}
              onCheckedChange={formField.onChange}
            />
            <label
              htmlFor={`custom-${field.name}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {field.placeholder || "Yes"}
            </label>
          </div>
        )
      case "select":
        const options = parseOptions(field.options)
        return (
          <Select
            onValueChange={formField.onChange}
            defaultValue={formField.value}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      default:
        return (
          <Input
            {...formField}
            placeholder={field.placeholder}
          />
        )
    }
  }

  // Render controlled field
  const renderControlledField = (field: CustomField, value: any) => {
    const handleChange = (newValue: any) => {
      if (onChange) {
        onChange(`customFields.${field.name}`, newValue)
      }
    }

    switch (field.type) {
      case "text":
        return (
          <Input
            id={`custom-${field.name}`}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
          />
        )
      case "number":
        return (
          <Input
            id={`custom-${field.name}`}
            type="number"
            value={value}
            onChange={(e) => handleChange(e.target.valueAsNumber)}
            placeholder={field.placeholder}
          />
        )
      case "date":
        return (
          <Input
            id={`custom-${field.name}`}
            type="date"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
          />
        )
      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`custom-${field.name}`}
              checked={value === true}
              onCheckedChange={(checked) => handleChange(checked)}
            />
            <label
              htmlFor={`custom-${field.name}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {field.placeholder || "Yes"}
            </label>
          </div>
        )
      case "select":
        const options = parseOptions(field.options)
        return (
          <Select
            value={value}
            onValueChange={handleChange}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      default:
        return (
          <Input
            id={`custom-${field.name}`}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
          />
        )
    }
  }

  return (
    <div className={className}>
      <h3 className="text-lg font-medium mb-4">Custom Fields</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {customFields.map(renderField)}
      </div>
    </div>
  )
}
