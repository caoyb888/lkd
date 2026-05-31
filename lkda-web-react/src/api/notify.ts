import { Http } from '@/lib/http'

export interface NotifyCount {
  pendingApprove: number
  overdueCount: number
  myPendingBorrow: number
}

export const NotifyApi = {
  count: () => Http.get<NotifyCount>('/notification/count'),
}
