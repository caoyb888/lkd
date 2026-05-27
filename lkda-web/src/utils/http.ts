import axios, {
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { ElMessage } from 'element-plus'
import { getToken } from './auth'
import type { Result } from '@/types/api.d.ts'

// ── 底层 axios 实例 ────────────────────────────────────────────
const instance = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// 请求拦截：自动注入 Token
instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken()
  if (token) {
    config.headers['satoken'] = token
  }
  return config
})

// 响应拦截：Result<T> 解包 → 直接返回 data，401 踢出登录
instance.interceptors.response.use(
  (response: AxiosResponse<Result<unknown>>) => {
    // blob / arraybuffer 响应直接透传，不做 Result 解包
    const responseType = response.config.responseType
    if (responseType === 'blob' || responseType === 'arraybuffer') {
      return response.data as unknown as AxiosResponse
    }
    const result = response.data
    if (result.code === 2000) {
      // 将 Result.data 作为最终响应值返回，配合下方类型门面实现 Promise<T>
      return result.data as unknown as AxiosResponse
    }
    ElMessage.error(result.msg || '操作失败')
    return Promise.reject(result)
  },
  (error) => {
    if (error.response?.status === 401) {
      import('@/stores/auth').then(({ useAuthStore }) => {
        useAuthStore().logout()
      })
      import('@/router').then(({ default: router }) => {
        router.push('/login')
      })
      ElMessage.error('登录已过期，请重新登录')
    } else if (error.response?.data?.msg) {
      ElMessage.error(error.response.data.msg)
    } else {
      ElMessage.error('网络异常，请稍后重试')
    }
    return Promise.reject(error)
  },
)

// ── 请求去重缓存（300ms 内相同请求返回同一 Promise）─────────────
interface CachedPromise {
  promise: Promise<unknown>
  timestamp: number
}

const pendingMap = new Map<string, CachedPromise>()
const DEDUP_TTL = 300

function getCacheKey(method: string, url: string, config?: AxiosRequestConfig): string {
  const params = JSON.stringify(config?.params) ?? ''
  const data = JSON.stringify(config?.data) ?? ''
  return `${method}_${url}_${params}_${data}`
}

function dedupRequest<T>(
  method: string,
  url: string,
  executor: () => Promise<T>,
  config?: AxiosRequestConfig,
): Promise<T> {
  const key = getCacheKey(method, url, config)
  const now = Date.now()
  const cached = pendingMap.get(key)

  if (cached && now - cached.timestamp < DEDUP_TTL) {
    return cached.promise as Promise<T>
  }

  const promise = executor()
  pendingMap.set(key, { promise, timestamp: now })

  promise.finally(() => {
    setTimeout(() => pendingMap.delete(key), DEDUP_TTL)
  })

  return promise
}

/**
 * 类型门面：将 axios 的 Promise<AxiosResponse<T>> 声明为 Promise<T>。
 * 拦截器已在运行时完成解包，这里的类型声明与实际行为一致。
 * 用法：http.get<UserInfoVO>('/auth/userinfo')  → Promise<UserInfoVO>
 */
const http = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return dedupRequest('GET', url, () => instance.get<T, T>(url, config), config)
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return dedupRequest('POST', url, () => instance.post<T, T>(url, data, config), { ...config, data })
  },
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return dedupRequest('PUT', url, () => instance.put<T, T>(url, data, config), { ...config, data })
  },
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return dedupRequest('PATCH', url, () => instance.patch<T, T>(url, data, config), { ...config, data })
  },
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return dedupRequest('DELETE', url, () => instance.delete<T, T>(url, config), config)
  },
}

export default http
