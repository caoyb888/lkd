import axios from 'axios'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('satoken')
  if (token) {
    config.headers['satoken'] = token
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    const data = response.data
    if (data.code !== 2000) {
      return Promise.reject(new Error(data.msg || '请求失败'))
    }
    return data.data
  },
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default http
