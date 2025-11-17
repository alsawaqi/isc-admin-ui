import {useNuxtApp,defineAsyncComponent,defineNuxtRouteMiddleware,navigateTo} from  '#imports';
export default defineNuxtRouteMiddleware(async (to) => {
  // Run only on client side
  if (!process.client) return

    const { $axios } = (useNuxtApp() as any)
  const token = localStorage.getItem('token') // ✅ Safe now because it's wrapped

  if (!token) return navigateTo('/')

  const requiredPermission = typeof to.meta?.permission === 'string' ? to.meta.permission : undefined
  if (!requiredPermission) return

  try {
    const { useAuth } = await import('~/stores/auth')
    const auth = useAuth()

    if (!auth.permissions.length) {
      await auth.fetchUser()
    }

    if (!auth.permissions.includes(requiredPermission)) {
      return navigateTo('/403') // Optional: route to a 403 page
    }
  } catch (e) {
    console.error('Permission check failed:', e)
    return navigateTo('/')
  }
})
