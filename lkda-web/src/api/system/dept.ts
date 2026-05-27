import http from '@/utils/http'
import type { DeptVO } from '@/types/vo'

export interface DeptSaveDTO {
  deptName: string
  parentId: number
  sortOrder?: number
}

export const DeptApi = {
  tree: () =>
    http.get<DeptVO[]>('/dept/tree'),

  save: (data: DeptSaveDTO) =>
    http.post<void>('/dept', data),

  update: (deptId: number, data: DeptSaveDTO) =>
    http.put<void>(`/dept/${deptId}`, data),

  delete: (deptId: number) =>
    http.delete<void>(`/dept/${deptId}`),
}
