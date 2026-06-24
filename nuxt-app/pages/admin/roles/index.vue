<script lang="ts" setup>
import { definePageMeta, useNuxtApp } from '#imports'
import { onMounted, reactive, ref, watch } from 'vue'
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

interface Role {
  id: number
  name: string
  created_at: string
}

const table = reactive({
  page: 1,
  perPage: 10,
  search: '',
  sortBy: 'id',
  sortDir: 'desc',
})

const pagination = ref({
  total: 0,
  from: 0,
  to: 0,
  last_page: 1,
})

const roles = ref<Role[]>([])
const selectedPermissions = ref<string[]>([])
const currentRoleId = ref<number | null>(null)
const currentRoleName = ref('')
const loadingRoles = ref(false)
const loadingPermissions = ref(false)
const isSubmitting = ref(false)

const formatDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const deleteRole = async (role: Role) => {
  const ok = await flash.confirm({
    title: 'Delete role?',
    message: `Are you sure you want to delete "${role.name}"? This cannot be undone.`,
    confirmText: 'Yes, delete',
    cancelText: 'No, cancel',
  })
  if (!ok) return

  try {
    await $axios.delete(`/api/roles/${role.id}`)
    roles.value = roles.value.filter((item) => item.id !== role.id)
    flash.success('Role deleted successfully.')
  } catch (error: any) {
    flash.error(error?.response?.data?.message || 'Error deleting role.')
  }
}

const openPermissionModal = async (role: Role) => {
  currentRoleId.value = role.id
  currentRoleName.value = role.name
  selectedPermissions.value = []
  loadingPermissions.value = true

  try {
    const response = await $axios.get(`/api/roles/${role.id}/permissions`)
    selectedPermissions.value = response.data.permissions || []
  } catch (error: any) {
    flash.error(error?.response?.data?.message || 'Failed to load permissions.')
  } finally {
    loadingPermissions.value = false
  }
}

const updateRolePermissions = async () => {
  if (!currentRoleId.value) return

  isSubmitting.value = true
  try {
    await $axios.post(`/api/roles/${currentRoleId.value}/permissions`, {
      permissions: normalizePermissionSelection(selectedPermissions.value),
    })

    flash.success('Permissions updated successfully.')
  } catch (error: any) {
    flash.error(error?.response?.data?.message || 'Failed to update permissions.')
  } finally {
    isSubmitting.value = false
  }
}

const getRoles = async () => {
  loadingRoles.value = true
  try {
    const { data } = await $axios.get('/api/roles', {
      params: {
        page: table.page,
        per_page: table.perPage,
        search: table.search,
        sortBy: table.sortBy,
        sortDir: table.sortDir,
      },
    })

    roles.value = data.data
    pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }
  } catch (error) {
    console.error('Error fetching roles:', error)
  } finally {
    loadingRoles.value = false
  }
}

watch(
  () => [table.page, table.perPage, table.search, table.sortBy, table.sortDir],
  async () => {
    await getRoles()
  },
)

