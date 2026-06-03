import { Http } from '@/lib/http'
import type { Page } from '@/types/api'
import type { BorrowVO } from '@/types/vo'

export interface BorrowApplyDTO {
  archiveNo: string
  applyCount: number
  planReturnDate: string
  reason: string
}

export interface BorrowQueryDTO {
  status?: number
  keyword?: string
  current?: number
  size?: number
}

export const BorrowApi = {
  /** 提交借阅申请 */
  apply: (data: BorrowApplyDTO) =>
    Http.post<void>('/borrow/apply', data),

  /** 我的借阅列表 */
  myList: (params: BorrowQueryDTO) =>
    Http.get<Page<BorrowVO>>('/borrow/my-page', { params }),

  /** 借阅审批列表（管理员） */
  pendingList: (params: BorrowQueryDTO) =>
    Http.get<Page<BorrowVO>>('/borrow/pending-page', { params }),

  /** 借阅历史 — 部门历史（archive_admin 视角） */
  deptHistory: (params: BorrowQueryDTO) =>
    Http.get<Page<BorrowVO>>('/borrow/dept-history', { params }),

  /** 借阅历史 — 全部历史（company_leader 视角） */
  allHistory: (params: BorrowQueryDTO) =>
    Http.get<Page<BorrowVO>>('/borrow/all-history', { params }),

  /** 借阅详情 */
  detail: (borrowId: number) =>
    Http.get<BorrowVO>(`/borrow/${borrowId}`),

  /** 审批通过 */
  approve: (borrowId: number, borrowDays?: number, opinion?: string) =>
    Http.put<void>(`/borrow/${borrowId}/approve`, { borrowDays, opinion }),

  /** 审批驳回 */
  reject: (borrowId: number, opinion?: string) =>
    Http.put<void>(`/borrow/${borrowId}/reject`, { opinion }),

  /** 登记归还（借阅人自主归还） */
  return: (borrowId: number) =>
    Http.put<void>(`/borrow/${borrowId}/return`),

  /** 管理员代办归还 */
  adminReturn: (borrowId: number, opinion?: string) =>
    Http.put<void>(`/borrow/${borrowId}/admin-return`, { opinion }),
}
