<template>
  <v-footer app color="white" border height="32" class="px-4">
    <div class="d-flex w-100 justify-space-between align-center">
      <div class="d-flex align-center gap-1">
        <v-icon icon="mdi-database-check" size="14" color="success" />
        <span class="footer-text">DB SYNCED</span>
      </div>
      <div class="footer-text">V.2.4.0-MART © {{ year }}</div>
    </div>
  </v-footer>
</template>

<script setup>
  const year = new Date().getFullYear()
</script>

<style scoped>
  .footer-text {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #94a3b8;
  }
  .gap-1 {
    gap: 4px;
  }
</style>
