 <script lang="ts" setup>
import { definePageMeta, useNuxtApp } from '#imports'
import { ref, onMounted, reactive, watch } from 'vue'
import { useFlashStore } from '~/stores/flashs'

const flash = useFlashStore()

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'vendors', // or 'vendor_users'
})

const { $axios } = (useNuxtApp() as any)

/* ---------------- Types ---------------- */
interface Vendor {
  id: number
  Vendor_Code?: string
  Vendor_Name: string
}

interface VendorUser {
  id: number
  Vendor_Id: number | null
  User_Id: string
  User_Name: string | null
  email: string | null
  Phone?: string | null
  Gsm?: string | null
  Company_Code?: string | null
  Merchant_Id?: string | null
  Status?: string | null
  vendor?: Vendor | null
}

/* ---------------- Create Form State ---------------- */
const vendors = ref<Vendor[]>([])
const Vendor_Id = ref<number | ''>('')

const User_Name = ref<string>('')
const email = ref<string>('')
const password = ref<string>('')

// password show/hide
const showPassword = ref<boolean>(false)

const Phone = ref<string>('')
const Gsm = ref<string>('')
const Company_Code = ref<string>('')
const Merchant_Id = ref<string>('')

const Status = ref<'active' | 'inactive' | 'blocked' | 'pending'>('active')

const isSubmit = ref(false)
const errorMessage = ref<string | null>(null)

/* ---------------- Table State ---------------- */
const users = ref<VendorUser[]>([])
const isLoading = ref(false)


const showReset = ref(false)
const isResetting = ref(false)
const resetErrorMessage = ref<string | null>(null)

const resetUserId = ref<number | null>(null)
const resetUserLabel = ref<string>('')

// inputs for new password
const resetPassword = ref<string>('')
const resetPasswordConfirm = ref<string>('')

// show/hide toggles
const showResetPassword = ref<boolean>(false)
const showResetPasswordConfirm = ref<boolean>(false)

const table = reactive({
  page: 1,
  perPage: 10,
  search: '',
  vendor_id: '' as number | '' // filter by vendor
})

// paginator info from backend
const pagination = ref({
  total: 0,
  from: 0,
  to: 0,
  last_page: 1,
})

/* ---------------- Edit Modal State ---------------- */
const showEdit = ref(false)
const isSavingEdit = ref(false)
const editErrorMessage = ref<string | null>(null)

const editUser = reactive<{
  id: number | null
  Vendor_Id: number | ''
  User_Name: string
  email: string
  Phone: string
  Gsm: string
  Company_Code: string
  Merchant_Id: string
  Status: 'active' | 'inactive' | 'blocked' | 'pending' | string
}>({
  id: null,
  Vendor_Id: '',
  User_Name: '',
  email: '',
  Phone: '',
  Gsm: '',
  Company_Code: '',
  Merchant_Id: '',
  Status: 'active',
})



const openReset = (u: VendorUser) => {
  resetErrorMessage.value = null
  resetUserId.value = u.id
  resetUserLabel.value = u.User_Name || u.email || u.User_Id
  resetPassword.value = ''
  resetPasswordConfirm.value = ''
  showResetPassword.value = false
  showResetPasswordConfirm.value = false
  showReset.value = true
}

const closeReset = () => {
  showReset.value = false
  resetUserId.value = null
  resetUserLabel.value = ''
  resetPassword.value = ''
  resetPasswordConfirm.value = ''
  resetErrorMessage.value = null
  showResetPassword.value = false
  showResetPasswordConfirm.value = false
}

const submitReset = async () => {
  if (!resetUserId.value) return
  isResetting.value = true
  resetErrorMessage.value = null

  try {
    await $axios.post(`/api/vendor-users/${resetUserId.value}/reset-password`, {
      password: resetPassword.value,
      password_confirmation: resetPasswordConfirm.value,
    })

    flash.success('Password reset successfully.')
    closeReset()
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      'Failed to reset password.'
    resetErrorMessage.value = msg
    flash.error(msg)
  } finally {
    isResetting.value = false
  }
}


/* ---------------- API ---------------- */
const fetchVendors = async () => {
  try {
    const { data } = await $axios.get('/api/vendors/all')
    vendors.value = data || []
  } catch (error: any) {
    flash.error(
      'Failed to load vendors: ' +
        (error?.response?.data?.message || error?.message || 'Unknown error')
    )
  }
}

