// 统一响应格式 Result<T>
export interface Result<T = unknown> {
  code: number
  msg: string
  data: T
  traceId?: string
}

// 分页数据
export interface Page<T> {
  records: T[]
  total: number
  current: number
  size: number
  pages: number
}

// 分页查询基础参数
export interface PageQuery {
  current?: number
  size?: number
}
