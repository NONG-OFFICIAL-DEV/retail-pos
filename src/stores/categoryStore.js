// ─────────────────────────────────────────────────────────────
//  src/stores/categoryStore.js
//  Pinia store — offline-aware
// ─────────────────────────────────────────────────────────────
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { offlineCategoryService } from '@/services/offlineProductService'

export const useCategoryStore = defineStore('category', () => {
  const categories  = ref([])
  const isLoading   = ref(false)
  const fromCache   = ref(false)

  async function fetchCategories(params = {}) {
    isLoading.value = true
    fromCache.value = false
    try {
      const result = await offlineCategoryService.getAll(params)

      // Handle { data: { data: [...] } }, { data: [...] }, or plain array
      const raw  = result?.data ?? result ?? []
      const list = Array.isArray(raw) ? raw : (raw.data ?? [])
      categories.value = list
      fromCache.value  = !!result?.fromCache
    } catch (err) {
      console.error('[categoryStore] fetchCategories failed:', err)
      // Last resort: try IndexedDB directly
      const { categoryDB } = await import('@/services/db')
      categories.value = await categoryDB.getAll()
      fromCache.value  = true
    } finally {
      isLoading.value = false
    }
  }

  return { categories, isLoading, fromCache, fetchCategories }
})