import { format, parseISO, isValid, startOfMonth, startOfQuarter, getYear, getMonth } from "date-fns"
import { de } from "date-fns/locale"
import { Group } from "@/components/grouping/grouped-list"
import { customFieldService } from "@/services/data/customFieldService"
import type { CustomField } from "@/services/data/types"

// Define types for grouping field configurations
export interface GroupingField {
  value: string;
  label: string;
  groupingFn: <T>(items: T[], accessor: (item: T) => any) => Group<T>[];
}

// Helper function to safely parse a date string
export function safeParseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null
  try {
    const date = parseISO(dateString)
    return isValid(date) ? date : null
  } catch (e) {
    return null
  }
}

// Helper function to format a date as month/year
export function formatMonthYear(date: Date): string {
  return format(date, "MMMM yyyy", { locale: de })
}

// Helper function to format a date as quarter/year
export function formatQuarterYear(date: Date): string {
  const month = date.getMonth()
  const quarter = Math.floor(month / 3) + 1
  return `Q${quarter} ${date.getFullYear()}`
}

// Helper function to get value range group
export function getValueRangeGroup(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(numValue)) return 'Kein Wert'

  if (numValue < 1000) return '< 1.000 €'
  if (numValue < 5000) return '1.000 € - 4.999 €'
  if (numValue < 10000) return '5.000 € - 9.999 €'
  if (numValue < 50000) return '10.000 € - 49.999 €'
  return '≥ 50.000 €'
}

// Generic function to group items by a field
export function groupBy<T>(
  items: T[],
  getGroupKey: (item: T) => string,
  getGroupTitle: (key: string, items: T[]) => string = key => key
): Group<T>[] {
  // Group items by key
  const groupedItems = items.reduce((acc, item) => {
    const key = getGroupKey(item)
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(item)
    return acc
  }, {} as Record<string, T[]>)

  // Convert to array of Group objects
  return Object.entries(groupedItems)
    .map(([key, groupItems]) => ({
      key,
      title: getGroupTitle(key, groupItems),
      items: groupItems
    }))
    .sort((a, b) => a.title.localeCompare(b.title))
}

// Function to create a "No value" group title
export function createNoValueGroupTitle(fieldName: string): string {
  return `Kein ${fieldName}`
}

// Specialized grouping functions for different data types

// Group by string field
export function groupByString<T>(
  items: T[],
  accessor: (item: T) => string | null | undefined
): Group<T>[] {
  return groupBy(
    items,
    item => {
      const value = accessor(item)
      return value || 'no_value'
    },
    (key, _) => key === 'no_value' ? 'Kein Wert' : key
  )
}

// Group by date field (month/year)
export function groupByMonthYear<T>(
  items: T[],
  accessor: (item: T) => string | Date | null | undefined
): Group<T>[] {
  return groupBy(
    items,
    item => {
      const value = accessor(item)
      if (!value) return 'no_date'

      const date = value instanceof Date ? value : safeParseDate(value as string)
      if (!date) return 'no_date'

      // Use startOfMonth to normalize dates to the beginning of the month
      const monthStart = startOfMonth(date)
      return monthStart.toISOString()
    },
    (key, _) => {
      if (key === 'no_date') return 'Kein Datum'
      const date = new Date(key)
      return formatMonthYear(date)
    }
  )
}

// Group by date field (quarter/year)
export function groupByQuarterYear<T>(
  items: T[],
  accessor: (item: T) => string | Date | null | undefined
): Group<T>[] {
  return groupBy(
    items,
    item => {
      const value = accessor(item)
      if (!value) return 'no_date'

      const date = value instanceof Date ? value : safeParseDate(value as string)
      if (!date) return 'no_date'

      // Use startOfQuarter to normalize dates to the beginning of the quarter
      const quarterStart = startOfQuarter(date)
      return quarterStart.toISOString()
    },
    (key, _) => {
      if (key === 'no_date') return 'Kein Datum'
      const date = new Date(key)
      return formatQuarterYear(date)
    }
  )
}

