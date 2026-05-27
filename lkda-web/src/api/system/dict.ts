import http from '@/utils/http'
import type { DictItemVO } from '@/types/vo'
import type { Page, PageQuery } from '@/types/api.d.ts'

export interface DictVO {
  dictId: number
  dictCode: string
  dictName: string
  status: number
  remark: string
  createdAt: string
}

export interface DictSaveDTO {
  dictCode: string
  dictName: string
  status?: number
  remark?: string
}

export interface DictItemSaveDTO {
  dictCode: string
  itemValue: string
  itemLabel: string
  sortOrder: number
  status?: number
}

export const DictApi = {
  page: (params: PageQuery & { dictCode?: string; dictName?: string }) =>
    http.get<Page<DictVO>>('/dict/page', { params }),

  save: (data: DictSaveDTO) =>
    http.post<void>('/dict', data),

  update: (dictId: number, data: DictSaveDTO) =>
    http.put<void>(`/dict/${dictId}`, data),

  changeStatus: (dictId: number, status: number, dictName: string) =>
    http.put<void>(`/dict/${dictId}`, { status, dictName }),

  listItems: (dictCode: string) =>
    http.get<DictItemVO[]>(`/dict/${dictCode}/items`),

  saveItem: (data: DictItemSaveDTO) =>
    http.post<void>('/dict/item', data),

  updateItem: (itemId: number, data: DictItemSaveDTO) =>
    http.put<void>(`/dict/item/${itemId}`, data),

  deleteItem: (itemId: number) =>
    http.delete<void>(`/dict/item/${itemId}`),

  // 一次性获取全部字典（供 dict.store 使用）
  allMap: () =>
    http.get<Record<string, DictItemVO[]>>('/dict/all-items'),
}
