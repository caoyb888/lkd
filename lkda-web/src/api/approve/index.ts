import http from '@/utils/http'
import type { ArchiveVolumeDetailVO, ApproveLogVO } from '@/types/vo'
import type { Page, PageQuery } from '@/types/api.d.ts'

export interface ApproveReviewQueryDTO extends PageQuery {
  year?: string
  keyword?: string
  status?: number
}

export interface ApproveActionDTO {
  opinion: string
}

export interface ApproveHistoryQueryDTO extends PageQuery {
  businessType?: number
  approverName?: string
  keyword?: string
  dateFrom?: string
  dateTo?: string
}

export interface ApproveQueueItemVO {
  recordId: number
  year: string
  archiveNo: string
  volumeTitle: string
  categoryL1: string
  categoryL1Label: string
  securityLevel: string
  securityLevelLabel: string
  compilerName: string
  compilerId: number
  status: number
  createdAt: string
  updatedAt: string
}

export const ApproveApi = {
  // 待审核队列（status=1，检查人/管理员可见）→ 复用案卷分页接口
  reviewPage: (params: ApproveReviewQueryDTO) =>
    http.get<Page<ApproveQueueItemVO>>('/volume/page', { params: { ...params, status: 1 } }),

  // 待确认队列（status=2，管理员可见）→ 复用案卷分页接口
  confirmPage: (params: ApproveReviewQueryDTO) =>
    http.get<Page<ApproveQueueItemVO>>('/volume/page', { params: { ...params, status: 2 } }),

  // 案卷完整详情（审批时只读展示）
  detail: (id: number, year: string) =>
    http.get<ArchiveVolumeDetailVO>(`/volume/${id}?year=${encodeURIComponent(year)}`),

  // 审批日志
  logs: (id: number) =>
    http.get<ApproveLogVO[]>(`/approve/volume/${id}/logs`),

  // 归档审核：通过（status: 1 → 2）
  pass: (id: number, year: string, data: ApproveActionDTO) =>
    http.put<void>(`/volume/${id}/review-pass?year=${encodeURIComponent(year)}`, data),

  // 归档审核：驳回（status: 1 → 0）
  reject: (id: number, year: string, data: ApproveActionDTO) =>
    http.put<void>(`/volume/${id}/review-reject?year=${encodeURIComponent(year)}`, data),

  // 归档确认：确认归档（status: 2 → 3）
  confirm: (id: number, year: string, data: ApproveActionDTO) =>
    http.put<void>(`/volume/${id}/archive-confirm?year=${encodeURIComponent(year)}`, data),

  // 归档确认：退回（status: 2 → 1）
  back: (id: number, year: string, data: ApproveActionDTO) =>
    http.put<void>(`/volume/${id}/archive-back?year=${encodeURIComponent(year)}`, data),

  // 审批历史分页（全量，管理员/领导可见）
  historyPage: (params: ApproveHistoryQueryDTO) =>
    http.get<Page<ApproveLogVO>>('/approve/history/page', { params }),
}
