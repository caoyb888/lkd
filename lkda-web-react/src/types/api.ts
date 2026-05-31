export interface Result<T = unknown> {
  code: number
  msg: string
  data: T
  traceId?: string
}

export interface Page<T = unknown> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}
