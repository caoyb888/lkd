import * as React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: React.ReactNode
  className?: string
}

export default function PageHeader({ title, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-3', className)}>
      <h2 className="text-xl font-bold text-slate-title">{title}</h2>
    </div>
  )
}
