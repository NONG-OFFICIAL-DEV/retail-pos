// composables/useCurrency.js
import { useAuthStore } from '@/stores/authStore'

export function useCurrency() {
  const authStore = useAuthStore()

  const fmt = (value) => {
    if (value === null || value === undefined) return '—'

    const num = parseFloat(value)
    if (isNaN(num)) return '—'

    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: authStore.currency_decimals,
      maximumFractionDigits: authStore.currency_decimals,
    }).format(num)

    return authStore.currency_position === 'before'
      ? `${authStore.currency_symbol}${formatted}`
      : `${formatted}${authStore.currency_symbol}`
  }

  return { fmt, currency: authStore.currency }
}