import { defineNuxtRouteMiddleware, useAuth, navigateTo } from '#imports'
import { getAdminLandingPath } from '~/utils/adminAccess'

export default defineNuxtRouteMiddleware(async (to) => {
  if (!import.meta.client) return

  const token = localStorage.getItem('token')
  const auth = useAuth()

  if (to.path.startsWith('/admin')) {
    if (!token) return navigateTo('/')

    try {
      await auth.fetchUser()

      if (to.path === '/admin' || to.path === '/admin/') {
        const landingPath = getAdminLandingPath(auth.permissions)
        if (landingPath !== '/admin') return navigateTo(landingPath)
      }
    } catch {
      localStorage.removeItem('token')
      return navigateTo('/')
    }
  }

  if (to.path === '/' && token) {
    try {
      await auth.fetchUser()
      return navigateTo(getAdminLandingPath(auth.permissions))
    } catch {
      localStorage.removeItem('token')
    }
  }
})
