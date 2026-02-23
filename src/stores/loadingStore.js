import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useLoadingStore = defineStore('loading', () => {
  const count = ref(0)
  const mode = ref('overlay') // 'overlay' | 'skeleton'

  const isLoading = computed(() => count.value > 0)

  function start(type = 'overlay') {
    mode.value = type
    count.value++
  }

  function stop() {
    count.value = Math.max(0, count.value - 1)
    return count.value
  }

  return {
    isLoading,
    mode,
    start,
    stop
  }
})
