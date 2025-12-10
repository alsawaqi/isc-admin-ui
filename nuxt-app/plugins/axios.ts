// plugins/axios.ts
import axios from 'axios'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { useAuth } from '~/stores/auth'
import { useRouter } from 'vue-router'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()

  const instance = axios.create({
    baseURL: config.public.apiBase as string,
    withCredentials: true,
  })

  function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
    return match ? match[2] ?? null : null
  }

  instance.interceptors.request.use((config) => {
    NProgress.start()

    if (process.client) {
      const auth = useAuth()
      // if first load, hydrate from localStorage
      if (!auth.token) auth.hydrateFromStorage()

      if (auth.token) {
        config.headers.Authorization = `Bearer ${auth.token}`
      }

      const csrfToken = getCookie('XSRF-TOKEN')
      if (csrfToken) {
        config.headers['X-XSRF-TOKEN'] = decodeURIComponent(csrfToken)
      }
    }

    return config
  })

  instance.interceptors.response.use(
    (response) => {
      NProgress.done()
      return response
    },
    async (error) => {
      NProgress.done()

      const status = error.response?.status
      const router = useRouter()
      const auth = useAuth()
      

      // session/token invalid → logout & go to login
      if (status === 401 || status === 419) {
        auth.logout()
        await router.push('/') // your login route
      }

 
      // if (status === 403) {
      //   await router.push('/forbidden')
      // }

      return Promise.reject(error)
    }
  )

  return {
    provide: {
      axios: instance
    }
  }
})
