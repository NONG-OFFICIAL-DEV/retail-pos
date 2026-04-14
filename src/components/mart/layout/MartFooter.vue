<template>
  <v-footer app color="white" border height="32" class="px-4">
    <div class="d-flex w-100 justify-space-between align-center">

      <!-- Left: DB status -->
      <div class="d-flex align-center gap-1">
        <v-icon icon="mdi-database-check" size="14" color="success" />
        <span class="footer-text">DB SYNCED</span>
      </div>

      <!-- Center: USB printer status (Android only) -->
      <div v-if="usbSupported" class="d-flex align-center gap-1">
        <template v-if="usbConnected">
          <v-icon icon="mdi-printer-check" size="14" color="success" />
          <span class="footer-text">PRINTER READY</span>
        </template>
        <template v-else>
          <v-icon icon="mdi-printer-off" size="14" color="warning" />
          <span
            class="footer-text footer-link"
            @click="connectUsb"
          >CONNECT PRINTER</span>
        </template>
      </div>

      <!-- Right: Version -->
      <div class="footer-text">V.2.4.0-MART © {{ year }}</div>

    </div>
  </v-footer>
</template>

<script setup>
defineProps({
  connectUsb:   { type: Function, default: null },
  usbConnected: { type: Boolean,  default: false },
  usbSupported: { type: Boolean,  default: false },
})

const year = new Date().getFullYear()
</script>

<style scoped>
.footer-text {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #94a3b8;
}
.footer-link {
  color: #f59e0b;
  cursor: pointer;
  text-decoration: underline;
}
.footer-link:hover {
  color: #d97706;
}
.gap-1 {
  gap: 4px;
}
</style>