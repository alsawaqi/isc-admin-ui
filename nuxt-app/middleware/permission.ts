import { defineNuxtRouteMiddleware, navigateTo } from '#imports'

export default defineNuxtRouteMiddleware(async (to) => {
  if (!import.meta.client) return

  const token = localStorage.getItem('token')
  if (!token) {
    return navigateTo('/')
  }

  const metaPermission = to.meta?.permission ?? to.meta?.permissions
  const requiredPermissions = Array.isArray(metaPermission)
    ? metaPermission.filter((value): value is string => typeof value === 'string')
    : typeof metaPermission === 'string'
      ? [metaPermission]
      : []

  if (!requiredPermissions.length) return

  try {
    const { useAuth } = await import('~/stores/auth')
    const auth = useAuth()

    if (!auth.permissions.length) {
      await auth.fetchUser()
    }

    const missingPermissions = requiredPermissions.filter(
      (permission) => !auth.permissions.includes(permission),
    )

    if (missingPermissions.length) {
      return navigateTo({
        path: '/403',
        query: { from: to.fullPath },
      })
    }
  } catch (e) {
    console.error('Permission check failed:', e)
    return navigateTo('/')
  }
})
