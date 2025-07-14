"use client"

import * as React from "react"
import { LayersIcon } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export interface GroupOption {
  value: string
  label: string
}

interface GroupSelectorProps {
  options: GroupOption[]
  selectedGrouping: string | null
  isGrouped: boolean
  onGroupingChange: (value: string | null) => void
  onToggleGrouping: (isGrouped: boolean) => void
}

export function GroupSelector({
  options,
  selectedGrouping,
  isGrouped,
  onGroupingChange,
  onToggleGrouping
}: GroupSelectorProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <LayersIcon className="h-4 w-4 text-muted-foreground" />
        <Label htmlFor="group-toggle" className="text-sm font-medium">
          Gruppieren
        </Label>
        <Switch
          id="group-toggle"
          checked={isGrouped}
          onCheckedChange={onToggleGrouping}
        />
      </div>

      {isGrouped && (
        <Select
          value={selectedGrouping || ""}
          onValueChange={(value) => onGroupingChange(value || null)}
          disabled={!isGrouped}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Gruppieren nach..." />
          </SelectTrigger>
          <SelectContent>
            {/* Standard fields */}
            {options.filter(option => !option.value.startsWith('custom_')).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}

            {/* Separator if there are custom fields */}
            {options.some(option => option.value.startsWith('custom_')) && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground border-t">
                Benutzerdefinierte Felder
              </div>
            )}

            {/* Custom fields */}
            {options.filter(option => option.value.startsWith('custom_')).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
