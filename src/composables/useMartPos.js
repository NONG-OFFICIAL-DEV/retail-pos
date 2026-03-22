// composables/useMartPos.js
import { computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useMartStore } from '@/stores/martStore'
import { useAppUtils } from '@/composables/useAppUtils'

export function useMartPos() {
  const auth = useAuthStore()
  const mart = useMartStore()
  const { notif } = useAppUtils()

  const operator = computed(() => ({
    displayName: [auth.me?.first_name, auth.me?.last_name]
      .filter(Boolean)
      .join(' '),
    roleName: auth.role_name ?? '',
    branchName: auth.branch_name ?? '',
    buName: auth.bu_name ?? '',
    branchId: auth.branch_id ?? null,
    avatar: auth.me?.avatar ?? null,
    initials: getInitials(auth.me?.first_name, auth.me?.last_name),
    notificationsCount: auth.unread_notifications_count ?? 0
  }))

  const cart = computed(() => ({
    items: mart.cartItems,
    subtotal: mart.subtotal,
    total: mart.total,
    paymentMethod: mart.paymentMethod,
    isEmpty: mart.isEmpty,
    itemCount: mart.itemCount,
    loading: mart.loading
  }))

  // ── Actions — pass item.id not the whole object ────────────────────────
  const addToCart = product => mart.addToCart(product)
  const updateQty = (key, qty) => mart.updateQty(key, qty) // ← item.id
  const removeItem = key => mart.removeFromCart(key) // ← item.id
  const clearCart = () => mart.clearCart()
  const setPayment = method => mart.setPaymentMethod(method)
  const checkout = async () => {
    await mart.checkout(notif)
  }

  return {
    operator,
    cart,
    addToCart,
    updateQty,
    removeItem,
    clearCart,
    setPayment,
    checkout
  }
}

function getInitials(first, last) {
  if (first && last) return (first[0] + last[0]).toUpperCase()
  if (first) return first.slice(0, 2).toUpperCase()
  return 'OP'
}
