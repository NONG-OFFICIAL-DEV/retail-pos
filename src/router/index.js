import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Login',
    component: () => import('@/views/auth/LoginPage.vue')
  },
  {
    path: '/mart',
    name: 'Mart',
    component: () => import('@/components/mart/layout/MartLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'MartPos',
        component: () => import('@/views/mart/MartPosView.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// ── Global guard — runs once before any page loads ─────────────────────────
router.beforeEach(async (to, from, next) => {
  const token = localStorage.getItem('token')

  // No token → go to login
  if (!token) {
    if (to.name === 'Login') return next()
    return next({ name: 'Login' })
  }

  // Already on login → redirect to mart
  if (to.name === 'Login') return next({ name: 'MartPos' })

  // ── Fetch user ONCE — skip if already loaded ───────────────────────────
  if (to.meta.requiresAuth) {
    const { useAuthStore } = await import('@/stores/authStore')
    const authStore = useAuthStore()

    if (!authStore.me?.id) {
      try {
        await authStore.fetchMe()
      } catch {
        localStorage.removeItem('token')
        return next({ name: 'Login' })
      }
    }
  }

  next()
})

export default router