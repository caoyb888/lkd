import axios from 'axios'
import { getToken } from '@/utils/auth'

export type PrintType = 'cover' | 'spine' | 'volume-catalogue' | 'file-catalogue' | 'all'

export const PrintApi = {
  /**
   * 下载指定案卷的 Word 打印文件（二进制流）
   */
  downloadDocx(volumeId: number, year: string): Promise<Blob> {
    return axios
      .get(`/api/print/volume/${volumeId}`, {
        params: { year },
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        timeout: 30000,
      })
      .then((res) => res.data as Blob)
  },
}
