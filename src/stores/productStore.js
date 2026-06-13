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
    async lookupProductByBarcode(barcode) {
      const data = await productService.scanBarcode(barcode) // your renamed fn

      // Merge into local list if not already there
      const exists = this.products.find(p => p.id === data.id)
      if (!exists) this.products.push(data)

      return data
    }
    // async lookupProductByBarcode(barcode) {
    //   const res = await productService.scanBarcode(barcode)
    //   return res.data
    // }
  }
})
