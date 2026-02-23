import { defineStore } from 'pinia'
import paymentService from '../api/payment'

export const usePaymentStore = defineStore('payment', {
  state: () => ({}),
  actions: {
    async printInvoice(saleId) {
      const res = await paymentService.printInvoice(saleId)
      // Convert blob to URL
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      return url
    }
  }
})
