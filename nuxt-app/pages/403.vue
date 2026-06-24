<script setup lang="ts">
import { definePageMeta, useRouter } from '#imports'
import { computed, onMounted } from 'vue'
import { useAuth } from '~/stores/auth'
import { getAdminLandingLabel, getAdminLandingPath } from '~/utils/adminAccess'

definePageMeta({
  layout: false,
})

const router = useRouter()
const auth = useAuth()

const allowedPath = computed(() => {
  return getAdminLandingPath(auth.permissions)
})

const hasAllowedPath = computed(() => allowedPath.value !== '/403')

const allowedLabel = computed(() => {
  return `Go to ${getAdminLandingLabel(auth.permissions)}`
})

onMounted(async () => {
  if (!auth.permissions.length && localStorage.getItem('token')) {
    try {
      await auth.fetchUser()
    } catch {
      auth.logout()
    }
  }
})
</script>

<template>
  <main class="forbidden-page">
    <section class="forbidden-card">
      <div class="forbidden-icon">
        <iconify-icon icon="solar:lock-keyhole-minimalistic-bold-duotone" />
      </div>
      <p class="forbidden-eyebrow">403 Forbidden</p>
      <h1>You do not have access to this page.</h1>
      <p class="forbidden-copy">
        Your role does not include the permission required for this admin route.
      </p>
      <div class="forbidden-actions">
        <button type="button" class="forbidden-secondary" @click="router.back()">Go Back</button>
        <NuxtLink v-if="hasAllowedPath" :to="allowedPath" class="forbidden-primary">{{ allowedLabel }}</NuxtLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
.forbidden-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.12), transparent 32rem),
    #f8fafc;
  padding: 24px;
}

.forbidden-card {
  width: min(100%, 480px);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.1);
  padding: 32px;
  text-align: center;
}

.forbidden-icon {
  width: 56px;
  height: 56px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #eff6ff;
  color: #2563eb;
  font-size: 30px;
  margin-bottom: 16px;
}

.forbidden-eyebrow {
  margin: 0 0 8px;
  color: #ef4444;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  color: #0f172a;
  font-size: 26px;
  font-weight: 800;
  margin: 0;
}

.forbidden-copy {
  color: #64748b;
  font-size: 14px;
  line-height: 1.6;
  margin: 12px 0 24px;
}

.forbidden-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.forbidden-primary,
.forbidden-secondary {
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  padding: 10px 16px;
  text-decoration: none;
}

.forbidden-primary {
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #ffffff;
}

.forbidden-secondary {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
}
</style>
