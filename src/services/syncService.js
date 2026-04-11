// ─────────────────────────────────────────────────────────────
//  src/services/syncService.js
//  Handles:
//    • Creating orders (online → direct API, offline → queue)
//    • Auto-sync when internet returns
//    • Manual sync trigger
//    • Reactive pending count for AppBar badge
// ─────────────────────────────────────────────────────────────
import { ref, readonly } from 'vue'
import { pendingSalesDB } from './db'
import orderService from '../api/order'      // your existing order service

// ── Reactive state (used by AppBar badge) ────────────────────
const _pendingCount  = ref(0)
const _isSyncing     = ref(false)
const _lastSyncAt    = ref(null)
const _syncError     = ref(null)

export const pendingCount = readonly(_pendingCount)
export const isSyncing    = readonly(_isSyncing)
export const lastSyncAt   = readonly(_lastSyncAt)
export const syncError    = readonly(_syncError)

// ─────────────────────────────────────────────────────────────
//  REFRESH pending count (call after any DB change)
// ─────────────────────────────────────────────────────────────
async function refreshCount() {
  _pendingCount.value = await pendingSalesDB.countPending()
}

// ─────────────────────────────────────────────────────────────
//  CREATE ORDER  –  smart: online = direct, offline = queue
// ─────────────────────────────────────────────────────────────
/**
 * @param {Object} payload  – same payload for POST /v1/mart/pos/orders
 * @returns {{ success, data, offline }}
 */
export async function createOrder(payload) {
  if (navigator.onLine) {
    // ── Online: send directly ───────────────────────────────
    try {
      const res = await orderService.createOrder(payload)
      return { success: true, data: res.data, offline: false }
    } catch (err) {
      // Network error even though navigator.onLine? Queue it.
      if (!err.response) {
        return await _queueOrder(payload)
      }
      throw err  // real server error (validation, 422, etc.) → let caller handle
    }
  } else {
    // ── Offline: queue locally ──────────────────────────────
    return await _queueOrder(payload)
  }
}

async function _queueOrder(payload) {
  const localId = await pendingSalesDB.add(payload)
  await refreshCount()
  return {
    success: true,
    offline: true,
    localId,
    message: 'Sale saved offline. Will sync when internet returns.'
  }
}

// ─────────────────────────────────────────────────────────────
//  SYNC  –  push all pending sales to server
// ─────────────────────────────────────────────────────────────
export async function syncPendingSales() {
  if (_isSyncing.value) return   // already running
  if (!navigator.onLine) return  // still offline

  const pending = await pendingSalesDB.getPending()
  if (pending.length === 0) return

  _isSyncing.value = true
  _syncError.value = null

  let successCount = 0
  let failCount    = 0

  for (const sale of pending) {
    try {
      await pendingSalesDB.markSyncing(sale.localId)

      // Strip local-only fields before sending to server
      const { localId, status, retries, createdAt, updatedAt, lastError, ...serverPayload } = sale

      await orderService.createOrder(serverPayload)

      // Success → remove from queue
      await pendingSalesDB.remove(sale.localId)
      successCount++

    } catch (err) {
      const errMsg = err?.response?.data?.message || err.message || 'Unknown error'
      await pendingSalesDB.markFailed(sale.localId, errMsg)
      failCount++
      console.error(`[Sync] Failed to sync sale #${sale.localId}:`, errMsg)
    }
  }

  await refreshCount()
  _isSyncing.value = false
  _lastSyncAt.value = new Date()

  if (failCount > 0) {
    _syncError.value = `${failCount} sale(s) failed to sync. Tap to retry.`
  }

  console.log(`[Sync] Done — ${successCount} synced, ${failCount} failed`)
  return { successCount, failCount }
}

// ─────────────────────────────────────────────────────────────
//  RETRY FAILED  –  reset failed → pending and sync again
// ─────────────────────────────────────────────────────────────
export async function retryFailedSales() {
  const count = await pendingSalesDB.retryFailed()
  _syncError.value = null
  if (count > 0) await syncPendingSales()
  return count
}

// ─────────────────────────────────────────────────────────────
//  GET ALL PENDING  –  for showing list in UI
// ─────────────────────────────────────────────────────────────
export async function getPendingSales() {
  return pendingSalesDB.getAll()
}

// ─────────────────────────────────────────────────────────────
//  INIT  –  call once in App.vue
//  Sets up auto-sync when internet returns
// ─────────────────────────────────────────────────────────────
export async function initSyncService() {
  // Load initial count
  await refreshCount()

  // Auto-sync when internet comes back
  window.addEventListener('online', async () => {
    console.log('[Sync] Internet restored — syncing pending sales...')
    await syncPendingSales()
  })

  // Also sync on page visibility (user switches back to tab)
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      await syncPendingSales()
    }
  })
}