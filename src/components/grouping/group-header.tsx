"use client"

import * as React from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
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
    <div 
      className={cn(
        "flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-md cursor-pointer hover:bg-muted transition-colors",
        className
      )}
      onClick={onToggle}
    >
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-6 w-6 p-0"
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>
      <span className="font-medium">{title}</span>
      <Badge variant="outline" className="ml-2">
        {count}
      </Badge>
    </div>
  )
}
