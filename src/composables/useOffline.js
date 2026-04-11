// ─────────────────────────────────────────────────────────────
//  src/composables/useOffline.js
//  Vue composable — use in any component to get:
//    • isOnline        reactive online/offline state
//    • pendingCount    how many sales waiting to sync
//    • isSyncing       sync in progress
//    • syncError       last sync error message
//    • syncNow()       manually trigger sync
//    • retryFailed()   retry failed sales
// ─────────────────────────────────────────────────────────────
import { ref, onMounted, onUnmounted } from 'vue'
import {
  pendingCount,
  isSyncing,
  lastSyncAt,
  syncError,
  syncPendingSales,
  retryFailedSales
} from '@/services/syncService'

export function useOffline() {
  const isOnline = ref(navigator.onLine)

  function onOnline()  { isOnline.value = true  }
  function onOffline() { isOnline.value = false }

  onMounted(() => {
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
  })

  onUnmounted(() => {
    window.removeEventListener('online',  onOnline)
    window.removeEventListener('offline', onOffline)
  })

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncAt,
    syncError,
    syncNow:      syncPendingSales,
    retryFailed:  retryFailedSales
  }
}