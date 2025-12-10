// stores/auth.ts
import { useNuxtApp } from '#imports'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuth = defineStore('auth', () => {
  const user = ref<any>(null)
  const permissions = ref<string[]>([])
  const token = ref<string | null>(null)

  const setAuth = (u: any, t: string) => {
    user.value = u
    permissions.value = u?.permissions || []
    token.value = t

    if (process.client) {
      localStorage.setItem('token', t)
      localStorage.setItem('user', JSON.stringify(u))
    }
  }

  const logout = () => {
    user.value = null
    permissions.value = []
    token.value = null

    if (process.client) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }

  const hydrateFromStorage = () => {
    if (!process.client) return
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')

    token.value = storedToken
    user.value = storedUser ? JSON.parse(storedUser) : null
    permissions.value = user.value?.permissions || []
  }

  const fetchUser = async () => {
    const { $axios } = (useNuxtApp() as any)
    const res = await $axios.get('/api/user')
    user.value = res.data
    permissions.value = res.data?.permissions || []

    // if you want, sync user back to localStorage:
    if (process.client) {
      localStorage.setItem('user', JSON.stringify(res.data))
    }
  }

  return { user, permissions, token, setAuth, logout, hydrateFromStorage, fetchUser }
})
