import { defineStore } from 'pinia'
import tableService from '@/api/table'

export const useDiningTableStore = defineStore('diningTable', {
  state: () => ({
    tables: []
  }),

  actions: {
    /* -------------------------
      FETCH ALL TABLES
    --------------------------*/
    async fetchTables(params = {}) {
      const res = await tableService.getAllTables(params)
      this.tables = res.data.data
    },

    /* -------------------------
      CREATE
    --------------------------*/
    async addTable(data) {
      const res = await tableService.createTable(data)
      return res.data
    },

    /* -------------------------
      UPDATE
    --------------------------*/
    async updateTable(table) {
      const res = await tableService.updateTable(table.id, table)
      return res.data
    },

    /* -------------------------
      DELETE
    --------------------------*/
    async deleteTable(id) {
      await tableService.deleteTable(id)
    },

    /* -------------------------
      UPDATE STATUS (POS / KDS)
    --------------------------*/
    async updateTableStatus(id, status) {
      const res = await tableService.updateStatus(id, status)
      return res.data
    },

    async getTableNumberByToken(token) {
      const res = await tableService.getTableNumberByToken(token)
      localStorage.setItem('tableId', res.data.table.id)
      return res.data
    },
    async showQRCode(tableId) {
      const res = await tableService.showQRCode(tableId)
      return res.data
    }
  }
})
