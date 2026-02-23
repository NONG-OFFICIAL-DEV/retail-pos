import { defineStore } from 'pinia'
import salesApi from '../api/sales'

export const useSaleStore = defineStore('sales', {
  state: () => ({}),

  actions: {
    async checkout(saleData) {
      const res = await salesApi.create(saleData)
      return res
    },

    async saleReport() {
      const res = await salesApi.report()
      return res
    },
    async topMenusReport(startdate, enddate) {
      const res = await salesApi.topMenusReport(startdate, enddate)
      return res
    },
    async printBillForPayment(orderId) {
      const res = await salesApi.printBillForPayment(orderId)
      return res
    }
  }
})