// Group by year
export function groupByYear<T>(
  items: T[],
  accessor: (item: T) => string | Date | null | undefined
): Group<T>[] {
  return groupBy(
    items,
    item => {
      const value = accessor(item)
      if (!value) return 'no_date'

      const date = value instanceof Date ? value : safeParseDate(value as string)
      if (!date) return 'no_date'

      return getYear(date).toString()
    },
    (key, _) => key === 'no_date' ? 'Kein Datum' : key
  )
}

// Group by numeric value ranges
export function groupByValueRange<T>(
  items: T[],
  accessor: (item: T) => number | string | null | undefined
): Group<T>[] {
  return groupBy(
    items,
    item => {
      const value = accessor(item)
      if (value === null || value === undefined || value === '') return 'no_value'

      const numValue = typeof value === 'string' ? parseFloat(value) : value
      if (isNaN(numValue)) return 'no_value'

      return getValueRangeGroup(numValue)
    },
    key => key
  )
}

// Group by boolean value
export function groupByBoolean<T>(
  items: T[],
  accessor: (item: T) => boolean | string | number | null | undefined,
  trueLabel: string = 'Ja',
  falseLabel: string = 'Nein'
): Group<T>[] {
  return groupBy(
    items,
    item => {
      const value = accessor(item)
      if (value === null || value === undefined) return 'no_value'

      // Handle different types that can represent boolean values
      if (typeof value === 'boolean') return value ? 'true' : 'false'
      if (typeof value === 'string') {
        const lowercaseValue = value.toLowerCase()
        if (['true', 'yes', 'ja', '1', 'y'].includes(lowercaseValue)) return 'true'
        if (['false', 'no', 'nein', '0', 'n'].includes(lowercaseValue)) return 'false'
      }
      if (typeof value === 'number') return value === 0 ? 'false' : 'true'

      return 'no_value'
    },
    (key, _) => {
      if (key === 'true') return trueLabel
      if (key === 'false') return falseLabel
      return 'Kein Wert'
    }
  )
}

// Group by first letter (alphabetical)
export function groupByFirstLetter<T>(
  items: T[],
  accessor: (item: T) => string | null | undefined
): Group<T>[] {
  return groupBy(
    items,
    item => {
      const value = accessor(item)
      if (!value) return '#'

      const firstChar = value.charAt(0).toUpperCase()
      // Check if the first character is a letter
      return /[A-Z]/.test(firstChar) ? firstChar : '#'
    },
    key => key
  )
}

// Create a map of grouping functions for different field types
export const groupingFunctions = {
  string: groupByString,
  monthYear: groupByMonthYear,
  quarterYear: groupByQuarterYear,
  year: groupByYear,
  valueRange: groupByValueRange,
  boolean: groupByBoolean,
  firstLetter: groupByFirstLetter
}

// Define common grouping fields for deals
export const dealGroupingFields: GroupingField[] = [
  {
    value: 'stage',
    label: 'Phase',
    groupingFn: <T>(items: T[], accessor: (item: T) => any) => groupByString(items, accessor)
  },
  {
    value: 'customer',
    label: 'Kunde',
    groupingFn: <T>(items: T[], accessor: (item: T) => any) => groupByFirstLetter(items, accessor)
  },
  {
    value: 'value',
    label: 'Wert',
    groupingFn: <T>(items: T[], accessor: (item: T) => any) => groupByValueRange(items, accessor)
  },
  {
    value: 'createdDate',
    label: 'Erstellungsdatum (Monat)',
    groupingFn: <T>(items: T[], accessor: (item: T) => any) => groupByMonthYear(items, accessor)
  },
  {
    value: 'createdDate_quarter',
    label: 'Erstellungsdatum (Quartal)',
    groupingFn: <T>(items: T[], accessor: (item: T) => any) => groupByQuarterYear(items, accessor)
  },
  {
    value: 'expectedCloseDate',
    label: 'Abschlussdatum (Monat)',
    groupingFn: <T>(items: T[], accessor: (item: T) => any) => groupByMonthYear(items, accessor)
  },
  {
    value: 'value_calculation_method',
    label: 'Berechnungsmethode',
    groupingFn: <T>(items: T[], accessor: (item: T) => any) => groupByString(items, accessor)
  }
]

