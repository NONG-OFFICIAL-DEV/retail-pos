import { defineStore } from 'pinia'
import { productService } from '../api/product'

export const useProductStore = defineStore('product', {
  state: () => ({
    products: []
  }),

  actions: {
    async fetchProducts(filterParams = {}, loading) {
      const res = await productService.getProducts(filterParams, loading)
      this.products = res.data.data
    },
    async scanProduct(barcode) {
      const res = await productService.productsScan(barcode)
      return res.data
    }
  }
})
