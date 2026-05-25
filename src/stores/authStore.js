import { defineStore } from 'pinia'
import authService from '../api/auth'
import branchService from '../api/branch' // ← add this import

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    me: {},
    token: localStorage.getItem('mart-token') || null,
    isSuperAdmin: false,
    isOwner: false,
    isStaff: false,
    permissions: [],
    tenant_id: null,
    branch_id: null, // ← will be auto-filled for owners
    bu_name: null,
    branch_name: null,
    bu_type: null,
    logo_url: null,
    role_name: null,
    currency: null,
    unread_notifications_count: 0
  }),

  getters: {
    can: state => code => {
      if (state.isSuperAdmin || state.isOwner) return true
      return state.permissions.includes(code)
    }
  },

  actions: {
    _applyLoginResponse(data) {
      this.token = data.token
      localStorage.setItem('mart-token', data.token)

      this.user = data.user
      this.permissions = data.permissions ?? []
      this.isSuperAdmin = data.is_super_admin ?? false
      this.isOwner = data.is_owner ?? false
      this.isStaff = data.is_staff ?? false
      this.tenant_id = data.tenant_id ?? null
      this.branch_id = data.branch_id ?? null
      this.branch_name = data.branch_name ?? null
      this.bu_name = data.bu_name ?? null
      this.bu_type = data.bu_type ?? null
      this.logo_url = data.logo_url ?? null
      this.role_name = data.role_name ?? null
      this.currency = data.currency ?? null
    },

    // ── Auto-select first branch for owners ───────────────────────
    async _resolveOwnerBranch() {
      if (this.isOwner && !this.branch_id) {
        const { data } = await branchService.list()
        const first = data?.data?.data?.[0]
        if (first) {
          this.branch_id = first.id
          this.branch_name = first.name
        }
      }
    },

    async login({ email, password }) {
      const response = await authService.userLogin(email, password)
      if (response.data.status === 'success') {
        this._applyLoginResponse(response.data)
        await this._resolveOwnerBranch() // ← auto-select branch after login
      }
      return response
    },

    async loginByPin(pin_code, branch_id = null) {
      const response = await authService.loginByPin(pin_code, branch_id)
      if (response.data.status === 'success') {
        this._applyLoginResponse(response.data)
      }
      return response
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
      this.branch_name = d.branch_name ?? null
      this.bu_name = d.bu_name ?? null
      this.bu_type = d.bu_type ?? null
      this.logo_url = d.logo_url ?? null
      this.role_name = d.role_name ?? null
      this.currency = d.currency ?? null
      this.unread_notifications_count = d.unread_notifications_count ?? 0

      await this._resolveOwnerBranch() // ← auto-select branch on session restore
    },

    async logout() {
      await authService.userLogout().catch(() => {})
      this.$reset()
      localStorage.removeItem('mart-token')
    }
  }
})
