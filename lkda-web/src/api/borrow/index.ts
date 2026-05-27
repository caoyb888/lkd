import http from '@/utils/http'
import type { ArchiveVolumeDetailVO, BorrowVO } from '@/types/vo'
import type { Page, PageQuery } from '@/types/api.d.ts'

export interface BorrowApplyDTO {
  archiveNo: string
  year: string
  applyCount: number
  planReturnDate: string
  reason: string
}

export interface BorrowQueryDTO extends PageQuery {
  status?: number
}

export interface BorrowApproveQueryDTO extends PageQuery {
  keyword?: string
}

export interface BorrowHistoryQueryDTO extends PageQuery {
  keyword?: string
  status?: number
  deptName?: string
  dateFrom?: string
  dateTo?: string
}

export interface BorrowApproveActionDTO {
  action: 'PASS' | 'REJECT'
  opinion: string
  borrowDays?: number
}

export const BorrowApi = {
  // 根据档号获取案卷信息（申请借阅前查询可借数量）
  getVolumeByArchiveNo: (archiveNo: string) =>
    http.get<ArchiveVolumeDetailVO>(`/volume/by-archive-no?archiveNo=${encodeURIComponent(archiveNo)}`),

  // 提交借阅申请
  apply: (data: BorrowApplyDTO) =>
    http.post<void>('/borrow/apply', data),

  // 我的借阅列表（当前用户），支持 status 过滤
  myPage: (params: BorrowQueryDTO) =>
    http.get<Page<BorrowVO>>('/borrow/my-page', { params }),

  // 借阅审批队列（管理员，status=0），支持 keyword 搜索
  approvePage: (params: BorrowApproveQueryDTO) =>
    http.get<Page<BorrowVO>>('/borrow/pending-page', { params }),

  // 批准借阅
  approve: (borrowId: number, data: BorrowApproveActionDTO) =>
    http.put<void>(`/borrow/${borrowId}/approve`, data),

  // 驳回借阅
  reject: (borrowId: number, data: BorrowApproveActionDTO) =>
    http.put<void>(`/borrow/${borrowId}/reject`, data),

  // 借阅历史（本部门）
  deptHistoryPage: (params: BorrowHistoryQueryDTO) =>
    http.get<Page<BorrowVO>>('/borrow/dept-history', { params }),

  // 借阅历史（全量，管理员）
  allHistoryPage: (params: BorrowHistoryQueryDTO) =>
    http.get<Page<BorrowVO>>('/borrow/all-history', { params }),

  // 借阅人自主归还（无 body）
  returnBorrow: (borrowId: number) =>
    http.put<void>(`/borrow/${borrowId}/return`),

  // 管理员代办归还
  adminReturn: (borrowId: number, opinion?: string) =>
    http.put<void>(`/borrow/${borrowId}/admin-return`, opinion ? { opinion } : undefined),
}
