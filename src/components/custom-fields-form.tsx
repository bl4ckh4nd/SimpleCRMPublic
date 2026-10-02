"use client"

import { type ComponentProps, useEffect, useState, useRef } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
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
import { type ControllerRenderProps, type FieldValues, type UseFormReturn } from "react-hook-form"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

type CustomFieldValue = unknown

interface CustomFieldsFormProps {
  onLoadStateChange?: (state: "loading" | "ready" | "error") => void
  customerId?: string | number
  form?: UseFormReturn<FieldValues>
  formData?: { customFields?: Record<string, CustomFieldValue> }
  onChange?: (field: string, value: CustomFieldValue) => void
  className?: string
}

type InputProps = ComponentProps<typeof Input>
type SelectProps = Pick<
  ComponentProps<typeof Select>,
  "defaultValue" | "onValueChange" | "value"
>

function parseOptions(optionsString?: string): CustomFieldOption[] {
  if (!optionsString) return []

  try {
    return JSON.parse(optionsString)
  } catch (error) {
    console.error("Failed to parse options:", error)
    return []
  }
}

function getFieldLabel(field: CustomField) {
  return `${field.label}${field.required ? " *" : ""}`
}

function renderTextLikeField(field: CustomField, inputProps: InputProps) {
  const inputType =
    field.type === "number" ? "number" : field.type === "date" ? "date" : undefined

  return (
    <Input
      {...inputProps}
      type={inputType}
      placeholder={field.placeholder}
    />
  )
}

function renderBooleanField(
  field: CustomField,
  {
    checked,
    id,
    onCheckedChange,
  }: {
    checked: ComponentProps<typeof Checkbox>["checked"]
    id: string
    onCheckedChange: ComponentProps<typeof Checkbox>["onCheckedChange"]
  }
) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
      <label
        htmlFor={id}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {field.placeholder || "Ja"}
      </label>
    </div>
  )
}

function renderSelectField(field: CustomField, selectProps: SelectProps) {
  const options = parseOptions(field.options)

  return (
    <Select {...selectProps}>
      <SelectTrigger id={`custom-${field.name}`} aria-label={getFieldLabel(field)}>
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
}

export function CustomFieldsForm({
  form,
  onLoadStateChange,
  formData,
  onChange,
  className = ""
}: CustomFieldsFormProps) {
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  const stateCallback = useRef(onLoadStateChange)
  stateCallback.current = onLoadStateChange

  useEffect(() => {
    let cancelled = false
    const loadCustomFields = async () => {
      setIsLoading(true)
      setError(false)
      stateCallback.current?.("loading")
      try {
        const fields = await customFieldService.getActiveCustomFields()
        if (cancelled) return
        setCustomFields(fields)
        stateCallback.current?.("ready")
      } catch (error) {
        if (cancelled) return
        setError(true)
        stateCallback.current?.("error")
        console.error("Failed to load custom fields:", error)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadCustomFields()
    return () => { cancelled = true }
  }, [retry])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Benutzerdefinierte Felder werden geladen…</span>
      </div>
    )
  }

  if (error) return <Alert variant="destructive"><AlertDescription>Felddefinitionen konnten nicht geladen werden. Vorhandene Werte bleiben erhalten.<Button variant="outline" size="sm" className="mt-2" onClick={() => setRetry(value => value + 1)}>Erneut versuchen</Button></AlertDescription></Alert>

  if (customFields.length === 0) {
    return null
  }

  const renderField = (field: CustomField) => {
    const fieldName = `customFields.${field.name}`
    const fieldId = `custom-${field.name}`
    const fieldValue = formData?.customFields?.[field.name] ?? field.default_value ?? ""

    if (form) {
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>{getFieldLabel(field)}</FormLabel>
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

    return (
      <div key={field.id} className="grid gap-2">
        <Label htmlFor={fieldId}>{getFieldLabel(field)}</Label>
        {renderControlledField(field, fieldValue)}
        {field.description && (
          <p className="text-sm text-muted-foreground">{field.description}</p>
        )}
      </div>
    )
  }

  const renderFormControl = (field: CustomField, formField: ControllerRenderProps<FieldValues, string>) => {
    const fieldId = `custom-${field.name}`

    switch (field.type) {
      case "number":
      case "date":
      case "text":
        return renderTextLikeField(field, formField)
      case "boolean":
        return renderBooleanField(field, {
          id: fieldId,
          checked: formField.value,
          onCheckedChange: formField.onChange,
        })
      case "select":
        return renderSelectField(field, {
          onValueChange: formField.onChange,
          defaultValue: formField.value,
        })
      default:
        return renderTextLikeField(field, formField)
    }
  }

  const renderControlledField = (field: CustomField, value: CustomFieldValue) => {
    const fieldId = `custom-${field.name}`
    const inputValue = typeof value === "string" || typeof value === "number" ? value : value == null ? "" : String(value)
    const handleChange = (newValue: CustomFieldValue) => {
      onChange?.(`customFields.${field.name}`, newValue)
    }

    switch (field.type) {
      case "number":
      case "date":
      case "text":
        return renderTextLikeField(field, {
          id: fieldId,
          value: inputValue,
          onChange: (event) =>
            handleChange(
              field.type === "number"
                ? event.target.valueAsNumber
                : event.target.value
            ),
        })
      case "boolean":
        return renderBooleanField(field, {
          id: fieldId,
          checked: value === true,
          onCheckedChange: handleChange,
        })
      case "select":
        return renderSelectField(field, {
          value: value === undefined ? undefined : String(value),
          onValueChange: handleChange,
        })
      default:
        return renderTextLikeField(field, {
          id: fieldId,
          value: inputValue,
          onChange: (event) => handleChange(event.target.value),
        })
    }
  }

  return (
    <div className={className}>
      <h3 className="text-lg font-medium mb-4">Benutzerdefinierte Felder</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {customFields.map(renderField)}
      </div>
    </div>
  )
}
