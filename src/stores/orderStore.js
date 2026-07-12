import { defineStore } from 'pinia'
import orderService from '@/api/order'

// Backend wraps list/detail payloads inconsistently (plain array, Laravel
// resource collection, or a paginator nested under `data`) — normalize here
// instead of guessing the shape at every call site.
// Returns { list, meta } — meta is the Laravel paginator's page info when
// present (current_page/last_page/total), or null for a plain array response.
function extractPage(raw) {
  if (Array.isArray(raw)) return { list: raw, meta: null }

  const level1 = raw?.data
  if (Array.isArray(level1)) return { list: level1, meta: raw?.meta ?? null }
  if (Array.isArray(level1?.data)) {
    return {
      list: level1.data,
      meta: level1.meta ?? {
        current_page: level1.current_page,
        last_page: level1.last_page,
        total: level1.total
      }
    }
  }
  return { list: [], meta: null }
}

export const useOrderStore = defineStore('order', {
  state: () => ({
    orders: [],
    ordersMeta: null, // { current_page, last_page, total } — null when the backend didn't paginate
    currentOrder: null
  }),

  getters: {
    hasMoreOrders: state =>
      !!state.ordersMeta &&
      (state.ordersMeta.current_page ?? 1) < (state.ordersMeta.last_page ?? 1)
  },

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

    // Loads page 1, replacing whatever was there — use for initial load / refresh.
    async fetchAllOrders(params = {}) {
      const res = await orderService.getAllOrder({ ...params, page: 1 })
      const { list, meta } = extractPage(res.data)
      this.orders = list
      this.ordersMeta = meta
      return this.orders
    },

    // Appends the next page — no-op if the backend gave no pagination info
    // or we're already on the last page.
    async fetchMoreOrders(params = {}) {
      if (!this.hasMoreOrders) return []
      const nextPage = (this.ordersMeta.current_page ?? 1) + 1
      const res = await orderService.getAllOrder({ ...params, page: nextPage })
      const { list, meta } = extractPage(res.data)
      this.orders = [...this.orders, ...list]
      this.ordersMeta = meta ?? this.ordersMeta
      return list
    },

    async fetchOrder(id) {
      const res = await orderService.getOrder(id)
      this.currentOrder = res.data?.data ?? res.data
      return this.currentOrder
    }
  }
})
