<template>
  <v-footer app color="white" border height="36" class="px-4">
    <div class="d-flex w-100 justify-space-between align-center">
      <!-- Left: connectivity + printer status -->
      <div class="d-flex align-center gap-2">
        <v-chip
          size="x-small"
          variant="tonal"
          rounded="lg"
          :color="isOnline ? 'success' : 'warning'"
          class="footer-chip"
        >
          <v-icon
            start
            size="11"
            :icon="isOnline ? 'mdi-database-check' : 'mdi-database-off'"
          />
          {{ isOnline ? t('footer.synced') : t('footer.offline') }}
        </v-chip>

        <v-chip
          v-if="usbSupported"
          size="x-small"
          variant="tonal"
          rounded="lg"
          :color="usbConnected ? 'success' : 'warning'"
          class="footer-chip"
          :class="{ 'cursor-pointer': !usbConnected }"
          @click="!usbConnected && connectUsb?.()"
        >
          <v-icon
            start
            size="11"
            :icon="usbConnected ? 'mdi-printer-check' : 'mdi-printer-off'"
          />
          {{ usbConnected ? t('printer.ready') : t('printer.connect') }}
        </v-chip>
      </div>

      <!-- Right: version -->
      <div class="footer-text">V.2.4.0-MART © {{ year }}</div>
    </div>
  </v-footer>
</template>

<script setup>
  import { ref, onMounted, onUnmounted } from 'vue'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()

  defineProps({
    connectUsb: { type: Function, default: null },
    usbConnected: { type: Boolean, default: false },
    usbSupported: { type: Boolean, default: false }
  })

  const year = new Date().getFullYear()

  const isOnline = ref(navigator.onLine)
  const setOnline = () => (isOnline.value = true)
  const setOffline = () => (isOnline.value = false)

  onMounted(() => {
    window.addEventListener('online', setOnline)
    window.addEventListener('offline', setOffline)
  })
  onUnmounted(() => {
    window.removeEventListener('online', setOnline)
    window.removeEventListener('offline', setOffline)
  })
</script>

<style scoped>
  .footer-text {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #94a3b8;
  }
  .footer-chip {
    font-size: 0.6rem !important;
    font-weight: 700 !important;
    letter-spacing: 0.4px;
    height: 20px !important;
  }
  .cursor-pointer {
    cursor: pointer;
  }
  .gap-2 {
    gap: 8px;
  }
</style>
