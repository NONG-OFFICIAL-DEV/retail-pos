import { ref, watch, computed } from 'vue'

// 1. Initialize from localStorage outside the function to share state across components
const cart = ref(JSON.parse(localStorage.getItem('coffee_shop_cart') || '[]'))

export function useCart() {
  
  // 2. Watcher to sync changes to localStorage
  watch(
    cart,
    (newCart) => {
      localStorage.setItem('coffee_shop_cart', JSON.stringify(newCart))
    },
    { deep: true }
  )

  // --- COMPUTED TOTALS ---
  // Calculates total number of items (e.g., 2 Lattes + 1 Cake = 3)
  const totalItems = computed(() =>
    cart.value.reduce((sum, item) => sum + item.qty, 0)
  )

  // Calculates total price (qty * price)
  const cartTotal = computed(() =>
    cart.value.reduce((sum, item) => sum + item.price * item.qty, 0)
  )

  // --- ACTIONS ---
  function addToCart(product) {
    const existing = cart.value.find((i) => i.id === product.id)
    if (existing) {
      existing.qty++
    } else {
      // Ensure we spread the product and add qty 1
      cart.value.push({ ...product, qty: 1 })
    }
  }

  function updateQty(id, delta) {
    const item = cart.value.find((i) => i.id === id)
    if (item) {
      item.qty += delta
      if (item.qty <= 0) {
        cart.value = cart.value.filter((i) => i.id !== id)
      }
    }
  }

  function clearCart() {
    cart.value = []
    localStorage.removeItem('coffee_shop_cart')
  }

  return {
    cart,
    totalItems,
    cartTotal,
    addToCart,
    updateQty,
    clearCart
  }
}