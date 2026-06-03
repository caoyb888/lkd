import { Http } from '@/lib/http'

export type PrintType = 'cover' | 'spine' | 'volume-catalogue' | 'file-catalogue' | 'all'

export const PrintApi = {
  /**
   * 下载指定案卷的 Word 打印文件（二进制流）
   */
  downloadDocx: (volumeId: number, year: string, type: PrintType = 'all') =>
    Http.get<Blob>(`/print/volume/${volumeId}`, {
      params: { year, type },
      responseType: 'blob',
    }),
}
