import { defineStore } from 'pinia'
import orderService from '@/api/order'

// Backend wraps list/detail payloads inconsistently (plain array, Laravel
// resource collection, or a paginator nested under `data`) — normalize here
// instead of guessing the shape at every call site.
function extractList(raw) {
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.data)) return raw.data
  if (Array.isArray(raw?.data?.data)) return raw.data.data
  return []
}

function extractItem(raw) {
  return raw?.data ?? raw
}

export const useOrderStore = defineStore('order', {
  state: () => ({
    orders: [],
    currentOrder: null
  }),

  actions: {
    async createOrder(payload) {
      const res = await orderService.createOrder(payload)
      // this.orders = res
      this.orders = res.data.data
      this.receipt = res.data.data.receipt
      return res.data.data
    },

    async fetchOrderByTable(tableNumber) {
      const { data } = await orderService.getOrderByTable(tableNumber)
      return data
    },

    async fetchAllOrders(params = {}) {
      const res = await orderService.getAllOrder(params)
      this.orders = extractList(res.data)
      return this.orders
    },

    async fetchOrder(id) {
      const res = await orderService.getOrder(id)
      this.currentOrder = extractItem(res.data)
      return this.currentOrder
    }
  }
})
