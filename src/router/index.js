import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue')
  },
  // router/index.js
  {
    path: '/mart',
    component: () => import('@/components/mart/layout/MartLayout.vue'),
    children: [
      {
        path: '',
        name: 'MartPos',
        component: () => import('@/views/mart/MartPosView.vue')
      }
    ]
  }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
