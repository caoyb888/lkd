import { Http } from '@/lib/http'
import type { Page } from '@/types/api'
import type { ArchiveVolumeListVO, ArchiveVolumeDetailVO, ApproveLogVO } from '@/types/vo'

export interface VolumeQueryDTO {
  year?: string
  fondsNo?: string
  categoryL1?: string
  categoryL2?: string
  categoryL3?: string
  deviceCode?: string
  status?: number
  inStock?: number
  securityLevel?: string
  archiveNo?: string
  keyword?: string
  current?: number
  size?: number
}

export interface ArchiveVolumeSaveDTO {
  fondsNo: string
  year: string
  categoryL1: string
  categoryL2?: string
  categoryL3?: string
  deviceCode: string
  volumeTitle: string
  compileUnit?: string
  securityLevel?: string
  retentionPeriod?: string
  copies?: number
  totalPages?: number
  compiler?: string
  compileDate?: string
  reviewer?: string
  archiveDate?: string
  remark?: string
  notes?: string
}

export interface ArchiveNoPreviewDTO {
  fondsNo: string
  categoryL1: string
  categoryL2?: string
  categoryL3?: string
  deviceCode: string
  year: string
}

export interface ImportErrorItem {
  row: number
  column: string
  message: string
}

export interface ImportResult {
  totalCount: number
  successCount: number
  fileName: string
  errorList?: ImportErrorItem[]
}

export const VolumeApi = {
  page: (params: VolumeQueryDTO) =>
    Http.get<Page<ArchiveVolumeListVO>>('/volume/page', { params }),

  detail: (id: number, year: string) =>
    Http.get<ArchiveVolumeDetailVO>(`/volume/${id}?year=${encodeURIComponent(year)}`),

  byArchiveNo: (archiveNo: string) =>
    Http.get<ArchiveVolumeDetailVO>(`/volume/by-archive-no?archiveNo=${encodeURIComponent(archiveNo)}`),

  previewNo: (params: ArchiveNoPreviewDTO) =>
    Http.get<string>('/volume/archive-no/preview', { params }),

  saveDraft: (data: ArchiveVolumeSaveDTO) =>
    Http.post<ArchiveVolumeDetailVO>('/volume', data),

  update: (id: number, year: string, data: ArchiveVolumeSaveDTO) =>
    Http.put<void>(`/volume/${id}?year=${encodeURIComponent(year)}`, data),

  submit: (id: number, year: string) =>
    Http.put<void>(`/volume/${id}/submit?year=${encodeURIComponent(year)}`),

  delete: (id: number, year: string) =>
    Http.delete<void>(`/volume/${id}?year=${encodeURIComponent(year)}`),

  approveLogs: (id: number) =>
    Http.get<ApproveLogVO[]>(`/approve/volume/${id}/logs`),

  importVolumes: (formData: FormData) =>
    Http.post<ImportResult>('/volume/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  downloadTemplate: () =>
    Http.get<Blob>('/volume/import-template', { responseType: 'blob' }),
}
