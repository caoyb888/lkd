import { Http } from '@/lib/http'
import type { Page } from '@/types/api'
import type { ArchiveVolumeListVO, ApproveLogVO } from '@/types/vo'

export interface ApproveActionDTO {
  recordId: number
  year: string
  action: 'PASS' | 'BACK'
  opinion?: string
}

export interface ApproveQueryDTO {
  keyword?: string
  year?: string
  current?: number
  size?: number
}

export interface ApproveHistoryQueryDTO {
  businessType?: number
  action?: string
  keyword?: string
  dateFrom?: string
  dateTo?: string
  current?: number
  size?: number
}

export const ApproveApi = {
  /** 待审核列表（status=1） */
  pendingReview: (params: ApproveQueryDTO) =>
    Http.get<Page<ArchiveVolumeListVO>>('/volume/page', {
      params: { ...params, status: 1 },
    }),

  /** 待确认列表（status=2） */
  pendingConfirm: (params: ApproveQueryDTO) =>
    Http.get<Page<ArchiveVolumeListVO>>('/volume/page', {
      params: { ...params, status: 2 },
    }),

  /** 审核通过 / 退回 */
  review: (data: ApproveActionDTO) =>
    Http.post<void>('/approve/review', data),

  /** 确认归档 / 退回 */
  confirm: (data: ApproveActionDTO) =>
    Http.post<void>('/approve/confirm', data),

  /** 审批历史分页 */
  history: (params: ApproveHistoryQueryDTO) =>
    Http.get<Page<ApproveLogVO>>('/approve/history/page', { params }),
}
