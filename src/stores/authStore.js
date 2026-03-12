import { defineStore } from 'pinia'
import authService from '../api/auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    me: {},
    token: localStorage.getItem('token') || null,
    isSuperAdmin: false,
    isOwner: false,
    isStaff: false,
    permissions: [],
    tenant_id: null,
    branch_id: null,
    bu_name: null,
    branch_name: null,
    bu_type: null,
    logo_url: null,
    role_name: null,
    unread_notifications_count: 0
  }),

  getters: {
    can: state => code => {
      if (state.isSuperAdmin || state.isOwner) return true
      return state.permissions.includes(code)
    }
  },

  actions: {
    async login({ email, password }) {
      const response = await authService.userLogin(email, password)
      if (response.data.status === 'success') {
        this.token = response.data.token
        this.user = response.data.user
        localStorage.setItem('token', response.data.token)
      }
      return response
    },

    async logout() {
      await authService.userLogout().catch(() => {})
      this.token = null
      this.user = null
      this.me = {}
      this.branch_id = null
      this.tenant_id = null
      localStorage.removeItem('token')
    },

    async fetchMe() {
      const res = await authService.me()
      const d = res.data

      this.me = d.user
      this.isSuperAdmin = d.is_super_admin ?? false
      this.isOwner = d.is_owner ?? false
      this.isStaff = d.is_staff ?? false
      this.permissions = d.permissions ?? []
      this.tenant_id = d.tenant_id ?? null
      this.branch_id = d.branch_id ?? null
      this.bu_name = d.bu_name ?? null
      this.branch_name = d.branch_name ?? null
      this.bu_type = d.bu_type ?? null
      this.logo_url = d.logo_url ?? null
      this.role_name = d.role_name ?? null
      this.unread_notifications_count = d.unread_notifications_count ?? 0
    }
  }
})