const fetchUsers = async () => {
  isLoading.value = true
  try {
    const { data } = await $axios.get('/api/vendor-users', {
      params: {
        page: table.page,
        per_page: table.perPage,
        search: table.search,
        vendor_id: table.vendor_id || undefined,
      },
    })

    users.value = data.data

    pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }
  } catch (error: any) {
    flash.error(
      'Failed to load vendor users: ' +
        (error?.response?.data?.message || error?.message || 'Unknown error')
    )
  } finally {
    isLoading.value = false
  }
}

const resetForm = () => {
  Vendor_Id.value = ''
  User_Name.value = ''
  email.value = ''
  password.value = ''
  Phone.value = ''
  Gsm.value = ''
  Company_Code.value = ''
  Merchant_Id.value = ''
  Status.value = 'active'
  errorMessage.value = null
  showPassword.value = false
}

const submitForm = async () => {
  isSubmit.value = true
  errorMessage.value = null

  try {
    await $axios.post('/api/vendor-users', {
      Vendor_Id: Vendor_Id.value,
      User_Name: User_Name.value,
      email: email.value,
      password: password.value,
      Phone: Phone.value || null,
      Gsm: Gsm.value || null,
      Company_Code: Company_Code.value || null,
      Merchant_Id: Merchant_Id.value || null,
      Status: Status.value,
    })

    flash.success('Vendor user created successfully.')
    resetForm()
    table.page = 1
    await fetchUsers()
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      'Failed to create vendor user.'
    errorMessage.value = msg
    flash.error(msg)
  } finally {
    isSubmit.value = false
  }
}

/* ---- Reset filters (search + vendor filter) ---- */
const resetFilters = () => {
  table.search = ''
  table.vendor_id = ''
  table.page = 1
}

/* ---- Copy user ID ---- */
const copyUserId = async (u: VendorUser) => {
  if (!u.User_Id) return
  try {
    await navigator.clipboard.writeText(u.User_Id)
    flash.success(`User ID "${u.User_Id}" copied to clipboard.`)
  } catch (error) {
    flash.error('Failed to copy User ID.')
  }
}

/* ---- Edit logic ---- */
const openEdit = (u: VendorUser) => {
  editErrorMessage.value = null
  editUser.id = u.id
  editUser.Vendor_Id = u.Vendor_Id ?? ''
  editUser.User_Name = u.User_Name || ''
  editUser.email = u.email || ''
  editUser.Phone = u.Phone || ''
  editUser.Gsm = u.Gsm || ''
  editUser.Company_Code = u.Company_Code || ''
  editUser.Merchant_Id = u.Merchant_Id || ''
  editUser.Status = (u.Status as any) || 'active'
  showEdit.value = true
}

const closeEdit = () => {
  showEdit.value = false
  editUser.id = null
  editUser.Vendor_Id = ''
  editUser.User_Name = ''
  editUser.email = ''
  editUser.Phone = ''
  editUser.Gsm = ''
  editUser.Company_Code = ''
  editUser.Merchant_Id = ''
  editUser.Status = 'active'
  editErrorMessage.value = null
}

const saveEdit = async () => {
  if (!editUser.id) return
  isSavingEdit.value = true
  editErrorMessage.value = null

  try {
    await $axios.put(`/api/vendor-users/${editUser.id}`, {
      Vendor_Id: editUser.Vendor_Id,
      User_Name: editUser.User_Name,
      email: editUser.email,
      Phone: editUser.Phone || null,
      Gsm: editUser.Gsm || null,
      Company_Code: editUser.Company_Code || null,
      Merchant_Id: editUser.Merchant_Id || null,
      Status: editUser.Status || 'active',
      // password omitted -> no change
    })

    flash.success('Vendor user updated successfully.')
    await fetchUsers()
    closeEdit()
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      'Failed to update vendor user.'
    editErrorMessage.value = msg
    flash.error(msg)
  } finally {
    isSavingEdit.value = false
  }
}

