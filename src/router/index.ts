import CallRoom from '@/views/CallRoom.vue'
import AuthPage from '@views/AuthPage.vue'
import CallPage from '@views/CallPage.vue'
import ChatPage from '@views/ChatPage.vue'
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/auth' },
  { path: '/auth', component: AuthPage },
  { path: '/chat', component: ChatPage },
  { path: '/call', component: CallPage },
  { path: '/call/:id', component: CallRoom }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
