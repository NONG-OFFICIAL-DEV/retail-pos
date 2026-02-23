<template>
  <v-overlay
    :model-value="loadingStore.isLoading && loadingStore.mode === 'overlay'"
    class="align-center justify-center"
    persistent
  >
    <v-progress-circular
      color="primary"
      size="64"
      class="my-4"
      :indeterminate="true"
    />
  </v-overlay>
</template>

<script setup>
  import { useLoadingStore } from '@/stores/loadingStore'
  const loadingStore = useLoadingStore()
</script>
