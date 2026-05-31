import { Badge } from '@/components/ui/badge'

interface StatusTagProps {
  status: number
  label: string
}

export default function StatusTag({ status, label }: StatusTagProps) {
  const variant =
    status === 3
      ? 'success'
      : status === 1 || status === 2
        ? 'warning'
        : 'default'
  return <Badge variant={variant as 'default' | 'success' | 'warning'}>{label}</Badge>
}
