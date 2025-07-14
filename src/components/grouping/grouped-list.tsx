"use client"

import * as React from "react"
import { GroupHeader } from "./group-header"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"

export interface Group<T> {
  key: string
  title: string
  items: T[]
}

interface GroupedListProps<T> {
  groups: Group<T>[]
  renderItem: (item: T) => React.ReactNode
  keyExtractor: (item: T) => string | number
  className?: string
  groupHeaderClassName?: string
  groupContentClassName?: string
}

export function GroupedList<T>({
  groups,
  renderItem,
  keyExtractor,
  className,
  groupHeaderClassName,
  groupContentClassName
}: GroupedListProps<T>) {
  // Track expanded state for each group
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>(() => {
    // Initialize with all groups expanded
    return groups.reduce((acc, group) => {
      acc[group.key] = true
      return acc
    }, {} as Record<string, boolean>)
  })

  // Update expanded groups when groups change
  React.useEffect(() => {
    setExpandedGroups(prev => {
      const newExpandedGroups = { ...prev }
      
      // Add any new groups
      groups.forEach(group => {
        if (newExpandedGroups[group.key] === undefined) {
          newExpandedGroups[group.key] = true
        }
      })
      
      return newExpandedGroups
    })
  }, [groups])

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }))
  }

  return (
    <div className={className}>
      {groups.map(group => (
        <div key={group.key} className="mb-4">
          <Collapsible
            open={expandedGroups[group.key]}
            onOpenChange={() => toggleGroup(group.key)}
          >
            <GroupHeader
              title={group.title}
              count={group.items.length}
              isExpanded={expandedGroups[group.key]}
              onToggle={() => toggleGroup(group.key)}
              className={groupHeaderClassName}
            />
            <CollapsibleContent className={groupContentClassName}>
              {group.items.map(item => (
                <React.Fragment key={keyExtractor(item)}>
                  {renderItem(item)}
                </React.Fragment>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      ))}
    </div>
  )
}
