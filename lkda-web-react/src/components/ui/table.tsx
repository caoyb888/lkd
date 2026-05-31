import { cn } from '@/lib/utils'

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {}

function Table({ className, ...props }: TableProps) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}

export { Table }
