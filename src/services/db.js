// ─────────────────────────────────────────────────────────────
//  src/services/db.js
//  IndexedDB wrapper using 'idb' library
//  npm install idb
//
//  Stores:
//    products       – cached from server
//    categories     – cached from server
//    pending_sales  – orders created while offline
//    auth           – cached user / token
// ─────────────────────────────────────────────────────────────
import { openDB } from 'idb'

const DB_NAME    = 'mart-pos-db'
const DB_VERSION = 1

let _db = null

/** Open (or reuse) the database */
async function getDb() {
  if (_db) return _db

  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // ── Products ──────────────────────────────────────────
      if (!db.objectStoreNames.contains('products')) {
        const store = db.createObjectStore('products', { keyPath: 'id' })
        store.createIndex('barcode', 'barcode', { unique: false })
        store.createIndex('category_id', 'category_id', { unique: false })
      }

      // ── Categories ────────────────────────────────────────
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' })
      }

      // ── Pending Sales (offline queue) ─────────────────────
      if (!db.objectStoreNames.contains('pending_sales')) {
        const s = db.createObjectStore('pending_sales', {
          keyPath: 'localId',
          autoIncrement: true
        })
        s.createIndex('status', 'status', { unique: false })
        s.createIndex('createdAt', 'createdAt', { unique: false })
      }

      // ── Auth cache ────────────────────────────────────────
      if (!db.objectStoreNames.contains('auth')) {
        db.createObjectStore('auth', { keyPath: 'key' })
      }
    }
  })

  return _db
}

// ─────────────────────────────────────────────────────────────
//  PRODUCTS
// ─────────────────────────────────────────────────────────────
export const productDB = {
  /** Replace entire product cache */
  async saveAll(products = []) {
    const db = await getDb()
    const tx = db.transaction('products', 'readwrite')
    await tx.store.clear()
    for (const p of products) await tx.store.put(p)
    await tx.done
  },

  async getAll() {
    const db = await getDb()
    return db.getAll('products')
  },

  async getById(id) {
    const db = await getDb()
    return db.get('products', id)
  },

  async getByBarcode(barcode) {
    const db = await getDb()
    return db.getFromIndex('products', 'barcode', barcode)
  },

  async getByCategory(categoryId) {
    const db = await getDb()
    return db.getAllFromIndex('products', 'category_id', categoryId)
  },

  async count() {
    const db = await getDb()
    return db.count('products')
  }
}

// ─────────────────────────────────────────────────────────────
//  CATEGORIES
// ─────────────────────────────────────────────────────────────
export const categoryDB = {
  async saveAll(categories = []) {
    const db = await getDb()
    const tx = db.transaction('categories', 'readwrite')
    await tx.store.clear()
    for (const c of categories) await tx.store.put(c)
    await tx.done
  },

  async getAll() {
    const db = await getDb()
    return db.getAll('categories')
  }
}

// ─────────────────────────────────────────────────────────────
//  PENDING SALES  (offline queue)
// ─────────────────────────────────────────────────────────────
export const pendingSalesDB = {
  /**
   * Add a new sale to the offline queue
   * @param {Object} salePayload  – same payload you'd POST to /v1/mart/pos/orders
   * @returns {number} localId
   */
  async add(salePayload) {
    const db = await getDb()
    return db.add('pending_sales', {
      ...salePayload,
      status: 'pending',      // pending | syncing | failed
      retries: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  },

  async getAll() {
    const db = await getDb()
    return db.getAll('pending_sales')
  },

  async getPending() {
    const db = await getDb()
    return db.getAllFromIndex('pending_sales', 'status', 'pending')
  },

  async getFailed() {
    const db = await getDb()
    return db.getAllFromIndex('pending_sales', 'status', 'failed')
  },

  async count() {
    const db = await getDb()
    return db.count('pending_sales')
  },

  async countPending() {
    const db = await getDb()
    const all = await db.getAllFromIndex('pending_sales', 'status', 'pending')
    return all.length
  },

  async markSyncing(localId) {
    const db = await getDb()
    const record = await db.get('pending_sales', localId)
    if (record) {
      record.status    = 'syncing'
      record.updatedAt = new Date().toISOString()
      await db.put('pending_sales', record)
    }
  },

  async markFailed(localId, errorMessage) {
    const db = await getDb()
    const record = await db.get('pending_sales', localId)
    if (record) {
      record.status       = 'failed'
      record.retries      = (record.retries || 0) + 1
      record.lastError    = errorMessage
      record.updatedAt    = new Date().toISOString()
      await db.put('pending_sales', record)
    }
  },

  /** Delete after successful sync */
  async remove(localId) {
    const db = await getDb()
    return db.delete('pending_sales', localId)
  },

  /** Reset failed → pending so they retry */
  async retryFailed() {
    const db = await getDb()
    const failed = await db.getAllFromIndex('pending_sales', 'status', 'failed')
    for (const record of failed) {
      record.status    = 'pending'
      record.updatedAt = new Date().toISOString()
      await db.put('pending_sales', record)
    }
    return failed.length
  }
}

// ─────────────────────────────────────────────────────────────
//  AUTH CACHE
// ─────────────────────────────────────────────────────────────
export const authDB = {
  async saveToken(token) {
    const db = await getDb()
    await db.put('auth', { key: 'token', value: token })
  },

  async getToken() {
    const db = await getDb()
    const record = await db.get('auth', 'token')
    return record?.value || null
  },

  async saveUser(user) {
    const db = await getDb()
    await db.put('auth', { key: 'user', value: user })
  },

  async getUser() {
    const db = await getDb()
    const record = await db.get('auth', 'user')
    return record?.value || null
  },

  async clear() {
    const db = await getDb()
    await db.clear('auth')
  }
}