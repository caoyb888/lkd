import http from '@/utils/http'
import type { ArchiveVolumeListVO, ArchiveVolumeDetailVO, ApproveLogVO } from '@/types/vo'
import type { Page, PageQuery } from '@/types/api.d.ts'

export interface ImportResult {
  totalCount: number
  successCount: number
  fileName: string
}

export interface VolumeQueryDTO extends PageQuery {
  year?: string
  categoryL1?: string
  categoryL2?: string
  status?: number
  inStock?: number
  keyword?: string
}

export interface ArchiveVolumeSaveDTO {
  fondsNo: string
  year: string
  categoryL1: string
  categoryL2?: string
  categoryL3?: string
  equipmentCode: string
  volumeTitle: string
  compilingUnit?: string
  securityLevel?: string
  retentionPeriod?: string
  copies?: number
  pageCount?: number
  compilerName?: string
  compileDate?: string
  reviewerName?: string
  archiveDate?: string
  remark?: string
  note?: string
}

export interface ArchiveNoPreviewDTO {
  fondsNo: string
  categoryL1: string
  categoryL2?: string
  categoryL3?: string
  deviceCode: string
  year: string
}

export const VolumeApi = {
  page: (params: VolumeQueryDTO) =>
    http.get<Page<ArchiveVolumeListVO>>('/volume/page', { params }),

  detail: (id: number, year: string) =>
    http.get<ArchiveVolumeDetailVO>(`/volume/${id}?year=${encodeURIComponent(year)}`),

  previewNo: (params: ArchiveNoPreviewDTO) =>
    http.get<string>('/volume/archive-no/preview', { params }),

  saveDraft: (data: ArchiveVolumeSaveDTO) =>
    http.post<number>('/volume', data),

  update: (id: number, year: string, data: ArchiveVolumeSaveDTO) =>
    http.put<void>(`/volume/${id}?year=${encodeURIComponent(year)}`, data),

  submit: (id: number, year: string) =>
    http.put<void>(`/volume/${id}/submit?year=${encodeURIComponent(year)}`),

  approveLogs: (id: number) =>
    http.get<ApproveLogVO[]>(`/approve/volume/${id}/logs`),

  byArchiveNo: (archiveNo: string) =>
    http.get<ArchiveVolumeDetailVO>(`/volume/by-archive-no?archiveNo=${encodeURIComponent(archiveNo)}`),

  importVolumes: (formData: FormData) =>
    http.post<ImportResult>('/volume/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  downloadTemplate: () =>
    http.get<Blob>('/volume/import-template', { responseType: 'blob' }),
}
