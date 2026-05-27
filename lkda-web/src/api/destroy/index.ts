import http from '@/utils/http'
import type { ArchiveVolumeListVO, ArchiveVolumeDetailVO, ApproveLogVO } from '@/types/vo'
import type { Page, PageQuery } from '@/types/api.d.ts'

export interface DestroyApplyDTO {
  opinion: string
}

export interface DestroyPendingQueryDTO extends PageQuery {
  keyword?: string
}

export const DestroyApi = {
  /**
   * 查询待销毁审批列表（公司领导）
   * GET /api/volume/destroy-pending-page
   */
  pendingPage: (params: DestroyPendingQueryDTO) =>
    http.get<Page<ArchiveVolumeListVO>>('/volume/destroy-pending-page', { params }),

  /**
   * 案卷详情
   * GET /api/volume/{recordId}?year=xxx
   */
  detail: (recordId: number, year: string) =>
    http.get<ArchiveVolumeDetailVO>(`/volume/${recordId}?year=${encodeURIComponent(year)}`),

  /**
   * 销毁审批历史
   * GET /api/approve/destroy/{targetId}/logs
   */
  logs: (targetId: number) =>
    http.get<ApproveLogVO[]>(`/approve/destroy/${targetId}/logs`),

  /**
   * 提交销毁申请
   * PUT /api/volume/{recordId}/destroy-apply?year=2026
   */
  apply: (recordId: number, year: string, data: DestroyApplyDTO) =>
    http.put<void>(`/volume/${recordId}/destroy-apply?year=${encodeURIComponent(year)}`, data),

  /**
   * 审批通过销毁（公司领导）
   * PUT /api/volume/{recordId}/destroy-approve?year=2026
   */
  approve: (recordId: number, year: string, data: DestroyApplyDTO) =>
    http.put<void>(`/volume/${recordId}/destroy-approve?year=${encodeURIComponent(year)}`, data),

  /**
   * 审批驳回销毁（公司领导）
   * PUT /api/volume/{recordId}/destroy-reject?year=2026
   */
  reject: (recordId: number, year: string, data: DestroyApplyDTO) =>
    http.put<void>(`/volume/${recordId}/destroy-reject?year=${encodeURIComponent(year)}`, data),
}