onMounted(getRoles)
</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <div>
        <h6 class="fw-semibold mb-0" style="color: #0ea5e9">Role & Access</h6>
        <p class="text-secondary-light text-sm mb-0 mt-1">
          Manage role permissions using the same access tree as the admin sidebar.
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
        <li class="fw-medium">Role & Access</li>
      </ul>
    </div>

    <div class="card h-100 p-0 radius-12">
      <div
        class="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between"
      >
        <div class="d-flex flex-wrap align-items-center gap-3">
          <div class="d-flex align-items-center gap-2">
            <span>Show</span>
            <select v-model.number="table.perPage" class="form-select form-select-sm w-auto">
              <option :value="10">10</option>
              <option :value="15">15</option>
              <option :value="20">20</option>
            </select>
          </div>
          <div class="icon-field">
            <input
              v-model="table.search"
              type="text"
              class="form-control form-control-sm w-auto"
              placeholder="Search roles"
            />
            <span class="icon">
              <iconify-icon icon="ion:search-outline" />
            </span>
          </div>
        </div>

        <NuxtLink
          to="/admin/roles/roles-permission"
          class="btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2"
        >
          <iconify-icon icon="ic:baseline-plus" class="icon text-xl line-height-1" />
          Create Role
        </NuxtLink>
      </div>

      <div class="card-body p-24">
        <div class="table-responsive scroll-sm">
          <table class="table bordered-table sm-table mb-0">
            <thead>
              <tr>
                <th scope="col">S.L</th>
                <th scope="col">Create Date</th>
                <th scope="col">Role</th>
                <th scope="col" class="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loadingRoles">
                <td colspan="4" class="text-center py-24">Loading roles...</td>
              </tr>
              <tr v-else-if="!roles.length">
                <td colspan="4" class="text-center py-24">No roles found.</td>
              </tr>
              <template v-else>
                <tr v-for="(role, index) in roles" :key="role.id">
                  <td>
                    {{ index + 1 < 10 ? '0' + (index + 1) : index + 1 }}
                  </td>
                  <td>{{ formatDate(role.created_at) }}</td>
                  <td class="fw-semibold">{{ role.name }}</td>
                  <td class="text-center">
                    <div class="d-flex align-items-center gap-10 justify-content-center">
                      <button
                        type="button"
                        class="bg-success-focus text-success-600 bg-hover-success-200 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                        data-bs-toggle="modal"
                        data-bs-target="#rolePermissionModal"
                        @click.prevent="openPermissionModal(role)"
                      >
                        <iconify-icon icon="lucide:edit" class="menu-icon" />
                      </button>
                      <button
                        type="button"
                        class="remove-item-btn bg-danger-focus bg-hover-danger-200 text-danger-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                        @click.prevent="deleteRole(role)"
                      >
                        <iconify-icon icon="fluent:delete-24-regular" class="menu-icon" />
                      </button>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-24">
          <span>
            Showing {{ pagination.from || 0 }} to {{ pagination.to || 0 }} of {{ pagination.total || 0 }} entries
          </span>
          <ul class="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
            <li class="page-item" :class="{ disabled: table.page === 1 }">
              <a
                class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                href="javascript:void(0)"
                @click="table.page > 1 && (table.page -= 1)"
              >
                <iconify-icon icon="ep:d-arrow-left" class="text-xl" />
              </a>
            </li>

            <li v-for="p in pagination.last_page" :key="p" class="page-item">
              <a
                href="javascript:void(0)"
                :class="[
                  'page-link fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px',
                  p === table.page ? 'bg-primary-600 text-white' : 'bg-primary-50 text-secondary-light',
                ]"
                @click="table.page = p"
              >
                {{ p }}
              </a>
            </li>

            <li class="page-item" :class="{ disabled: table.page === pagination.last_page }">
              <a
                class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                href="javascript:void(0)"
                @click="table.page < pagination.last_page && (table.page += 1)"
              >
                <iconify-icon icon="ep:d-arrow-right" class="text-xl" />
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <div id="rolePermissionModal" class="modal fade" tabindex="-1" aria-labelledby="rolePermissionModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content radius-16 bg-base">
        <div class="modal-header py-16 px-24 border border-top-0 border-start-0 border-end-0">
          <div>
            <h1 id="rolePermissionModalLabel" class="modal-title fs-5">{{ currentRoleName || 'Role Permissions' }}</h1>
            <p class="text-secondary-light text-sm mb-0 mt-1">
              Parent selections cascade to every child in the sidebar branch.
            </p>
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" />
        </div>
        <div class="modal-body p-24">
          <div v-if="loadingPermissions" class="text-center py-32">Loading permissions...</div>
          <PermissionTree
            v-else
            v-model="selectedPermissions"
            title="Edit Permission Tree"
            description="Use the same structure the user will see in the sidebar."
          />
        </div>
        <div class="modal-footer border border-bottom-0 border-start-0 border-end-0">
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>
          <button class="btn btn-primary" :disabled="isSubmitting || loadingPermissions" @click="updateRolePermissions">
            <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
            {{ isSubmitting ? 'Saving...' : 'Save Permissions' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
