import http from './api'

export default {
  getAllOrder() {
    return http.get('/v1/orders')
  },
  // createOrder(payload,loading) {
  //   return http.post('/v1/mart/pos/orders', payload, {
  //     meta: { loader:loading }
  //   })
  // },
  createOrder(payload,loading) {
    return http.post('/v1/mart/pos/customer-orders', payload, {
      meta: { loader:loading }
    })
  },
  getOrderByTable(tableNumber) {
    return http.get(`/orders/by-table/${tableNumber}`, {
      meta: { loader: 'skeleton' }
    })
  }
}
