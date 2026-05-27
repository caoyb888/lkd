import http from '@/utils/http'

export interface YearArchiveStat {
  year: string
  count: number
}

export interface StatusDistribution {
  status: number
  statusName: string
  count: number
}

export interface DashboardOverviewVO {
  totalVolumeCount: number
  archivedCount: number
  currentBorrowedCount: number
  pendingApproveCount: number
  yearTrend: YearArchiveStat[]
  statusDistribution: StatusDistribution[]
}

export const DashboardApi = {
  overview: () =>
    http.get<DashboardOverviewVO>('/dashboard/overview'),
}
