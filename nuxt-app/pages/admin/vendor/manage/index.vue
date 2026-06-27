<script lang="ts" setup>
import { useNuxtApp, definePageMeta } from '#imports'
import { ref, onMounted, reactive, watch, computed } from 'vue'
import { useFlashStore } from '~/stores/flashs'

const flash = useFlashStore()

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permission: 'vendors',
})

const { $axios } = useNuxtApp() as any

interface VendorDoc { id: number; Document_Type?: string; Document_Name?: string; Status?: string | null }
interface Vendor {
  id: number
  Vendor_Code: string
  Vendor_Name: string
  Email_1?: string | null
  Approval_Status?: 'pending' | 'accepted' | 'under_review' | 'approved' | 'rejected' | null
  Onboarding_Completeness?: number | null
  onboarding_checklist?: { completeness_percent: number }
  Status: 'active' | 'pending' | 'suspended' | 'blocked'
  Is_Active: boolean
  documents?: VendorDoc[]
}

const vendors = ref<Vendor[]>([])
const isLoading = ref(false)
const table = reactive({ page: 1, perPage: 10, search: '', sortBy: 'id', sortDir: 'desc' })
const pagination = ref({ total: 0, from: 0, to: 0, last_page: 1 })

const badgeBase = 'tw:inline-flex tw:items-center tw:rounded-full tw:px-2.5 tw:py-0.5 tw:text-theme-xs tw:font-medium'
const approvalBadgeClass = (value?: string | null) => {
  if (value === 'approved') return 'tw:bg-success-50 tw:text-success-700'
  if (value === 'rejected') return 'tw:bg-error-50 tw:text-error-700'
  if (value === 'under_review') return 'tw:bg-warning-50 tw:text-warning-700'
  if (value === 'accepted') return 'tw:bg-blue-light-50 tw:text-blue-light-700'
  return 'tw:bg-gray-100 tw:text-gray-700'
}
const statusBadgeClass = (value?: string | null) => {
  if (value === 'active') return 'tw:bg-success-50 tw:text-success-700'
  if (value === 'blocked' || value === 'suspended') return 'tw:bg-error-50 tw:text-error-700'
  if (value === 'pending') return 'tw:bg-warning-50 tw:text-warning-700'
  return 'tw:bg-gray-100 tw:text-gray-700'
}
const completion = (v: Vendor) => Number(v.onboarding_checklist?.completeness_percent ?? v.Onboarding_Completeness ?? 0)

const docLabels: Record<string, string> = {
  commercial_registration: 'CR',
  chamber_of_commerce: 'Chamber of Commerce',
  activity_license: 'Activity License',
  rent_contract: 'Rent Contract',
}
const docLabel = (type?: string) => docLabels[type || ''] || (type || 'Document')

const stats = computed(() => ({
  total: pagination.value.total || vendors.value.length,
  active: vendors.value.filter(v => v.Is_Active).length,
  pending: vendors.value.filter(v => v.Approval_Status === 'pending' || v.Approval_Status === 'under_review').length,
  blocked: vendors.value.filter(v => ['blocked', 'suspended'].includes(v.Status)).length,
}))

const getVendors = async () => {
  isLoading.value = true
  try {
    const { data } = await $axios.get('/api/vendors', {
      params: { page: table.page, per_page: table.perPage, search: table.search, sort_by: table.sortBy, sort_dir: table.sortDir },
    })
    vendors.value = data.data
    pagination.value = { total: data.total, from: data.from, to: data.to, last_page: data.last_page }
  } catch (error: any) {
    flash.error(error?.response?.data?.message || 'Failed to load vendors.')
  } finally {
    isLoading.value = false
  }
}

watch(() => [table.page, table.perPage, table.search], async () => { await getVendors() })

const openingDoc = ref<number | null>(null)
const openDocument = async (docId: number) => {
  openingDoc.value = docId
  try {
    const { data } = await $axios.get(`/api/admin/vendor-documents/${docId}/url`)
    if (data?.url) window.open(data.url, '_blank', 'noopener')
    else flash.error('Document URL unavailable.')
  } catch (error: any) {
    flash.error(error?.response?.data?.message || 'Could not open document.')
  } finally {
    openingDoc.value = null
  }
}

const quickApprove = async (v: Vendor) => {
  try {
    await $axios.patch(`/api/vendors/${v.id}/approval`, { approval_status: 'approved', note: 'Approved from manage vendors.' })
    flash.success(`${v.Vendor_Name} approved.`)
    await getVendors()
  } catch (error: any) {
    flash.error(error?.response?.data?.message || 'Failed to approve vendor.')
  }
}

onMounted(getVendors)
</script>

