import http from '@/lib/http'

export interface VolumeQueryDTO {
  year?: string
  categoryL1?: string
  status?: number
  page?: number
  size?: number
}

export const VolumeApi = {
  page: (params: VolumeQueryDTO) => http.get('/volume/page', { params }),
  detail: (id: number) => http.get(`/volume/${id}`),
  save: (data: unknown) => http.post('/volume/save', data),
  update: (data: unknown) => http.put('/volume/update', data),
  delete: (id: number) => http.delete(`/volume/${id}`),
}
