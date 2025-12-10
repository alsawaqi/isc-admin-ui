import { AbilityBuilder, createMongoAbility } from '@casl/ability' // 👈 also fixes deprecation warning
import { defineNuxtPlugin, useRuntimeConfig } from '#app'
export default defineNuxtPlugin(() => {
  if (!process.client) return // ✅ ensures it runs only in browser

  const { can, rules } = new AbilityBuilder(createMongoAbility)

  try {
    const userJson = localStorage.getItem('user')
    const user = userJson ? JSON.parse(userJson) : { permissions: [] }

    user.permissions?.forEach((perm: string) => {
      const [action, subject] = perm.split(' ')
      if (action && subject) {
        can(action, subject.charAt(0).toUpperCase() + subject.slice(1))
      }
    })
  } catch (e) {
    console.warn('Error loading permissions from localStorage', e)
  }

  const ability = createMongoAbility(rules)

  return {
    provide: {
      ability
    }
  }
})