/* ---- Delete logic ---- */
const deleteUser = async (u: VendorUser) => {
  const ok = await flash.confirm({
    title: 'Delete vendor user?',
    message: `Are you sure you want to delete "${u.User_Name || u.email || u.User_Id}"? This cannot be undone.`,
    confirmText: 'Yes, delete',
    cancelText: 'No, cancel',
  })

  if (!ok) return

  try {
    await $axios.delete(`/api/vendor-users/${u.id}`)
    flash.success('Vendor user deleted successfully.')
    await fetchUsers()
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      'Failed to delete vendor user.'
    flash.error(msg)
  }
}

/* ---------------- Watchers ---------------- */
watch(
  () => [table.page, table.perPage, table.search, table.vendor_id],
  async () => {
    await fetchUsers()
  }
)

/* ---------------- Mount ---------------- */
onMounted(async () => {
  await fetchVendors()
  await fetchUsers()
})
</script>

<template>
  <!-- CREATE -->
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #6b8629">Create Vendor User</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg" />
            Dashboard
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">Vendor Users</li>
      </ul>
    </div>

    <div class="card h-100 p-0 radius-12 overflow-hidden mb-24">
      <div class="card-body p-40">
        <form @submit.prevent="submitForm" class="row g-4">
          <!-- Vendor -->
          <div class="col-sm-6">
            <label class="form-label fw-semibold text-primary-light text-sm mb-8">
              Vendor <span class="text-danger-600">*</span>
            </label>
            <select v-model="Vendor_Id" class="form-control radius-8" required>
              <option value="">-- Select Vendor --</option>
              <option v-for="v in vendors" :key="v.id" :value="v.id">
                {{ v.Vendor_Name }}
                <span v-if="v.Vendor_Code"> ({{ v.Vendor_Code }})</span>
              </option>
            </select>
          </div>

          <!-- Name -->
          <div class="col-sm-6">
            <label class="form-label fw-semibold text-primary-light text-sm mb-8">
              User Name <span class="text-danger-600">*</span>
            </label>
            <input
              type="text"
              v-model="User_Name"
              class="form-control radius-8"
              placeholder="Enter user name"
              required
            />
          </div>

          <!-- Email -->
          <div class="col-sm-6">
            <label class="form-label fw-semibold text-primary-light text-sm mb-8">
              Email <span class="text-danger-600">*</span>
            </label>
            <input
              type="email"
              v-model="email"
              class="form-control radius-8"
              placeholder="Enter email"
              required
            />
          </div>

          <!-- Password with show/hide toggle -->
          <div class="col-sm-6">
            <label class="form-label fw-semibold text-primary-light text-sm mb-8">
              Password <span class="text-danger-600">*</span>
            </label>
            <div class="input-group">
              <input
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                class="form-control radius-8"
                placeholder="Minimum 8 characters"
                required
              />
              <button
                type="button"
                class="btn btn-outline-secondary"
                @click="showPassword = !showPassword"
              >
                <iconify-icon
                  :icon="showPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'"
                />
              </button>
            </div>
          </div>

          <!-- Phone -->
          <div class="col-sm-3">
            <label class="form-label fw-semibold text-primary-light text-sm mb-8">Phone</label>
            <input
              type="text"
              v-model="Phone"
              class="form-control radius-8"
              placeholder="Phone"
            />
          </div>

          <!-- GSM -->
          <div class="col-sm-3">
            <label class="form-label fw-semibold text-primary-light text-sm mb-8">GSM</label>
            <input
              type="text"
              v-model="Gsm"
              class="form-control radius-8"
              placeholder="GSM"
            />
          </div>

          <!-- Company Code -->
          <div class="col-sm-3">
            <label class="form-label fw-semibold text-primary-light text-sm mb-8">
              Company Code
            </label>
            <input
              type="text"
              v-model="Company_Code"
              class="form-control radius-8"
              placeholder="Company_Code"
            />
          </div>

          <!-- Merchant Id -->
          <div class="col-sm-3">
            <label class="form-label fw-semibold text-primary-light text-sm mb-8">
              Merchant ID
            </label>
            <input
              type="text"
              v-model="Merchant_Id"
              class="form-control radius-8"
              placeholder="Merchant_Id"
            />
          </div>

          <!-- Status -->
          <div class="col-sm-4">
            <label class="form-label fw-semibold text-primary-light text-sm mb-8">
              Status
            </label>
            <select v-model="Status" class="form-control radius-8">
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="pending">pending</option>
              <option value="blocked">blocked</option>
            </select>
          </div>

          <!-- Actions -->
          <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
            <button
              type="button"
              class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8"
              @click="resetForm"
            >
              Reset
            </button>

            <button
              type="submit"
              class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"
              :disabled="isSubmit"
            >
              <span
                v-if="isSubmit"
                class="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
              <span v-else>Save</span>
            </button>
          </div>

          <div v-if="errorMessage" class="alert alert-danger py-8 px-12 mt-3" role="alert">
            {{ errorMessage }}
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- LIST -->
  <div class="dashboard-main-body">
    <div class="col-lg-12">
      <div class="card">
        <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div class="d-flex flex-wrap align-items-center gap-3">
            <div class="d-flex align-items-center gap-2">
              <span>Show</span>
              <select v-model.number="table.perPage" class="form-select form-select-sm w-auto">
                <option :value="10">10</option>
                <option :value="15">15</option>
                <option :value="20">20</option>
              </select>
            </div>

            <!-- Search -->
            <div class="icon-field">
              <input
                v-model="table.search"
                type="text"
                class="form-control form-control-sm w-auto"
                placeholder="Search (User ID / Name / Email)"
              />
              <span class="icon">
                <iconify-icon icon="ion:search-outline"></iconify-icon>
              </span>
            </div>

            <!-- Vendor Filter -->
            <div class="icon-field">
              <select v-model="table.vendor_id" class="form-select form-select-sm w-auto">
                <option value="">All Vendors</option>
                <option v-for="v in vendors" :key="v.id" :value="v.id">
                  {{ v.Vendor_Name }}
                  <span v-if="v.Vendor_Code"> ({{ v.Vendor_Code }})</span>
                </option>
              </select>
            </div>

            <!-- Reset Filters -->
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              @click="resetFilters"
            >
              Reset Filters
            </button>
          </div>
        </div>

        <div class="card-body">
          <div class="spinner-border" role="status" v-if="isLoading">
            <span class="sr-only">Loading...</span>
          </div>

          <table class="table bordered-table mb-0" v-else>
            <thead>
              <tr>
                <th scope="col">S.L</th>
                <th scope="col">Vendor</th>
                <th scope="col">User ID</th>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="(u, index) in users" :key="u.id">
                <td>{{ index + 1 + (pagination.from - 1) }}</td>

                <!-- Vendor + badge with code -->
                <td>
                  <div v-if="u.vendor" class="d-flex flex-column">
                    <span>{{ u.vendor.Vendor_Name }}</span>
                    <span
                      v-if="u.vendor.Vendor_Code"
                      class="badge bg-primary-50 text-primary-600 mt-1"
                    >
                      {{ u.vendor.Vendor_Code }}
                    </span>
                  </div>
                  <span v-else>-</span>
                </td>

                <!-- User ID + copy button -->
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <span class="text-monospace">{{ u.User_Id || '-' }}</span>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-secondary"
                      @click.prevent="copyUserId(u)"
                      title="Copy User ID"
                    >
                      <iconify-icon icon="solar:copy-bold" class="text-sm" />
                    </button>
                  </div>
                </td>

                <td>{{ u.User_Name || '-' }}</td>
                <td>{{ u.email || '-' }}</td>
                <td>
                  <span class="badge bg-success" v-if="u.Status === 'active'">active</span>
                  <span class="badge bg-secondary" v-else-if="u.Status === 'inactive'">
                    inactive
                  </span>
                  <span class="badge bg-warning" v-else-if="u.Status === 'pending'">
                    pending
                  </span>
                  <span class="badge bg-danger" v-else-if="u.Status === 'blocked'">
                    blocked
                  </span>
                  <span class="badge bg-light text-dark" v-else>
                    {{ u.Status || '-' }}
                  </span>
                </td>

                <!-- Actions -->
                 <td>
  <div class="d-flex align-items-center gap-2">
    <!-- Edit -->
    <button
      type="button"
      class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center"
      @click.prevent="openEdit(u)"
    >
      <iconify-icon icon="lucide:edit"></iconify-icon>
    </button>

    <!-- Reset Password -->
    <button
      type="button"
      class="w-32-px h-32-px bg-warning-focus text-warning-main rounded-circle d-inline-flex align-items-center justify-content-center"
      @click.prevent="openReset(u)"
      title="Reset Password"
    >
      <iconify-icon icon="mdi:key-variant" class="text-sm" />
    </button>

    <!-- Delete -->
    <button
      type="button"
      class="w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center"
      @click.prevent="deleteUser(u)"
    >
      <iconify-icon icon="mingcute:delete-2-line"></iconify-icon>
    </button>
  </div>
