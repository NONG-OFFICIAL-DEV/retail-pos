import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const usePosStore = defineStore('pos', () => {
  /** CART STATE */
  const cart = ref([]) // array of { id, name, price, qty, customizations, image_url }

  /** PAYMENT METHOD */
  const paymentMethod = ref('qr') // default to QR
  const orderId = ref(null) // default to QR

  /** STORES / SELECTED */
  const stores = [
    { id: 1, name: 'Mart', type: 'retail' },
    { id: 2, name: 'Coffee Shop', type: 'coffee' },
    { id: 3, name: 'Restaurant', type: 'hospitality' },
  ]

  const paymentMethods = [
    { id: 'qr', icon: 'mdi-qrcode-scan', label: 'QR' },
    { id: 'cash', icon: 'mdi-cash', label: 'Cash' },
    { id: 'card', icon: 'mdi-credit-card-outline', label: 'Card' }
  ]

  const selectedStore = ref(stores[2]) // default store

  /** SELECTED TABLE (Hospitality only) */
  const selectedTable = ref(null)
  /** SELECTED BILL (for unpaid orders) */
  const selectedBill = ref([])
  const isPrintBill = ref(false)

  /** COMPUTED TOTAL */
  /** ACTIVE ITEMS TO CALCULATE TOTAL */
  const activeItems = computed(() => {
    return isPrintBill.value ? selectedBill.value : cart.value
  })

  /** COMPUTED TOTALS */
  const subtotal = computed(() =>
    activeItems.value.reduce((sum, i) => sum + i.price * i.qty, 0)
  )
  const total = computed(() => subtotal.value) // placeholder for taxes/discounts

  /** -------------------
   * ACTIONS
   * ------------------- */

  function selectStore(store) {
    selectedStore.value = store
    clearCart()
    selectedTable.value = null
  }

  function selectTable(table) {
    selectedTable.value = table
  }

  function selectBill(bill) {
    isPrintBill.value = true
    selectedBill.value = bill.items
    selectedTable.value = null
    clearCart()
  }

  function addToCart(item) {
    isPrintBill.value = false
    selectedBill.value = []

    const existing = cart.value.find(
      i =>
        i.id === item.id &&
        JSON.stringify(i.customizations || {}) ===
          JSON.stringify(item.customizations || {})
    )
    if (existing) {
      existing.qty += item.qty
    } else {
      cart.value.push({ ...item })
    }
  }

  function updateQty(itemId, qty) {
    const item = cart.value.find(i => i.id === itemId)
    if (item) {
      item.qty = qty
      if (item.qty <= 0) removeFromCart(itemId)
    }
  }

  function removeFromCart(itemId) {
    const index = cart.value.findIndex(i => i.id === itemId)
    if (index !== -1) cart.value.splice(index, 1)
  }

  function clearCart() {
    cart.value = []
  }

  function setPaymentMethod(method) {
    if (paymentMethod.value === method) return
    paymentMethod.value = method
  }

  return {
    cart,
    total,
    subtotal,
    stores,
    selectedTable,
    selectStore,
    selectedStore,
    selectTable,
    selectBill,
    isPrintBill,
    selectedBill,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    setPaymentMethod,
    paymentMethod,
    paymentMethods,
    activeItems,
    orderId
  }
})
