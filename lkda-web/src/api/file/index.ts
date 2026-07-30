import http from '@/utils/http'
import type { ArchiveFileListVO } from '@/types/vo'

export interface ArchiveFileSaveDTO {
  /** 关联案卷的案卷号（写入用，非定位键） */
  volumeNo: string
  /** 关联案卷的档号（定位键，全库唯一） */
  archiveNo: string
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

/** 卷内文件详情（与后端 ArchiveFileVO 对齐，字段较多只声明常用项） */
export interface ArchiveFileDetailVO extends Partial<ArchiveFileListVO> {
  recordId: number
  year: string
  archiveNo: string
  fileTitle: string
  compileDate?: string
  originalPath?: string
  retentionPeriod?: string
  categoryCode?: string
  drawingSize?: string
  a4Equivalent?: string
  cabinetNo?: string
  changeRecord?: string
  projectName?: string
  drawerNo?: string
  pageStart?: string
  archiveStatus?: string
  locationNo?: string
  organization?: string
  relatedFlag?: string
  inStock?: number
  copies?: number
  borrowedCopies?: number
}

export interface FileSortDTO {
  recordId: number
  year: string
  seqNo: number
}

export const FileApi = {
  // 关联键为档号（全库唯一）
  listByVolume: (archiveNo: string, year: string) =>
    http.get<ArchiveFileListVO[]>(`/file/volume/${encodeURIComponent(archiveNo)}?year=${encodeURIComponent(year)}`),

  detail: (id: number, year: string) =>
    http.get<ArchiveFileDetailVO>(`/file/${id}?year=${encodeURIComponent(year)}`),

  save: (data: ArchiveFileSaveDTO) =>
    http.post<ArchiveFileDetailVO>('/file', data),

  update: (id: number, year: string, data: ArchiveFileSaveDTO) =>
    http.put<void>(`/file/${id}?year=${encodeURIComponent(year)}`, data),

  delete: (id: number, year: string) =>
    http.delete<void>(`/file/${id}?year=${encodeURIComponent(year)}`),

  batchSort: (items: FileSortDTO[]) =>
    http.put<void>('/file/sort', items),

  /** 上传电子原文（multipart），返回存储文件名 */
  uploadOriginal: (id: number, year: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return http.post<string>(`/file/${id}/original?year=${encodeURIComponent(year)}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    })
  },

  /** 下载电子原文（blob） */
  downloadOriginal: (id: number, year: string) =>
    http.get<Blob>(`/file/${id}/original?year=${encodeURIComponent(year)}`, {
      responseType: 'blob',
      timeout: 60000,
    }),
}
