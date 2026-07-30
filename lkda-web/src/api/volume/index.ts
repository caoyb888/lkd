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
  fondsNo?: string
  categoryL1?: string
  categoryL2?: string
  categoryL3?: string
  deviceCode?: string
  securityLevel?: string
  archiveNo?: string
  status?: number
  inStock?: number
  keyword?: string
}

// 与后端 ArchiveVolumeSaveDTO 对齐（立卷人 compiler 由后端取当前用户，无需传入）
export interface ArchiveVolumeSaveDTO {
  year: string
  fondsNo: string
  categoryName?: string
  categoryL1: string
  categoryL2?: string
  categoryL3?: string
  deviceCode: string
  volumeTitle: string
  fileCount?: number
  totalPages?: number
  compileUnit?: string
  compileDate?: string
  retentionPeriod?: string
  securityLevel?: string
  compileDateActual?: string
  reviewer?: string
  inspectDate?: string
  archiveDate?: string
  notes?: string
  remark?: string
  categoryCode?: string
  locationNo?: string
  copies?: number
  organization?: string
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

  // 我的草稿（待归档）分页：后端强制 status=0 且按当前立卷人过滤
  draftPage: (params: PageQuery) =>
    http.get<Page<ArchiveVolumeListVO>>('/volume/draft-page', { params }),

  detail: (id: number, year: string) =>
    http.get<ArchiveVolumeDetailVO>(`/volume/${id}?year=${encodeURIComponent(year)}`),

  previewNo: (params: ArchiveNoPreviewDTO) =>
    http.get<string>('/volume/archive-no/preview', { params }),

  saveDraft: (data: ArchiveVolumeSaveDTO) =>
    http.post<ArchiveVolumeDetailVO>('/volume', data),

  update: (id: number, year: string, data: ArchiveVolumeSaveDTO) =>
    http.put<void>(`/volume/${id}?year=${encodeURIComponent(year)}`, data),

  delete: (id: number, year: string) =>
    http.delete<void>(`/volume/${id}?year=${encodeURIComponent(year)}`),

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