// Define common grouping fields for customers
export const customerGroupingFields: GroupingField[] = [
  {
    value: 'status',
    label: 'Status',
    groupingFn: <T>(items: T[], accessor: (item: T) => any) => groupByString(items, accessor)
  },
  {
    value: 'name',
    label: 'Name (A-Z)',
    groupingFn: <T>(items: T[], accessor: (item: T) => any) => groupByFirstLetter(items, accessor)
  },
  {
    value: 'company',
    label: 'Firma (A-Z)',
    groupingFn: <T>(items: T[], accessor: (item: T) => any) => groupByFirstLetter(items, accessor)
  },
  {
    value: 'city',
    label: 'Stadt',
    groupingFn: <T>(items: T[], accessor: (item: T) => any) => groupByString(items, accessor)
  },
  {
    value: 'country',
    label: 'Land',
    groupingFn: <T>(items: T[], accessor: (item: T) => any) => groupByString(items, accessor)
  }
]

// Helper function to get accessor function for a field
export function getFieldAccessor<T>(fieldName: string): (item: T) => any {
  return (item: T) => {
    // Handle special cases with custom accessors
    if (fieldName === 'createdDate_quarter') {
      return (item as any)['createdDate']
    }

    // Handle custom fields (prefixed with 'custom_')
    if (fieldName.startsWith('custom_')) {
      const customFieldName = fieldName.substring(7) // Remove 'custom_' prefix

      // Access the custom field value from the item's customFields property
      if ((item as any).customFields) {
        return (item as any).customFields[customFieldName]
      }
      return undefined
    }

    // Handle nested fields with dot notation
    if (fieldName.includes('.')) {
      const parts = fieldName.split('.')
      let value: any = item
      for (const part of parts) {
        if (value === null || value === undefined) return undefined
        value = value[part]
      }
      return value
    }

    // Regular field access
    return (item as any)[fieldName]
  }
}

// Function to get grouping options from custom fields
export async function getCustomFieldGroupingOptions(): Promise<GroupingField[]> {
  try {
    console.log(`🔍 [Grouping] getCustomFieldGroupingOptions() called`);
    console.log(`🔍 [Grouping] getCustomFieldGroupingOptions call stack:`, new Error().stack?.split('\n').slice(1, 6).join('\n'));
    
    // Fetch active custom fields
    const customFields = await customFieldService.getActiveCustomFields();
    console.log(`🔍 [Grouping] Retrieved ${customFields.length} custom fields for grouping`);

    // Convert custom fields to grouping fields
    const result = customFields.map(field => {
      return {
        value: `custom_${field.name}`, // Prefix to avoid collisions with standard fields
        label: `${field.label} (Custom)`,
        groupingFn: getGroupingFunctionForCustomField(field)
      };
    });
    
    console.log(`🔍 [Grouping] Returning ${result.length} custom field grouping options`);
    return result;
  } catch (error) {
    console.error('Failed to fetch custom field grouping options:', error);
    return [];
  }
}

// Determine the appropriate grouping function based on field type
function getGroupingFunctionForCustomField(field: CustomField): GroupingField['groupingFn'] {
  switch (field.type) {
    case 'text':
      return (items, accessor) => groupByString(items, accessor);
    case 'number':
      return (items, accessor) => groupByValueRange(items, accessor);
    case 'date':
      return (items, accessor) => groupByMonthYear(items, accessor);
    case 'boolean':
      return (items, accessor) => groupByBoolean(items, accessor, 'Ja', 'Nein');
    case 'select':
      return (items, accessor) => groupByString(items, accessor);
    default:
      return (items, accessor) => groupByString(items, accessor);
  }
}

// Main function to group items by a selected field
export function groupItemsByField<T>(
  items: T[],
  fieldName: string | null,
  groupingFields: GroupingField[]
): Group<T>[] {
  if (!fieldName) return []

  const groupingField = groupingFields.find(field => field.value === fieldName)
  if (!groupingField) return []

  const accessor = getFieldAccessor<T>(fieldName)
  return groupingField.groupingFn(items, accessor)
}
