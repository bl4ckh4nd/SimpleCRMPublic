import { type ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  heading: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, heading, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      {icon && (
        <div className="text-muted-foreground/40">{icon}</div>
      )}
      <div>
        <p className="font-medium">{heading}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
