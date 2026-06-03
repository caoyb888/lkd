import { Http } from '@/lib/http'
import type { Page } from '@/types/api'
import type { ArchiveVolumeListVO, ApproveLogVO } from '@/types/vo'

export interface DestroyQueryDTO {
  keyword?: string
  current?: number
  size?: number
}

export interface DestroyActionDTO {
  recordId: number
  year: string
  opinion?: string
}

export const DestroyApi = {
  /** 提交销毁申请（档案管理员） */
  apply: (recordId: number, year: string, opinion?: string) =>
    Http.put<void>(`/volume/${recordId}/destroy-apply?year=${encodeURIComponent(year)}`, { opinion }),

  /** 审批通过销毁（公司领导） */
  approve: (recordId: number, year: string, opinion?: string) =>
    Http.put<void>(`/volume/${recordId}/destroy-approve?year=${encodeURIComponent(year)}`, { opinion }),

  /** 审批驳回销毁（公司领导） */
  reject: (recordId: number, year: string, opinion?: string) =>
    Http.put<void>(`/volume/${recordId}/destroy-reject?year=${encodeURIComponent(year)}`, { opinion }),

  /** 待销毁审批列表 */
  pendingPage: (params: DestroyQueryDTO) =>
    Http.get<Page<ArchiveVolumeListVO>>('/volume/destroy-pending-page', { params }),

  /** 销毁审批历史 */
  logs: (targetId: number) =>
    Http.get<ApproveLogVO[]>(`/approve/destroy/${targetId}/logs`),
}
