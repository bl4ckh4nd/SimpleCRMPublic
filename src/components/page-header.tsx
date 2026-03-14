import { type ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string | ReactNode
  actions?: ReactNode
  toolbar?: ReactNode
}

export function PageHeader({ title, subtitle, actions, toolbar }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {toolbar && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {toolbar}
        </div>
      )}
    </div>
  )
}
