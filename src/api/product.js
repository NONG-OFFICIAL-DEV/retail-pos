import http from './api'

export const productService = {
  async getAll(params = {}, loading) {
    const res = await http.get('/products', {
      params,
      meta: { loader: loading }
    })

    return res.data
  },

  async getById(id) {
    const res = await http.get(`/products/${id}`)
    return res.data
  },
  async create(product) {
    const res = await http.post('/products', product, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return res.data
  },
  async update(product, id) {
    const res = await http.put(`/products/${id}`, product, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return res.data
  },
  async remove(id) {
    await http.delete(`/products/${id}`)
  },
  async productsScan(barcode) {
    return await http.get(`/products/scan/${barcode}`)
  }
}