</td>

              </tr>

              <tr v-if="users.length === 0">
                <td colspan="7" class="text-center py-4 text-muted">
                  No vendor users found.
                </td>
              </tr>
            </tbody>
          </table>

          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-24">
            <span>
              Showing {{ pagination.from || 0 }} to {{ pagination.to || 0 }} of
              {{ pagination.total || 0 }} entries
            </span>

            <ul class="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
              <!-- Prev -->
              <li class="page-item" :class="{ disabled: table.page === 1 }">
                <a
                  class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                  href="javascript:void(0)"
                  @click="table.page > 1 && (table.page -= 1)"
                >
                  <iconify-icon icon="ep:d-arrow-left" class="text-xl"></iconify-icon>
                </a>
              </li>

              <!-- Page numbers -->
              <li v-for="p in pagination.last_page" :key="p" class="page-item">
                <a
                  href="javascript:void(0)"
                  @click="table.page = p"
                  :class="[
                    'page-link fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px',
                    p === table.page ? 'bg-primary-600 text-white' : 'bg-primary-50 text-secondary-light'
                  ]"
                >
                  {{ p }}
                </a>
              </li>

              <!-- Next -->
              <li class="page-item" :class="{ disabled: table.page === pagination.last_page }">
                <a
                  class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                  href="javascript:void(0)"
                  @click="table.page < pagination.last_page && (table.page += 1)"
                >
                  <iconify-icon icon="ep:d-arrow-right" class="text-xl"></iconify-icon>
                </a>
              </li>
            </ul>

          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- EDIT MODAL -->
  <transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0"
              enter-to-class="opacity-100" leave-active-class="transition-opacity duration-150"
              leave-from-class="opacity-100" leave-to-class="opacity-0">
    <div v-if="showEdit" class="modal-backdrop" @click.self="closeEdit">
      <div class="modal-card" role="dialog" aria-modal="true">
        <!-- Header -->
        <div class="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
          <h6 class="fw-semibold mb-0">Edit Vendor User</h6>
          <button type="button" class="btn btn-sm btn-outline-secondary" @click="closeEdit">
            ✕
          </button>
        </div>

        <!-- Body -->
        <form @submit.prevent="saveEdit">
          <div class="row g-3">
            <div class="col-sm-6">
              <label class="form-label fw-semibold text-sm">Vendor<span class="text-danger">*</span></label>
              <select v-model="editUser.Vendor_Id" class="form-control radius-8" required>
                <option value="">-- Select Vendor --</option>
                <option v-for="v in vendors" :key="v.id" :value="v.id">
                  {{ v.Vendor_Name }}
                  <span v-if="v.Vendor_Code"> ({{ v.Vendor_Code }})</span>
                </option>
              </select>
            </div>

            <div class="col-sm-6">
              <label class="form-label fw-semibold text-sm">User Name<span class="text-danger">*</span></label>
              <input
                type="text"
                class="form-control radius-8"
                v-model="editUser.User_Name"
                required
              />
            </div>

            <div class="col-sm-6">
              <label class="form-label fw-semibold text-sm">Email<span class="text-danger">*</span></label>
              <input
                type="email"
                class="form-control radius-8"
                v-model="editUser.email"
                required
              />
            </div>

            <div class="col-sm-3">
              <label class="form-label fw-semibold text-sm">Phone</label>
              <input
                type="text"
                class="form-control radius-8"
                v-model="editUser.Phone"
              />
            </div>

            <div class="col-sm-3">
              <label class="form-label fw-semibold text-sm">GSM</label>
              <input
                type="text"
                class="form-control radius-8"
                v-model="editUser.Gsm"
              />
            </div>

            <div class="col-sm-3">
              <label class="form-label fw-semibold text-sm">Company Code</label>
              <input
                type="text"
                class="form-control radius-8"
                v-model="editUser.Company_Code"
              />
            </div>

            <div class="col-sm-3">
              <label class="form-label fw-semibold text-sm">Merchant ID</label>
              <input
                type="text"
                class="form-control radius-8"
                v-model="editUser.Merchant_Id"
              />
            </div>

            <div class="col-sm-4">
              <label class="form-label fw-semibold text-sm">Status</label>
              <select v-model="editUser.Status" class="form-control radius-8">
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="pending">pending</option>
                <option value="blocked">blocked</option>
              </select>
            </div>
          </div>

          <div v-if="editErrorMessage" class="alert alert-danger py-8 px-12 mt-3" role="alert">
            {{ editErrorMessage }}
          </div>

          <!-- Footer -->
          <div class="d-flex align-items-center justify-content-end gap-2 mt-3">
            <button type="button" class="btn btn-outline-secondary" @click="closeEdit">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="isSavingEdit">
              <span
                v-if="isSavingEdit"
                class="spinner-border spinner-border-sm me-1"
                role="status"
                aria-hidden="true"
              ></span>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  </transition>


  <!-- RESET PASSWORD MODAL -->
