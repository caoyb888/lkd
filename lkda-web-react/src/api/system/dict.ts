import http from '@/lib/http'

export const DictApi = {
  allMap: () => http.get<Record<string, { itemValue: string; itemLabel: string }[]>>('/dict/all-map'),
}
