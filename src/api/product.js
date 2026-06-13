import http from './api'

export const productService = {
  async getProducts(params = {}, loading) {
    const res = await http.get('/v1/mart/pos/products', {
      params,
      meta: { loader: loading }
    })

    return res.data
  },
  async scanBarcode(barcode) {
    return await http.post(`/v1/mart/pos/scan/${barcode}`)
  }
}
