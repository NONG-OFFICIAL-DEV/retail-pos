// stores/martStore.js
import { defineStore } from 'pinia'
import { useAuthStore } from './authStore'
import { useOrderStore } from './orderStore'
import { useProductStore } from './productStore'

export const useMartStore = defineStore('mart', {
  state: () => ({
    cartItems: [],
    paymentMethod: 'cash',
    customerType: 'retail',
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
      const price = product.price
      const key = `${product.id}__${unitId}_${price}`
      const existing = this.cartItems.find(i => i._key === key)

      if (existing) {
        existing.qty += product.qty ?? 1
      } else {
        this.cartItems.push({
          _key: key, // merge key
          id: product.id, // product_id
          product_unit_id: product.product_unit_id ?? null,
          name: product.name,
          unit: product.unit || 'pcs', // display unit
          qty_per_base: product.qty_per_base ?? 1,
          price: parseFloat(product.price ?? 0),
          image_url: product.image_url ?? null,
          qty: product.qty ?? 1,
          _unitData: product._unitData ?? null,
          customer_type: product.customer_type,
          topup_amount:    product.topup_amount ?? null,
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
      this.customerType = 'retail'
      this.discount = 0
    },

    setPaymentMethod(method) {
      this.paymentMethod = method
    },
    setCustomerType(type) {
      this.customerType = type
      // Recalculate all cart item prices when type changes
      this.cartItems.forEach(item => {
        if (item._unitData) {
          item.price =
            type === 'wholesale' && item._unitData.wholesale_price
              ? parseFloat(item._unitData.wholesale_price)
              : parseFloat(item._unitData.retail_price)
        }
      })
    },
    setDiscount(amount) {
      this.discount = parseFloat(amount) || 0
    },

    // ── Checkout ───────────────────────────────────────────────────────────
    async checkout(extraPayload = {}) {
      const auth = useAuthStore()
      const orderStore = useOrderStore()
      const productStore = useProductStore()

      if (!this.cartItems.length) {
        throw new Error('Cart is empty')
      }

      if (!auth.branch_id) {
        throw new Error('No branch assigned')
      }

      this.loading = true
      try {
        const items = this.cartItems.map(i => ({
          product_id: i.id,
          unit: i.unit,
          product_unit_id: i.product_unit_id ?? null,
          quantity: i.qty,
          customer_type: i.customer_type,
          topup_amount: i.topup_amount,
        }))

        const data = await orderStore.createOrder({
          branch_id: auth.branch_id,
          payment_method: this.paymentMethod,
          customer_type: this.customerType,
          order_type: 'takeaway',
          discount_amount: this.discount,
          cash_tendered: extraPayload.cash_tendered ?? 0,
          change_given: extraPayload.change_given ?? 0,
          items
        })
        this.clearCart()
        productStore.fetchProducts({ branch_id: auth.branch_id })
        return data
      } finally {
        this.loading = false
      }
    }
  }
})
