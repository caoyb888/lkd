import { Http } from '@/lib/http'
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
    Http.get<ArchiveFileListVO[]>(
      `/file/volume/${encodeURIComponent(volumeNo)}?year=${encodeURIComponent(year)}`
    ),

  save: (data: ArchiveFileSaveDTO) => Http.post<number>('/file', data),

  update: (id: number, year: string, data: ArchiveFileSaveDTO) =>
    Http.put<void>(`/file/${id}?year=${encodeURIComponent(year)}`, data),

  delete: (id: number, year: string) =>
    Http.delete<void>(`/file/${id}?year=${encodeURIComponent(year)}`),

  batchSort: (items: FileSortDTO[]) => Http.put<void>('/file/sort', items),
}
