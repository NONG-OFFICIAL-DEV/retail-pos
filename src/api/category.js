import http from './api' // <-- your axios instance (with baseURL set)

/**
 * Category http service
 */
export default {
  // Get all categories
  getAll(filters, loading) {
    return http.get('/v1/categories', {
      params: filters,
      meta: { loader: loading }
    })
  },

  // Get a single category by ID
  getById(id) {
    return http.get(`/categories/${id}`)
  },
}
