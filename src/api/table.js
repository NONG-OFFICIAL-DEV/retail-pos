import http from './api'

export default {
  getAllTables(params = {}) {
    return http.get('/tables', { params })
  },

  getTable(id) {
    return http.get(`/tables/${id}`)
  },

  createTable(data) {
    return http.post('/tables', data)
  },

  updateTable(id, data) {
    return http.put(`/tables/${id}`, data)
  },

  deleteTable(id) {
    return http.delete(`/tables/${id}`)
  },

  // POS / KDS
  updateStatus(id, status) {
    return http.patch(`/tables/${id}/status`, { status })
  },
  // POS / KDS
  getTableNumberByToken(token) {
    return http.get(`/tables/table-by-token/${token}`, {
      meta: { loader: 'nothing' }
    })
  },

  showQRCode(tableId) {
    return http.get(`/tables/${tableId}/qrcode`)
  }
}
