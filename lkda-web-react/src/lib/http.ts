import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import type { Result } from '@/types/api'
import { toast } from '@/components/ui/toast'

// ── 底层 axios 实例 ────────────────────────────────────────────
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截：自动注入 satoken
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('satoken')
  if (token) {
    config.headers['satoken'] = token
  }
  return config
})

// 响应拦截：Result<T> 解包 → 直接返回 data，401 踢出登录
http.interceptors.response.use(
  (response) => {
    // blob / arraybuffer 响应直接透传，不做 Result 解包
    const responseType = response.config.responseType
    if (responseType === 'blob' || responseType === 'arraybuffer') {
      return response
    }

    const result = response.data as Result<unknown>
    if (result.code === 2000) {
      // 将 Result.data 作为响应值返回（通过替换 response.data）
      response.data = result.data as unknown
      return response
    }

    // 业务错误提示
    toast.error(result.msg || '操作失败')
    return Promise.reject(result)
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('satoken')
      localStorage.removeItem('lkda_auth')
      toast.error('登录已过期，请重新登录')
      // 避免在登录页重复跳转
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    } else if (error.response?.data?.msg) {
      toast.error(error.response.data.msg)
    } else if (error.message === 'Network Error') {
      toast.error('网络异常，请检查网络连接')
    } else {
      toast.error('请求失败，请稍后重试')
    }
    return Promise.reject(error)
  }
)

// ── 请求去重缓存（300ms 内相同请求返回同一 Promise）─────────────
const dedupMap = new Map<string, Promise<unknown>>()

function getDedupKey(config: AxiosRequestConfig): string {
  return `${config.method || 'get'}:${config.url}:${JSON.stringify(config.params || {})}:${JSON.stringify(config.data || {})}`
}

export function request<T>(config: AxiosRequestConfig): Promise<T> {
  const key = getDedupKey(config)
  const existing = dedupMap.get(key)
  if (existing) {
    return existing as Promise<T>
  }

  const promise = http.request(config).then((res) => res.data as T)
  dedupMap.set(key, promise)

  promise
    .catch(() => {})
    .finally(() => {
      setTimeout(() => dedupMap.delete(key), 300)
    })

  return promise
}

// ── HTTP 方法快捷封装 ─────────────────────────────────────────
export const Http = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'get', url }),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'post', url, data }),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'put', url, data }),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'delete', url }),
}

export default http
