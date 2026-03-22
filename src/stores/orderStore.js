import { defineStore } from 'pinia'
import orderService from '@/api/order'
import echo from '@/utils/echo'

export const useOrderStore = defineStore('order', {
  state: () => ({
    orders: []
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

    async fetchAllOrders() {
      const { data } = await orderService.getAllOrder()
      this.orders = data
      return data
    }
  }
})
