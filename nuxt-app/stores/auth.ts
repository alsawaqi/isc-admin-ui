// stores/auth.ts
import {useNuxtApp} from '#imports'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuth = defineStore('auth', () => {
  const user = ref<any>(null)
  const permissions = ref<string[]>([])

  const fetchUser = async () => {
    const { $axios } = (useNuxtApp() as any)
    const res = await $axios.get('/api/user')
    user.value = res.data
    permissions.value = res.data?.permissions || []
   }

  return { user, permissions, fetchUser }
})
