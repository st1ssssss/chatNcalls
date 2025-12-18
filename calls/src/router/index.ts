import CallPage from '@/views/CallPage.vue'
import CallRoom from '@/views/CallRoom.vue'
import AuthPage from '@views/AuthPage.vue'
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/auth' },
  { path: '/auth', component: AuthPage },
  { path: '/rooms', component: CallRoom },
  { path: '/rooms/:id', component: CallPage }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
