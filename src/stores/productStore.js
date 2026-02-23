import { defineStore } from 'pinia'
import { productService } from '../api/product'

export const useProductStore = defineStore('product', {
  state: () => ({
    products: []
  }),

  actions: {
    async fetchProducts(filterParams = {}, loading) {
      const res = await productService.getAll(filterParams, loading)
      this.products = res.data
    },
    async addProduct(product) {
      await productService.create(product)
    },

    async updateProduct(product, id) {
      await productService.update(product, id)
    },

    async deleteProduct(id) {
      await productService.remove(id)
    },

    async scanProduct(barcode) {
      const res = await productService.productsScan(barcode)
      return res.data
    }
  }
})
