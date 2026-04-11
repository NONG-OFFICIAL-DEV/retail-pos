<template>
  <v-app class="bg-grey-lighten-5">
    <Notif ref="notifRef" dismissible :default-timeout="2000" />
    <Confirm ref="confirmRef" />
    <router-view />
    <Loading />

    <!-- Offline banner — fixed below AppBar, only shows when offline -->
    <v-banner
      v-if="!isOnline"
      color="warning"
      icon="mdi-wifi-off"
      lines="one"
      class="offline-banner"
    >
      <v-banner-text class="text-body-2">
        You are <strong>offline</strong>. Cash sales will be saved and synced automatically when internet returns.
        <strong v-if="pendingCount > 0"> · {{ pendingCount }} sale(s) pending.</strong>
      </v-banner-text>
    </v-banner>
  </v-app>
</template>

<script setup>
import { ref, onMounted, getCurrentInstance } from 'vue'
import Notif from '@/components/global/Notification.vue'
import Confirm from '@/components/global/Confirm.vue'
import Loading from '@/components/global/Loading.vue'
import { initSyncService } from '@/services/syncService'
import { useOffline } from '@/composables/useOffline'

// Refs to components
const notifRef   = ref(null)
const confirmRef = ref(null)

// Offline state — reactive, auto-updates when internet changes
const { isOnline, pendingCount } = useOffline()

// Get current Vue instance
const instance = getCurrentInstance()

onMounted(async () => {
  const app = instance.appContext.app

  // Register global methods (same as before)
  app.config.globalProperties.$notif   = notifRef.value?.newAlert
  app.config.globalProperties.$confirm = confirmRef.value?.open

  // Restore saved language preference (same as before)
  const savedLang = localStorage.getItem('lang')
  if (savedLang) {
    instance.appContext.config.globalProperties.$i18n.locale = savedLang
  }

  // ← NEW: Start offline sync service
  // Registers: auto-sync on internet return, sync on tab focus
  await initSyncService()
})
</script>

<style>
html, body {
  overflow-y: auto;
  width: 100%;
  overflow-x: hidden;
  overscroll-behavior-x: none;
  height: 100%;
}

#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  -webkit-text-size-adjust: 100%;
}

body {
  font-family: 'Poppins', sans-serif;
}

::-webkit-scrollbar {
  display: none;
}

/* ── Tablet fullscreen fix ────────────────────────────────────────
   100dvh = dynamic viewport height
   Adjusts automatically when Android browser bar shows/hides
   This is the fix for your scroll up/down problem on tablet      */
.v-application {
  height: 100dvh !important;
  max-height: 100dvh !important;
  overflow: hidden !important;
}

.v-main {
  height: 100dvh !important;
  overflow: hidden !important;
}

/* Offline banner — sits just below AppBar (56px = your appbar height) */
.offline-banner {
  position: fixed !important;
  top: 56px;
  left: 0;
  right: 0;
  z-index: 1000;
}
</style>