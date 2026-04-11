// import { fileURLToPath, URL } from 'node:url';
// import { defineConfig } from 'vite';
// import vue from '@vitejs/plugin-vue';

// export default defineConfig({
//   plugins: [vue()],
//   resolve: {
//     alias: {
//       '@': fileURLToPath(new URL('./src', import.meta.url))
//     }
//   },
// });


// ─────────────────────────────────────────────────────────────
//  vite.config.js  –  Mart POS  (PWA + Offline)
// ─────────────────────────────────────────────────────────────
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },

  plugins: [
    vue(),

    VitePWA({
      registerType: 'autoUpdate',        // auto update SW when new build deployed
      injectRegister: 'auto',

      // ── Workbox (caching strategy) ──────────────────────────
      workbox: {
        // Pre-cache all built assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],

        // Runtime caching for API calls
        runtimeCaching: [
          {
            // Products list  →  CacheFirst (fast, works offline)
            urlPattern: /\/v1\/mart\/pos\/products/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pos-products',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 // 24 h
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Categories  →  CacheFirst
            urlPattern: /\/v1\/mart\/pos\/categories/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pos-categories',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // /me endpoint  →  NetworkFirst (try fresh, fall back to cache)
            urlPattern: /\/me$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pos-auth',
              expiration: { maxAgeSeconds: 60 * 60 * 8 }, // 8 h
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },

      // ── Web App Manifest ────────────────────────────────────
      manifest: {
        name: 'Mart POS',
        short_name: 'MartPOS',
        description: 'Point of Sale – works online & offline',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        display: 'fullscreen',        // hides ALL browser chrome on Android
        orientation: 'landscape',     // lock to landscape on tablet
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-72.png',
            sizes: '72x72',
            type: 'image/png'
          },
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})