import { cn } from '@/lib/utils'

interface PrintLayoutProps {
  children: React.ReactNode
  className?: string
}

export default function PrintLayout({ children, className }: PrintLayoutProps) {
  return (
    <div
      className={cn(
        'bg-white p-8 shadow-card max-w-[210mm] mx-auto',
        className
      )}
    >
      {children}
    </div>
  )
}
