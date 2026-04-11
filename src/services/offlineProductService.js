// ─────────────────────────────────────────────────────────────
//  src/services/offlineProductService.js
//  Smart product service:
//    Online  → fetch from API + update cache
//    Offline → serve from IndexedDB cache
// ─────────────────────────────────────────────────────────────
import { productDB, categoryDB } from './db'
import { productService } from '../api/product'   // your existing service
import categoryService from '../api/category'     // your existing service

// ─────────────────────────────────────────────────────────────
//  PRODUCTS
// ─────────────────────────────────────────────────────────────
export const offlineProductService = {

  /**
   * Get products — online fetches & caches, offline uses cache
   */
  async getProducts(params = {}, loading) {
    if (navigator.onLine) {
      try {
        const data = await productService.getProducts(params, loading)
        // Cache the full flat list (handle pagination if needed)
        const list = data?.data || data || []
        if (list.length > 0) await productDB.saveAll(list)
        return data
      } catch (err) {
        // Network failed, fall to cache
        console.warn('[Offline] Product fetch failed, using cache')
        return await _productsFromCache()
      }
    } else {
      return await _productsFromCache()
    }
  },

  /**
   * Scan barcode — online tries API first, offline uses cache
   */
  async scanBarcode(barcode) {
    if (navigator.onLine) {
      try {
        const res = await productService.productsScan(barcode)
        return res.data
      } catch (err) {
        if (!err.response) {
          // Network error → try cache
          return await productDB.getByBarcode(barcode)
        }
        throw err
      }
    } else {
      const product = await productDB.getByBarcode(barcode)
      if (!product) throw new Error(`Product not found for barcode: ${barcode}`)
      return product
    }
  },

  /** Force refresh cache from server (call on login or manual refresh) */
  async refreshCache(loading) {
    if (!navigator.onLine) return false
    try {
      const data = await productService.getProducts({}, loading)
      const list = data?.data || data || []
      await productDB.saveAll(list)
      console.log(`[Cache] Saved ${list.length} products`)
      return true
    } catch (err) {
      console.error('[Cache] Failed to refresh products', err)
      return false
    }
  },

  async getCachedCount() {
    return productDB.count()
  }
}

async function _productsFromCache() {
  const list = await productDB.getAll()
  return { data: list, fromCache: true }
}

// ─────────────────────────────────────────────────────────────
//  CATEGORIES
// ─────────────────────────────────────────────────────────────
export const offlineCategoryService = {

  async getAll(filters, loading) {
    if (navigator.onLine) {
      try {
        const res = await categoryService.getAll(filters, loading)
        const list = res?.data?.data || res?.data || []
        if (list.length > 0) await categoryDB.saveAll(list)
        return res
      } catch (err) {
        console.warn('[Offline] Category fetch failed, using cache')
        return await _categoriesFromCache()
      }
    } else {
      return await _categoriesFromCache()
    }
  },

  async refreshCache() {
    if (!navigator.onLine) return false
    try {
      const res = await categoryService.getAll()
      const list = res?.data?.data || res?.data || []
      await categoryDB.saveAll(list)
      console.log(`[Cache] Saved ${list.length} categories`)
      return true
    } catch (err) {
      console.error('[Cache] Failed to refresh categories', err)
      return false
    }
  }
}

async function _categoriesFromCache() {
  const list = await categoryDB.getAll()
  return { data: { data: list }, fromCache: true }
}

// ─────────────────────────────────────────────────────────────
//  WARM UP CACHE  –  call after login to pre-load everything
// ─────────────────────────────────────────────────────────────
export async function warmUpCache() {
  console.log('[Cache] Warming up...')
  await Promise.all([
    offlineProductService.refreshCache(),
    offlineCategoryService.refreshCache()
  ])
  console.log('[Cache] Warm up complete')
}