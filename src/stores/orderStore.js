import { defineStore } from 'pinia'
import orderService from '@/api/order'
import echo from '@/utils/echo'

export const useOrderStore = defineStore('order', {
  state: () => ({
    orders: []
  }),

  actions: {
    async createOrder(payload, loading) {
      const res = await orderService.createOrder(payload, loading)
      this.orders = res
      return res
    },

    async fetchOrderByTable(tableNumber) {
      const { data } = await orderService.getOrderByTable(tableNumber)
      return data
    },

    async fetchAllOrders() {
      const { data } = await orderService.getAllOrder()
      this.orders = data
      return data
    },

    // ✅ Start listening to Reverb
    subscribeToOrders() {
      echo
        .channel('orders')

        // New order placed
        .listen('.order.created', data => {
          const exists = this.orders.find(o => o.order_id === data.order_id)
          if (!exists) {
            this.orders.unshift(data)
          }
        })

        // Items added to existing order
        .listen('.order.items_added', data => {
          const index = this.orders.findIndex(o => o.order_id === data.order_id)
          if (index !== -1) {
            this.orders[index] = data
          } else {
            this.orders.unshift(data)
          }
        })

        // Order paid — remove from list
        .listen('.order.paid', data => {
          this.orders = this.orders.filter(o => o.order_id !== data.order_id)
        })
    },

    unsubscribeFromOrders() {
      echo.leaveChannel('orders')
    }
  }
})