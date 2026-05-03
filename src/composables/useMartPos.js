// composables/useMartPos.js
import { computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useMartStore } from '@/stores/martStore'
import { useAppUtils } from '@/composables/useAppUtils'

export function useMartPos() {
  const auth = useAuthStore()
  const mart = useMartStore()
  const { notif } = useAppUtils()

  // ── Operator ────────────────────────────────────────────────────────────
  const operator = computed(() => {
    const branches = auth.branches ?? []
    const activeBranchId = auth.active_branch_id
      ?? branches[0]?.id
      ?? null

    return {
      displayName  : buildDisplayName(auth.me?.first_name, auth.me?.last_name),
      initials     : getInitials(auth.me?.first_name, auth.me?.last_name),
      avatar       : auth.me?.avatar_url ?? null,
      roleName     : auth.role_name  ?? '',
      branchName   : auth.branch_name ?? '',
      buName       : auth.bu_name    ?? '',
      branchId     : auth.branch_id  ?? null,
      branches,
      currentBranchId        : activeBranchId,
      notificationsCount     : auth.unread_notifications_count ?? 0,
      isOwner                : auth.is_owner ?? false,
    }
  })

  // ── Cart ────────────────────────────────────────────────────────────────
  const cart = computed(() => ({
    items        : mart.cartItems,
    subtotal     : mart.subtotal,
    total        : mart.total,
    paymentMethod: mart.paymentMethod,
    isEmpty      : mart.isEmpty,
    itemCount    : mart.itemCount,
    loading      : mart.loading,
  }))

  // ── Cart actions ────────────────────────────────────────────────────────
  const addToCart  = (product)    => mart.addToCart(product)
  const updateQty  = (key, qty)   => mart.updateQty(key, qty)
  const removeItem = (key)        => mart.removeFromCart(key)
  const clearCart  = ()           => mart.clearCart()
  const setPayment = (method)     => mart.setPaymentMethod(method)

  const checkout = async () => {
    if (cart.value.isEmpty) {
      notif('warning', 'Cart is empty')
      return
    }
    await mart.checkout(notif)
  }

  // ── Branch actions ───────────────────────────────────────────────────────
  const switchBranch = (branch) => {
    auth.setActiveBranch(branch)
  }

  return {
    operator,
    cart,
    addToCart,
    updateQty,
    removeItem,
    clearCart,
    setPayment,
    checkout,
    switchBranch,
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function buildDisplayName(first, last) {
  return [first, last].filter(Boolean).join(' ') || 'Operator'
}

function getInitials(first, last) {
  if (first && last) return (first[0] + last[0]).toUpperCase()
  if (first)         return first.slice(0, 2).toUpperCase()
  return 'OP'
}