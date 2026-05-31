import { Http } from '@/lib/http'
import type { DictItemVO } from '@/types/vo'
import type { Page, PageQuery } from '@/types/api'

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
    Http.get<Page<DictVO>>('/dict/page', { params }),

  save: (data: DictSaveDTO) => Http.post<void>('/dict', data),

  update: (dictId: number, data: DictSaveDTO) =>
    Http.put<void>(`/dict/${dictId}`, data),

  changeStatus: (dictId: number, status: number, dictName: string) =>
    Http.put<void>(`/dict/${dictId}`, { status, dictName }),

  listItems: (dictCode: string) =>
    Http.get<DictItemVO[]>(`/dict/${dictCode}/items`),

  saveItem: (data: DictItemSaveDTO) => Http.post<void>('/dict/item', data),

  updateItem: (itemId: number, data: DictItemSaveDTO) =>
    Http.put<void>(`/dict/item/${itemId}`, data),

  deleteItem: (itemId: number) => Http.delete<void>(`/dict/item/${itemId}`),

  // 一次性获取全部字典（供 dict.store 使用）
  allMap: () => Http.get<Record<string, DictItemVO[]>>('/dict/all-items'),
}
