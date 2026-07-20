"use client"

import * as React from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface GroupHeaderProps {
  title: string
  count: number
  isExpanded: boolean
  onToggle: () => void
  className?: string
}

export function GroupHeader({
  title,
  count,
  isExpanded,
  onToggle,
  className
}: GroupHeaderProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-left transition-colors hover:bg-muted",
        className
      )}
      onClick={onToggle}
    >
      {isExpanded ? (
        <ChevronDown className="h-4 w-4 shrink-0" />
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0" />
      )}
      <span className="font-medium">{title}</span>
      <Badge variant="outline" className="ml-2">
        {count}
      </Badge>
    </button>
  )
}
