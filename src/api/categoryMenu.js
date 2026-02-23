import http from './api'

const BASE_URL = '/category-menus'

export const categoryMenuService = {
  getAll(loading) {
    return http.get(BASE_URL, {
      meta: { loader: loading }
    })
  },

  getById(id) {
    return http.get(`${BASE_URL}/${id}`)
  },

  create(payload) {
    return http.post(BASE_URL, payload)
  },

  update(id, payload) {
    return http.put(`${BASE_URL}/${id}`, payload)
  },

  delete(id) {
    return http.delete(`${BASE_URL}/${id}`)
  }
}