<template>
  <div class="ta tw:min-h-full tw:bg-gray-50 tw:p-4 tw:md:p-6">
    <!-- Page header -->
    <div class="tw:mb-6 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3">
      <div>
        <p class="tw:text-xl tw:font-semibold tw:text-gray-800">Manage Vendors</p>
        <p class="tw:mt-1 tw:text-theme-sm tw:text-gray-500">View and manage all vendors — approval, status and documents.</p>
      </div>
      <nav>
        <ol class="tw:flex tw:items-center tw:gap-1.5">
          <li>
            <NuxtLink to="/admin" class="tw:inline-flex tw:items-center tw:gap-1.5 tw:text-theme-sm tw:text-gray-500 tw:hover:text-gray-700">
              Home
              <iconify-icon icon="ep:arrow-right" class="tw:text-gray-400"></iconify-icon>
            </NuxtLink>
          </li>
          <li class="tw:text-theme-sm tw:text-gray-800">Manage Vendors</li>
        </ol>
      </nav>
    </div>

    <!-- Stat cards -->
    <div class="tw:mb-6 tw:grid tw:grid-cols-1 tw:gap-4 tw:sm:grid-cols-2 tw:xl:grid-cols-4">
      <div class="tw:rounded-2xl tw:border tw:border-gray-200 tw:bg-white tw:p-5 tw:shadow-theme-xs tw:md:p-6">
        <span class="tw:flex tw:h-12 tw:w-12 tw:items-center tw:justify-center tw:rounded-xl tw:bg-brand-50 tw:text-brand-600"><iconify-icon icon="solar:shop-linear" class="tw:text-2xl"></iconify-icon></span>
        <div class="tw:mt-5 tw:flex tw:items-end tw:justify-between">
          <div>
            <span class="tw:text-theme-sm tw:text-gray-500">Total vendors</span>
            <p class="tw:mt-2 tw:text-title-sm tw:font-bold tw:text-gray-800">{{ stats.total }}</p>
          </div>
        </div>
      </div>
      <div class="tw:rounded-2xl tw:border tw:border-gray-200 tw:bg-white tw:p-5 tw:shadow-theme-xs tw:md:p-6">
        <span class="tw:flex tw:h-12 tw:w-12 tw:items-center tw:justify-center tw:rounded-xl tw:bg-success-50 tw:text-success-600"><iconify-icon icon="solar:check-circle-linear" class="tw:text-2xl"></iconify-icon></span>
        <div class="tw:mt-5 tw:flex tw:items-end tw:justify-between">
          <div>
            <span class="tw:text-theme-sm tw:text-gray-500">Active (page)</span>
            <p class="tw:mt-2 tw:text-title-sm tw:font-bold tw:text-gray-800">{{ stats.active }}</p>
          </div>
        </div>
      </div>
      <div class="tw:rounded-2xl tw:border tw:border-gray-200 tw:bg-white tw:p-5 tw:shadow-theme-xs tw:md:p-6">
        <span class="tw:flex tw:h-12 tw:w-12 tw:items-center tw:justify-center tw:rounded-xl tw:bg-warning-50 tw:text-warning-600"><iconify-icon icon="solar:clock-circle-linear" class="tw:text-2xl"></iconify-icon></span>
        <div class="tw:mt-5 tw:flex tw:items-end tw:justify-between">
          <div>
            <span class="tw:text-theme-sm tw:text-gray-500">Awaiting (page)</span>
            <p class="tw:mt-2 tw:text-title-sm tw:font-bold tw:text-gray-800">{{ stats.pending }}</p>
          </div>
        </div>
      </div>
      <div class="tw:rounded-2xl tw:border tw:border-gray-200 tw:bg-white tw:p-5 tw:shadow-theme-xs tw:md:p-6">
        <span class="tw:flex tw:h-12 tw:w-12 tw:items-center tw:justify-center tw:rounded-xl tw:bg-error-50 tw:text-error-600"><iconify-icon icon="solar:shield-warning-linear" class="tw:text-2xl"></iconify-icon></span>
        <div class="tw:mt-5 tw:flex tw:items-end tw:justify-between">
          <div>
            <span class="tw:text-theme-sm tw:text-gray-500">Blocked (page)</span>
            <p class="tw:mt-2 tw:text-title-sm tw:font-bold tw:text-gray-800">{{ stats.blocked }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Table card -->
    <div class="tw:overflow-hidden tw:rounded-2xl tw:border tw:border-gray-200 tw:bg-white tw:shadow-theme-xs">
      <div class="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:border-b tw:border-gray-100 tw:px-5 tw:py-4">
        <div>
          <p class="tw:text-base tw:font-semibold tw:text-gray-800">Vendor directory</p>
          <p class="tw:text-theme-xs tw:text-gray-500">All registered vendors.</p>
        </div>
        <div class="tw:flex tw:flex-wrap tw:items-center tw:gap-3">
          <select v-model.number="table.perPage" aria-label="Rows per page" class="tw:h-11 tw:rounded-lg tw:border tw:border-gray-300 tw:bg-white tw:px-3 tw:text-theme-sm tw:text-gray-700 tw:shadow-theme-xs tw:focus:border-brand-300 tw:focus:outline-hidden tw:focus:ring-3 tw:focus:ring-brand-500/10">
            <option :value="10">10</option><option :value="15">15</option><option :value="25">25</option>
          </select>
          <div class="tw:relative tw:w-full tw:sm:w-auto">
            <span class="tw:pointer-events-none tw:absolute tw:top-1/2 tw:left-3 tw:-translate-y-1/2 tw:text-gray-400"><iconify-icon icon="ion:search-outline"></iconify-icon></span>
            <input v-model="table.search" type="text" placeholder="Search vendors" aria-label="Search vendors"
              class="tw:h-11 tw:w-full tw:sm:w-56 tw:rounded-lg tw:border tw:border-gray-300 tw:bg-white tw:pr-3 tw:pl-9 tw:text-theme-sm tw:text-gray-800 tw:shadow-theme-xs tw:placeholder:text-gray-400 tw:focus:border-brand-300 tw:focus:outline-hidden tw:focus:ring-3 tw:focus:ring-brand-500/10" />
          </div>
        </div>
      </div>

      <div class="tw:p-2">
        <div v-if="isLoading" class="tw:flex tw:items-center tw:justify-center tw:gap-2 tw:py-12 tw:text-theme-sm tw:text-gray-500">
          <span class="tw:h-4 tw:w-4 tw:animate-spin tw:rounded-full tw:border-2 tw:border-gray-300 tw:border-t-brand-500"></span> Loading…
        </div>

        <div v-else class="tw:overflow-x-auto tw:custom-scrollbar">
          <table class="tw:min-w-full">
            <thead>
              <tr class="tw:border-y tw:border-gray-100">
                <th class="tw:px-5 tw:py-3 tw:text-left tw:text-theme-xs tw:font-medium tw:text-gray-500">S.L</th>
                <th class="tw:px-5 tw:py-3 tw:text-left tw:text-theme-xs tw:font-medium tw:text-gray-500">Code</th>
                <th class="tw:px-5 tw:py-3 tw:text-left tw:text-theme-xs tw:font-medium tw:text-gray-500">Name</th>
                <th class="tw:px-5 tw:py-3 tw:text-left tw:text-theme-xs tw:font-medium tw:text-gray-500">Email</th>
                <th class="tw:px-5 tw:py-3 tw:text-left tw:text-theme-xs tw:font-medium tw:text-gray-500">Approval</th>
                <th class="tw:px-5 tw:py-3 tw:text-left tw:text-theme-xs tw:font-medium tw:text-gray-500">Status</th>
                <th class="tw:px-5 tw:py-3 tw:text-left tw:text-theme-xs tw:font-medium tw:text-gray-500">Completion</th>
                <th class="tw:px-5 tw:py-3 tw:text-left tw:text-theme-xs tw:font-medium tw:text-gray-500">Documents</th>
                <th class="tw:px-5 tw:py-3 tw:text-right tw:text-theme-xs tw:font-medium tw:text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody class="tw:divide-y tw:divide-gray-100">
              <tr v-if="!vendors.length"><td colspan="9" class="tw:px-5 tw:py-12 tw:text-center tw:text-theme-sm tw:text-gray-500">No vendors found.</td></tr>
              <tr v-for="(v, index) in vendors" :key="v.id" class="tw:hover:bg-gray-50">
                <td class="tw:px-5 tw:py-4 tw:text-theme-sm tw:text-gray-500">{{ index + 1 + ((pagination.from || 1) - 1) }}</td>
                <td class="tw:px-5 tw:py-4 tw:text-theme-sm tw:font-medium tw:text-gray-700">{{ v.Vendor_Code }}</td>
                <td class="tw:px-5 tw:py-4 tw:text-theme-sm tw:font-medium tw:text-gray-800">{{ v.Vendor_Name }}</td>
                <td class="tw:px-5 tw:py-4 tw:text-theme-sm tw:text-gray-600">{{ v.Email_1 || '-' }}</td>
                <td class="tw:px-5 tw:py-4"><span :class="[badgeBase, approvalBadgeClass(v.Approval_Status)]" class="tw:capitalize">{{ (v.Approval_Status || 'pending').replace('_', ' ') }}</span></td>
                <td class="tw:px-5 tw:py-4"><span :class="[badgeBase, statusBadgeClass(v.Status)]" class="tw:capitalize">{{ v.Status }}</span></td>
                <td class="tw:px-5 tw:py-4">
                  <div class="tw:flex tw:items-center tw:gap-2">
                    <div class="tw:h-2 tw:w-24 tw:overflow-hidden tw:rounded-full tw:bg-gray-100" role="progressbar" :aria-valuenow="completion(v)" aria-valuemin="0" aria-valuemax="100"><div class="tw:h-full tw:rounded-full" :class="completion(v) < 40 ? 'tw:bg-error-500' : completion(v) < 80 ? 'tw:bg-warning-500' : 'tw:bg-success-500'" :style="{ width: `${completion(v)}%` }"></div></div>
                    <span class="tw:text-theme-xs tw:font-medium tw:text-gray-600">{{ completion(v) }}%</span>
                  </div>
                </td>
                <td class="tw:px-5 tw:py-4">
                  <div v-if="v.documents && v.documents.length" class="tw:flex tw:flex-wrap tw:gap-1">
                    <button v-for="d in v.documents" :key="d.id" type="button"
                      class="tw:inline-flex tw:items-center tw:gap-1 tw:rounded-lg tw:border tw:border-gray-200 tw:bg-gray-50 tw:px-2.5 tw:py-1.5 tw:text-theme-xs tw:font-medium tw:text-gray-600 tw:shadow-theme-xs tw:transition tw:hover:bg-gray-100 tw:disabled:opacity-50"
                      :disabled="openingDoc === d.id" :title="d.Document_Name || ''" @click="openDocument(d.id)">{{ docLabel(d.Document_Type) }}</button>
                  </div>
                  <span v-else class="tw:text-theme-xs tw:text-gray-400">—</span>
                </td>
                <td class="tw:px-5 tw:py-4">
                  <div class="tw:flex tw:items-center tw:justify-end tw:gap-2">
                    <NuxtLink :to="`/admin/vendor/manage/${v.id}`"
                      class="tw:inline-flex tw:items-center tw:gap-1.5 tw:rounded-lg tw:bg-white tw:px-3 tw:py-2 tw:text-theme-xs tw:font-medium tw:text-gray-700 tw:shadow-theme-xs tw:ring-1 tw:ring-inset tw:ring-gray-300 tw:transition tw:hover:bg-gray-50 tw:focus-visible:outline-none tw:focus-visible:ring-3 tw:focus-visible:ring-gray-400/20">
                      <iconify-icon icon="solar:eye-linear"></iconify-icon> View / Manage
                    </NuxtLink>
                    <button type="button" :disabled="v.Approval_Status === 'approved'" @click="quickApprove(v)"
                      class="tw:inline-flex tw:items-center tw:gap-1.5 tw:rounded-lg tw:bg-brand-500 tw:px-3 tw:py-2 tw:text-theme-xs tw:font-medium tw:text-white tw:shadow-theme-xs tw:transition tw:hover:bg-brand-600 tw:focus-visible:outline-none tw:focus-visible:ring-3 tw:focus-visible:ring-brand-500/20 tw:disabled:cursor-not-allowed tw:disabled:opacity-50">Approve</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:border-t tw:border-gray-100 tw:px-5 tw:py-4">
          <span class="tw:text-theme-xs tw:text-gray-500">Showing {{ pagination.from || 0 }}–{{ pagination.to || 0 }} of {{ pagination.total || 0 }}</span>
          <div class="tw:flex tw:items-center tw:gap-1">
            <button aria-label="Previous page" class="tw:flex tw:h-9 tw:w-9 tw:items-center tw:justify-center tw:rounded-lg tw:border tw:border-gray-200 tw:text-gray-600 tw:shadow-theme-xs tw:transition tw:hover:bg-gray-50 tw:disabled:opacity-40" :disabled="table.page === 1" @click="table.page > 1 && (table.page -= 1)"><iconify-icon icon="ep:arrow-left"></iconify-icon></button>
            <button v-for="p in pagination.last_page" :key="p" @click="table.page = p"
              :class="['tw:flex tw:h-9 tw:min-w-9 tw:items-center tw:justify-center tw:rounded-lg tw:px-2 tw:text-theme-sm tw:font-medium tw:transition', p === table.page ? 'tw:bg-brand-500 tw:text-white tw:shadow-theme-xs' : 'tw:border tw:border-gray-200 tw:text-gray-600 tw:shadow-theme-xs tw:hover:bg-gray-50']">{{ p }}</button>
            <button aria-label="Next page" class="tw:flex tw:h-9 tw:w-9 tw:items-center tw:justify-center tw:rounded-lg tw:border tw:border-gray-200 tw:text-gray-600 tw:shadow-theme-xs tw:transition tw:hover:bg-gray-50 tw:disabled:opacity-40" :disabled="table.page === pagination.last_page" @click="table.page < pagination.last_page && (table.page += 1)"><iconify-icon icon="ep:arrow-right"></iconify-icon></button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
