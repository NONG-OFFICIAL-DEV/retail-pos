import http from './api' // <-- your axios instance (with baseURL set)

/**
 * Category http service
 */
export default {
  // Get all categories
  getAll(filters, loading) {
    return http.get('/categories', {
      params: filters,
      meta: { loader: loading }
    })
  },

  // Get a single category by ID
  getById(id) {
    return http.get(`/categories/${id}`)
  },

  // Create a new category
  create(data) {
    return http.post('/categories', data)
  },

  // Update an existing category
  update(id, data) {
    return http.put(`/categories/${id}`, data)
  },

  // Delete a category
  delete(id) {
    return http.delete(`/categories/${id}`)
  }
}
