import http from '@/utils/http'
import type { ArchiveFileListVO } from '@/types/vo'

export interface ArchiveFileSaveDTO {
  volumeId: number
  year: string
  seqNo?: number
  fileNo?: string
  fileTitle: string
  responsible?: string
  pages?: number
  securityLevel?: string
  archiveDate?: string
  keywords?: string
  originalPath?: string
  remark?: string
}

export interface FileSortDTO {
  recordId: number
  year: string
  seqNo: number
}

export const FileApi = {
  listByVolume: (volumeNo: string, year: string) =>
    http.get<ArchiveFileListVO[]>(`/file/volume/${encodeURIComponent(volumeNo)}?year=${encodeURIComponent(year)}`),

  save: (data: ArchiveFileSaveDTO) =>
    http.post<number>('/file', data),

  update: (id: number, year: string, data: ArchiveFileSaveDTO) =>
    http.put<void>(`/file/${id}?year=${encodeURIComponent(year)}`, data),

  delete: (id: number, year: string) =>
    http.delete<void>(`/file/${id}?year=${encodeURIComponent(year)}`),

  batchSort: (items: FileSortDTO[]) =>
    http.put<void>('/file/sort', items),
}
