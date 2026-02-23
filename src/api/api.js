import { useLoadingStore } from '@/stores/loadingStore'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_APP_API_BASE_URL,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Content-type': 'application/json'
  }
})

// Get store instance
const loadingStore = useLoadingStore()
// Request Interceptor
api.interceptors.request.use(async config => {
  const loaderType = config.meta?.loader || 'overlay'
  try {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    loadingStore.start(loaderType)
    return config
  } catch (error) {
    loadingStore.stop()
    return Promise.reject(error)
  }
})

// Response Interceptor
api.interceptors.response.use(
  response => {
    loadingStore.stop()
    return response
  },

  error => {
    loadingStore.stop()
    return Promise.reject(error)
  }
)

export default api
