import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/auth' },
  { path: '/auth', component: () => import('@/views/AuthPage.vue') },
  { path: '/chat', component: () => import('@/views/ChatPage.vue') },
  { path: '/call', component: () => import('@/views/CallPage.vue') }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})