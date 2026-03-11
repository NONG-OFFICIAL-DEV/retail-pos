import { defineStore } from 'pinia'
import categoryService from '../api/category'

export const useCategoryStore = defineStore('category', {
  state: () => ({
    categories: []
  }),

  actions: {
    async fetchCategories(filters, loading) {
      const res = await categoryService.getAll(filters, loading)
      this.categories = res.data.data
    }
  }
})
