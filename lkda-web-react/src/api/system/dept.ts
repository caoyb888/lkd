import { Http } from '@/lib/http'
import type { DeptVO } from '@/types/vo'

export interface DeptSaveDTO {
  deptName: string
  parentId: number
  sortOrder?: number
}

export const DeptApi = {
  tree: () => Http.get<DeptVO[]>('/dept/tree'),

  save: (data: DeptSaveDTO) => Http.post<void>('/dept', data),

  update: (deptId: number, data: DeptSaveDTO) =>
    Http.put<void>(`/dept/${deptId}`, data),

  delete: (deptId: number) => Http.delete<void>(`/dept/${deptId}`),
}
