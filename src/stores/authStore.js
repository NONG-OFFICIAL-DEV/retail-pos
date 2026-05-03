import { defineStore } from 'pinia'
import authService from '../api/auth'

const STORAGE_KEY = 'mart-token'
const BRANCH_STORAGE_KEY = 'mart-active-branch'

// ── Default state shape ───────────────────────────────────────────────────────
function initialState() {
  return {
    me: null,
    token: localStorage.getItem(STORAGE_KEY) ?? null,
    isSuperAdmin: false,
    isOwner: false,
    isStaff: false,
    permissions: [],
    tenant_id: null,
    branch_id: null,
    active_branch_id: localStorage.getItem(BRANCH_STORAGE_KEY) ?? null,
    branches: [],
    branch_name: null,
    bu_name: null,
    bu_type: null,
    logo_url: null,
    role_name: null,
    currency: null,
    locale: null,
    plan: null,
    unread_notifications_count: 0
  }
}

export const useAuthStore = defineStore('auth', {
  state: initialState,

  getters: {
    // permission check — owner/super admin always passes
    can: state => code => {
      if (state.isSuperAdmin || state.isOwner) return true
      return state.permissions.includes(code)
    },

    activeBranch: state => {
      const branches = state.branches ?? []

      // staff: branch is fixed — assigned by server
      if (state.isStaff) {
        return state.branch_id
      }

      // owner: use saved preference, fallback to first branch
      const id = state.active_branch_id ?? branches[0]?.id ?? null
      return branches.find(b => b.id === id) ?? branches[0] ?? null
    },

    isAuthenticated: state => !!state.token
  },

  actions: {
    // ── Internal: apply any login/me response ─────────────────────────────────
    _applyResponse(data) {
      this.me = data.user ?? null
      this.isSuperAdmin = data.is_super_admin ?? false
      this.isOwner = data.is_owner ?? false
      this.isStaff = data.is_staff ?? false
      this.permissions = data.permissions ?? []
      this.tenant_id = data.tenant_id ?? null
      this.branch_id = data.branch_id ?? null
      this.branches = data.branches ?? []
      this.branch_name = data.branch_name ?? null
      this.bu_name = data.bu_name ?? null
      this.bu_type = data.bu_type ?? null
      this.logo_url = data.logo_url ?? null
      this.role_name = data.role_name ?? null
      this.currency = data.currency ?? null
      this.locale = data.locale ?? null
      this.plan = data.plan ?? null
      this.unread_notifications_count = data.unread_notifications_count ?? 0

      // set active branch: keep saved preference if still valid, else default to first
      const saved = localStorage.getItem(BRANCH_STORAGE_KEY)
      const valid = this.branches.find(b => b.id === saved)
      this.active_branch_id = valid?.id ?? this.branches[0]?.id ?? null
      if (this.active_branch_id) {
        localStorage.setItem(BRANCH_STORAGE_KEY, this.active_branch_id)
      }
    },

    // ── Email + password login ────────────────────────────────────────────────
    async login({ email, password }) {
      const res = await authService.userLogin(email, password)
      if (res.data.status === 'success') {
        this.token = res.data.token
        localStorage.setItem(STORAGE_KEY, res.data.token)
        this._applyResponse(res.data)
      }
      return res
    },

    // ── PIN login ─────────────────────────────────────────────────────────────
    async loginByPin(pin_code, branch_id = null) {
      const res = await authService.loginByPin(pin_code, branch_id)
      if (res.data.status === 'success') {
        this.token = res.data.token
        localStorage.setItem(STORAGE_KEY, res.data.token)
        this._applyResponse(res.data)
      }
      return res
    },

    // ── Restore session ───────────────────────────────────────────────────────
    async fetchMe() {
      const res = await authService.me()
      this._applyResponse(res.data)
    },

    // ── Switch active branch ──────────────────────────────────────────────────
    setActiveBranch(branch) {
      this.active_branch_id = branch.id
      localStorage.setItem(BRANCH_STORAGE_KEY, branch.id)
    },

    // ── Logout ────────────────────────────────────────────────────────────────
    async logout() {
      await authService.userLogout().catch(() => {})
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(BRANCH_STORAGE_KEY)
      this.$reset()
    }
  }
})