<transition
  enter-active-class="transition-opacity duration-200"
  enter-from-class="opacity-0"
  enter-to-class="opacity-100"
  leave-active-class="transition-opacity duration-150"
  leave-from-class="opacity-100"
  leave-to-class="opacity-0"
>
  <div v-if="showReset" class="modal-backdrop" @click.self="closeReset">
    <div class="modal-card" role="dialog" aria-modal="true">
      <!-- Header -->
      <div class="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
        <div>
          <h6 class="fw-semibold mb-0">Reset Password</h6>
          <small class="text-muted d-block">
            User: {{ resetUserLabel }}
          </small>
        </div>
        <button type="button" class="btn btn-sm btn-outline-secondary" @click="closeReset">
          ✕
        </button>
      </div>

      <!-- Body -->
      <form @submit.prevent="submitReset">
        <div class="mb-3">
          <label class="form-label fw-semibold text-sm">
            New Password <span class="text-danger">*</span>
          </label>
          <div class="input-group">
            <input
              :type="showResetPassword ? 'text' : 'password'"
              class="form-control radius-8"
              v-model="resetPassword"
              placeholder="Enter new password"
              required
            />
            <button
              type="button"
              class="btn btn-outline-secondary"
              @click="showResetPassword = !showResetPassword"
            >
              <iconify-icon
                :icon="showResetPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'"
              />
            </button>
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label fw-semibold text-sm">
            Confirm New Password <span class="text-danger">*</span>
          </label>
          <div class="input-group">
            <input
              :type="showResetPasswordConfirm ? 'text' : 'password'"
              class="form-control radius-8"
              v-model="resetPasswordConfirm"
              placeholder="Re-enter new password"
              required
            />
            <button
              type="button"
              class="btn btn-outline-secondary"
              @click="showResetPasswordConfirm = !showResetPasswordConfirm"
            >
              <iconify-icon
                :icon="showResetPasswordConfirm ? 'mdi:eye-off-outline' : 'mdi:eye-outline'"
              />
            </button>
          </div>
        </div>

        <div
          v-if="resetErrorMessage"
          class="alert alert-danger py-8 px-12 mt-2"
          role="alert"
        >
          {{ resetErrorMessage }}
        </div>

        <!-- Footer -->
        <div class="d-flex align-items-center justify-content-end gap-2 mt-3">
          <button type="button" class="btn btn-outline-secondary" @click="closeReset">
            Cancel
          </button>
          <button type="submit" class="btn btn-warning" :disabled="isResetting">
            <span
              v-if="isResetting"
              class="spinner-border spinner-border-sm me-1"
              role="status"
              aria-hidden="true"
            ></span>
            Reset Password
          </button>
        </div>
      </form>
    </div>
  </div>
</transition>

</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.5);
  display: grid;
  place-items: center;
  z-index: 1050;
}

.modal-card {
  width: min(640px, 92vw);
  max-height: 90vh;
  overflow: auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18);
  padding: 20px;
}
</style>
