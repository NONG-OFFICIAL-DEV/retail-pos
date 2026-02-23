import { defineStore } from 'pinia'
import categoryService from '../api/category'

export const useCategoryStore = defineStore('category', {
  state: () => ({
    categories: []
  }),

  actions: {
    async fetchCategories(filters, loading) {
      const res = await categoryService.getAll(filters, loading)
      this.categories = res.data
    },

    async addCategory(data) {
      await categoryService.create(data)
      this.fetchCategories()
    },

    async updateCategory(id, data) {
      await categoryService.update(id, data)
      await this.fetchCategories()
    },

    async deleteCategory(id) {
      await categoryService.delete(id)
      await this.fetchCategories()
    }
  }
})
