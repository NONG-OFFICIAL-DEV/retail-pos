// stores/martStore.js
import { defineStore } from 'pinia'
import { useAuthStore } from './authStore'
import { useOrderStore } from './orderStore'

export const useMartStore = defineStore('mart', {
  state: () => ({
    cartItems: [],
    paymentMethod: 'cash',
    loading: false
  }),

  getters: {
    subtotal: state =>
      state.cartItems.reduce((sum, i) => sum + i.price * i.qty, 0),

    total: state => state.subtotal, // extend with tax/discount later

    isEmpty: state => state.cartItems.length === 0,

    itemCount: state => state.cartItems.reduce((sum, i) => sum + i.qty, 0)
  },

  actions: {
    // ── Add or increment ───────────────────────────────────────────────────
    addToCart(product) {
      const existing = this.cartItems.find(i => i.id === product.id)
      if (existing) {
        existing.qty += 1
      } else {
        this.cartItems.push({
          id: product.id,
          name: product.name,
          price: parseFloat(product.price ?? product.base_price ?? 0),
          image_url: product.image_url ?? null,
          qty: 1
        })
      }
    },

    // ── Update qty by item id ──────────────────────────────────────────────
    updateQty(itemId, qty) {
      if (qty <= 0) {
        this.removeFromCart(itemId)
        return
      }
      const item = this.cartItems.find(i => i.id === itemId)
      if (item) item.qty = qty
    },

    // ── Remove by item id ──────────────────────────────────────────────────
    removeFromCart(itemId) {
      this.cartItems = this.cartItems.filter(i => i.id !== itemId)
    },

    clearCart() {
      this.cartItems = []
      this.paymentMethod = 'cash'
    },

    setPaymentMethod(method) {
      this.paymentMethod = method
    },

    // ── Checkout ───────────────────────────────────────────────────────────
    async checkout(notif) {
      const auth = useAuthStore()
      const orderStore = useOrderStore()

      if (!this.cartItems.length) {
        notif('Cart is empty', { type: 'warning' })
        return false
      }

      if (!auth.branch_id) {
        notif('No branch assigned to your account', { type: 'error' })
        return false
      }

      this.loading = true
      try {
        console.log(this.cartItems);
        
        await orderStore.createOrder({
          branch_id: auth.branch_id,
          payment_method: this.paymentMethod,
          order_type: 'takeaway',
          items: this.cartItems.map(i => ({
            product_id: i.id,
            quantity: i.qty
          }))
        })

        this.clearCart()
        notif('Order placed successfully', { type: 'success' })
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
