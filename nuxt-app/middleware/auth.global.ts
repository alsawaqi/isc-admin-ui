export default defineNuxtRouteMiddleware(async (to) => {
  if (!import.meta.client) return

  const token = localStorage.getItem('token')
  const { $axios } = useNuxtApp()
  const auth = useAuth()

  if (to.path.startsWith('/admin')) {
    if (!token) return navigateTo('/')

    try {
      await auth.fetchUser()
    } catch {
      localStorage.removeItem('token')
      return navigateTo('/')
    }
  }

  if (to.path === '/' && token) {
    try {
      await auth.fetchUser()
      return navigateTo('/admin')
    } catch {
      localStorage.removeItem('token')
    }
  }
})
