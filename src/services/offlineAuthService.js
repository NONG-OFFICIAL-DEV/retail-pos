// ─────────────────────────────────────────────────────────────
//  src/services/offlineAuthService.js
//  Wraps your existing auth service with:
//    • Token cached in IndexedDB (app opens without internet)
//    • User profile cached offline
//    • Cache warm-up after login
// ─────────────────────────────────────────────────────────────
import { authDB } from './db'
import { warmUpCache } from './offlineProductService'
import { initSyncService } from './syncService'
import authService from '../api/auth'   // your existing auth service

export const offlineAuthService = {

  // ── Login with email/password ─────────────────────────────
  async login(email, password) {
    const res = await authService.userLogin(email, password)
    await _afterLogin(res)
    return res
  },

  // ── Login with PIN ────────────────────────────────────────
  async loginByPin(pin_code, branch_id = null) {
    const res = await authService.loginByPin(pin_code, branch_id)
    await _afterLogin(res)
    return res
  },

  // ── Get current user (online or cached) ──────────────────
  async me() {
    if (navigator.onLine) {
      try {
        const res = await authService.me()
        // Refresh cache
        if (res?.data) await authDB.saveUser(res.data)
        return res
      } catch (err) {
        if (!err.response) {
          // Network error → return cached user
          return await _getCachedUser()
        }
        throw err
      }
    } else {
      return await _getCachedUser()
    }
  },

  // ── Logout ────────────────────────────────────────────────
  async logout() {
    try {
      if (navigator.onLine) await authService.userLogout()
    } finally {
      await authDB.clear()
    }
  },

  // ── Check if we have cached credentials (for offline login) ──
  async hasCachedSession() {
    const token = await authDB.getToken()
    const user  = await authDB.getUser()
    return !!(token && user)
  },

  async getCachedToken() {
    return authDB.getToken()
  },

  async getCachedUser() {
    return authDB.getUser()
  }
}

// ── After successful login: cache token + user + warm up ────
async function _afterLogin(res) {
  const token = res?.data?.token || res?.data?.access_token
  const user  = res?.data?.user  || res?.data

  if (token) await authDB.saveToken(token)
  if (user)  await authDB.saveUser(user)

  // Start sync service
  await initSyncService()

  // Pre-cache products & categories in background
  warmUpCache().catch(console.error)
}

async function _getCachedUser() {
  const user = await authDB.getUser()
  if (!user) throw new Error('No cached user — please login while online first')
  return { data: user, fromCache: true }
}