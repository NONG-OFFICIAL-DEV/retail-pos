import { defineStore } from 'pinia'
import { ref } from 'vue'
import { categoryMenuService } from '@/api/categoryMenu'

export const useCategoryMenuStore = defineStore('categoryMenu', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAllMenuCategory(loading) {
    loading.value = true
    try {
      const { data } = await categoryMenuService.getAll(loading)
      items.value = data.data || []
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  async function createItem(payload) {
    loading.value = true
    try {
      await categoryMenuService.create(payload)
      await fetchAllMenuCategory()
    } finally {
      loading.value = false
    }
  }

  async function updateItem(id, payload) {
    loading.value = true
    try {
      await categoryMenuService.update(id, payload)
      await fetchAllMenuCategory()
    } finally {
      loading.value = false
    }
  }

  async function deleteItem(id) {
    loading.value = true
    try {
      await categoryMenuService.delete(id)
      items.value = items.value.filter(item => item.id !== id)
    } finally {
      loading.value = false
    }
  }

  return {
    items,
    loading,
    error,
    fetchAllMenuCategory,
    createItem,
    updateItem,
    deleteItem
  }
})
