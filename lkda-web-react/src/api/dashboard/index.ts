import { Http } from '@/lib/http'
import type { DashboardOverviewVO } from '@/types/vo'

export const DashboardApi = {
  /** 获取 Dashboard 概览统计数据 */
  overview: () => Http.get<DashboardOverviewVO>('/dashboard/overview'),
}
