<script setup lang="ts">
import { definePageMeta, navigateTo, useNuxtApp } from '#imports'
import { ref } from 'vue'
import PermissionTree from '~/components/admin/roles/PermissionTree.vue'
import { normalizePermissionSelection } from '~/utils/adminPermissionTree'
import { useFlashStore } from '~/stores/flashs'

const flash = useFlashStore()
const { $axios } = (useNuxtApp() as any)

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permission: 'define roles',
})

const loading = ref(false)
const roleName = ref('')
const selectedPermissions = ref<string[]>([])

const resetForm = () => {
  roleName.value = ''
  selectedPermissions.value = []
}

const createRole = async () => {
  loading.value = true
  try {
    await $axios.post('/api/roles', {
      name: roleName.value.trim(),
      permissions: normalizePermissionSelection(selectedPermissions.value),
    })

    flash.success('Role created successfully.')
    resetForm()
    await navigateTo('/admin/roles')
  } catch (error: any) {
    flash.error(error?.response?.data?.message || 'Failed to create role.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <div>
        <h6 class="fw-semibold mb-0" style="color: #f43f5e">Create Role & Permissions</h6>
        <p class="text-secondary-light text-sm mb-0 mt-1">
          Build access using the same hierarchy shown in the admin sidebar.
        </p>
      </div>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg" />
            Dashboard
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">Permission</li>
      </ul>
    </div>

    <form class="card h-100 p-0 radius-12 overflow-hidden" @submit.prevent="createRole">
      <div class="card-body p-24 p-md-40">
        <div class="row g-4">
          <div class="col-12 col-lg-4">
            <div class="role-info-panel">
              <span class="role-info-panel__eyebrow">Role setup</span>
              <h5 class="role-info-panel__title">Name the role, then select access.</h5>
              <p class="role-info-panel__text">
                Parent permissions open the full branch. Child permissions keep their parent menus available so users
                can still navigate to the allowed page.
              </p>

              <label for="roleName" class="form-label fw-semibold text-primary-light text-sm mb-8">
                Role Name <span class="text-danger-600">*</span>
              </label>
              <input
                id="roleName"
                v-model="roleName"
                type="text"
                class="form-control radius-8"
                placeholder="Example: Accountant"
                required
              />
            </div>
          </div>

          <div class="col-12 col-lg-8">
            <PermissionTree
              v-model="selectedPermissions"
              title="Sidebar Permission Tree"
              description="The levels here follow the admin sidebar structure."
            />
          </div>
        </div>

        <div class="d-flex flex-wrap align-items-center justify-content-end gap-3 mt-24">
          <button
            type="button"
            class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-32 py-11 radius-8"
            :disabled="loading"
            @click="resetForm"
          >
            Reset
          </button>
          <button
            type="submit"
            class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"
            :disabled="loading"
          >
            <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
            Save Role
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<style scoped>
.role-info-panel {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  padding: 18px;
}

.role-info-panel__eyebrow {
  color: #2563eb;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.role-info-panel__title {
  color: #0f172a;
  font-size: 18px;
  font-weight: 800;
  margin: 8px 0;
}

.role-info-panel__text {
  color: #64748b;
  font-size: 13px;
  line-height: 1.55;
  margin: 0 0 20px;
}
</style>
