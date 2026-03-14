// stores/martStore.js
import { defineStore } from 'pinia'
import { useAuthStore } from './authStore'
import { useOrderStore } from './orderStore'
import { useProductStore } from './productStore'

export const useMartStore = defineStore('mart', {
  state: () => ({
    cartItems: [],
    paymentMethod: 'cash',
    loading: false,
    discount: 0
  }),

  getters: {
    subtotal: state =>
      state.cartItems.reduce((sum, i) => sum + i.price * i.qty, 0),
    total: state => Math.max(0, state.subtotal - state.discount),
    isEmpty: state => state.cartItems.length === 0,
    itemCount: state => state.cartItems.reduce((sum, i) => sum + i.qty, 0)
  },

  actions: {
    // ── Add or merge ───────────────────────────────────────────────────────
    // Key = product_id + unit_id  →  1 box and 2 cans = 2 separate lines
    //                              →  2 boxes = merged into qty: 2
    addToCart(product) {
      const unitId = product.product_unit_id ?? 'base'
      const key = `${product.id}__${unitId}`

      const existing = this.cartItems.find(i => i._key === key)

      if (existing) {
        existing.qty += product.qty ?? 1
      } else {
        this.cartItems.push({
          _key: key, // merge key
          id: product.id, // product_id
          product_unit_id: product.product_unit_id ?? null,
          name: product.name,
          unit: product.unit ?? product.unit_name ?? 'pcs', // display unit
          qty_per_base: product.qty_per_base ?? 1,
          price: parseFloat(
            product.price ?? product.selling_price ?? product.base_price ?? 0
          ),
          image_url: product.image_url ?? null,
          qty: product.qty ?? 1
        })
      }
    },

    // ── Update qty by _key ─────────────────────────────────────────────────
    updateQty(key, qty) {
      if (qty <= 0) {
        this.removeFromCart(key)
        return
      }
      const item = this.cartItems.find(i => i._key === key)
      if (item) item.qty = qty
    },

    // ── Remove by _key ─────────────────────────────────────────────────────
    removeFromCart(key) {
      this.cartItems = this.cartItems.filter(i => i._key !== key)
    },

    clearCart() {
      this.cartItems = []
      this.paymentMethod = 'cash'
      this.discount = 0
    },

    setPaymentMethod(method) {
      this.paymentMethod = method
    },
    setDiscount(amount) {
      this.discount = parseFloat(amount) || 0
    },

    // ── Checkout ───────────────────────────────────────────────────────────
    async checkout(notif) {
      const auth = useAuthStore()
      const orderStore = useOrderStore()
      const productStore = useProductStore()

      if (!this.cartItems.length) {
        notif('Cart is empty', { type: 'warning' })
        return false
      }
      if (!auth.branch_id) {
        notif('No branch assigned', { type: 'error' })
        return false
      }

      this.loading = true
      try {
        await orderStore.createOrder({
          branch_id: auth.branch_id,
          payment_method: this.paymentMethod,
          order_type: 'takeaway',
          discount_amount: this.discount,
          items: this.cartItems.map(i => ({
            product_id: i.id,
            product_unit_id: i.product_unit_id ?? null, // ← send unit to backend
            quantity: i.qty
          }))
        })

        this.clearCart()
        notif('Order placed successfully', { type: 'success' })
        productStore.fetchProducts()
        return true
      } catch (err) {
        console.error('[mart:checkout]', err)
        notif('Checkout failed. Please try again.', { type: 'error' })
        return false
      } finally {
        this.loading = false
      }
    }
  }
})
