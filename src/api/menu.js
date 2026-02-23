import http from './api'

const API_BASE = '/menus' // adjust according to your backend route

export const menuService = {
  fetchMenus() {
    return http.get(API_BASE, {
      meta: { loader: 'skeleton' }
    })
  },

  fetchMenu(id) {
    return http.get(`${API_BASE}/${id}`)
  },

  createMenu(data) {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'image' && value) {
        formData.append('image', value)
      } else if (key === 'sizes' || key === 'recipes') {
        formData.append(key, JSON.stringify(value))
      } else {
        formData.append(key, value)
      }
    })

    return http.post(API_BASE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  updateMenu(id, data) {
    const formData = new FormData()
    formData.append('_method', 'PUT')
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'image' && value) {
        formData.append('image', value)
      } else if (key === 'sizes' || key === 'recipes') {
        formData.append(key, JSON.stringify(value))
      } else {
        formData.append(key, value)
      }
    })

    return http.post(`${API_BASE}/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  deleteMenu(id) {
    return http.delete(`${API_BASE}/${id}`)
  }
}
