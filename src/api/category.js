import http from './api' // <-- your axios instance (with baseURL set)

/**
 * Category http service
 */
export default {
  // Get all categories
  getAll(filters, loading) {
    return http.get('/v1/mart/pos/categories', {
      params: filters,
      meta: { loader: loading }
    })
  }
}
