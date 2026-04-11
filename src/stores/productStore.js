// ─────────────────────────────────────────────────────────────
//  src/stores/productStore.js
//  Pinia store — offline-aware
//  Online  → fetch from API + save to IndexedDB cache
//  Offline → load from IndexedDB cache
// ─────────────────────────────────────────────────────────────
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { offlineProductService } from '@/services/offlineProductService'

export const useProductStore = defineStore('product', () => {
  const products    = ref([])
  const isLoading   = ref(false)
  const fromCache   = ref(false)   // true when data came from IndexedDB

  async function fetchProducts(params = {}) {
    isLoading.value = true
    fromCache.value = false
    try {
      const result = await offlineProductService.getProducts(params)

      // Handle both { data: [...] } and plain array responses
      const list = result?.data ?? result ?? []
      products.value  = Array.isArray(list) ? list : (list.data ?? [])
      fromCache.value = !!result?.fromCache
    } catch (err) {
      console.error('[productStore] fetchProducts failed:', err)
      // Last resort: try IndexedDB directly
      const { productDB } = await import('@/services/db')
      products.value  = await productDB.getAll()
      fromCache.value = true
    } finally {
      isLoading.value = false
    }
  }

  return { products, isLoading, fromCache, fetchProducts }
})