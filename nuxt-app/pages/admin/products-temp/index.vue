<script setup lang="ts">
import { definePageMeta, useNuxtApp } from '#imports'
import { computed, ref, onMounted, watch, reactive } from 'vue'
import { useFlashStore } from '~/stores/flashs'

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permission: 'vendor requests'
})

const { $axios } = (useNuxtApp() as any)
const flash = useFlashStore()

interface VendorRow {
  Vendor_Id: number
  Vendor_Name: string
  Trade_Name?: string
  Vendor_Code?: string
  requests_count: number
  pending_count: number
  last_submitted_at?: string
}

interface UpdateRequestRow {
  id: number
  Status: string
  Comment?: string | null
  Requested_Changes_Json?: Record<string, any> | null
  Requested_Specifications_Display?: Array<{
    description_id: number
    value_id: number
    description: string
    value: string
  }>
  Action_At?: string | null
  vendor?: {
    Vendor_Code?: string | null
    Vendor_Name?: string | null
    Trade_Name?: string | null
  } | null
  master_product?: {
    Product_Code?: string | null
    Product_Name?: string | null
    Product_Price?: number | null
    Product_Stock?: number | null
  } | null
}

const table = reactive({
  page: 1,
  perPage: 10,
  search: '',
  sortBy: 'last_submitted_at',
  sortDir: 'desc',
  status: 'all' as 'all' | 'pending',
})

const pagination = ref({
  total: 0,
  from: 0,
  to: 0,
  last_page: 1,
})

const vendors = ref<VendorRow[]>([])
const loading = ref(false)
const updateRequests = ref<UpdateRequestRow[]>([])
const updateLoading = ref(false)
const updateActionBusy = ref(false)
const showUpdateReject = ref(false)
const selectedUpdateRequest = ref<UpdateRequestRow | null>(null)
const updateRejectReason = ref('')

const updateTable = reactive({
  page: 1,
  perPage: 10,
  search: '',
  status: 'open' as 'open' | 'all' | 'requested' | 'approved' | 'rejected',
})

const updatePagination = ref({
  total: 0,
  from: 0,
  to: 0,
  last_page: 1,
})

const fetchVendors = async () => {
  try {
    loading.value = true
    const { data } = await $axios.get('/api/admin/products-temp/vendors', {
      params: {
        page: table.page,
        per_page: table.perPage,
        search: table.search,
        sortBy: table.sortBy,
        sortDir: table.sortDir,
        status: table.status,
      },
    })

    vendors.value = data.data
    pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }
  } catch (e) {
    console.error('Failed to fetch vendor requests:', e)
  } finally {
    loading.value = false
  }
}

const fetchUpdateRequests = async () => {
  try {
    updateLoading.value = true
    const { data } = await $axios.get('/api/admin/product-update-requests', {
      params: {
        page: updateTable.page,
        per_page: updateTable.perPage,
        search: updateTable.search,
        status: updateTable.status,
      },
    })

    updateRequests.value = data.data
    updatePagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }
  } catch (e: any) {
    flash.error(e?.response?.data?.message || 'Failed to fetch approved product update requests.')
  } finally {
    updateLoading.value = false
  }
}

const changeLabels: Record<string, string> = {
  Product_Department_Id: 'Department',
  Product_Sub_Department_Id: 'Sub Department',
  Product_Sub_Sub_Department_Id: 'Sub-Sub Department',
  Product_Type_Id: 'Type',
  Product_Brand_Id: 'Brand',
  Product_Manufacture_Id: 'Manufacture',
  Product_Name: 'Name',
  Product_Name_Ar: 'Arabic Name',
  Product_Description: 'Description',
  Product_Price: 'Price',
  Product_Cost: 'Cost',
  Product_Stock: 'Stock',
  Weight_Kg: 'Weight',
  Length_Cm: 'Length (m)',
  Width_Cm: 'Width (m)',
  Height_Cm: 'Height (m)',
  Volume_Cbm: 'Volume (CBM)',
  volume_type: 'Dimension Unit',
}

const changeEntries = (row: UpdateRequestRow) => {
  const changes = row.Requested_Changes_Json || {}
  return Object.entries(changes)
    .filter(([key]) => !['specifications', 'image_updates'].includes(key))
    .map(([key, value]) => ({
      key,
      label: changeLabels[key] || key,
      value,
    }))
}

const specificationEntries = (row: UpdateRequestRow) =>
  row.Requested_Specifications_Display || []

const imageChangeSummary = (row: UpdateRequestRow) => {
  const imageUpdates = row.Requested_Changes_Json?.image_updates
  if (!imageUpdates) return ''

  const removed = Array.isArray(imageUpdates.remove_image_ids) ? imageUpdates.remove_image_ids.length : 0
  const added = Array.isArray(imageUpdates.new_images) ? imageUpdates.new_images.length : 0

  if (!removed && !added) return ''

  return `${added} added, ${removed} removed`
}

const statusBadge = (status?: string | null) => {
  const s = String(status || '').toLowerCase()
  if (s === 'approved') return 'bg-success'
  if (s === 'rejected') return 'bg-danger'
  if (s === 'requested' || s === 'pending') return 'bg-warning text-dark'
  return 'bg-secondary'
}

const openUpdateCount = computed(() =>
  updateRequests.value.filter(r => ['requested', 'pending', 'under_review', 'needs_changes'].includes(String(r.Status || '').toLowerCase())).length
)

const approveUpdateRequest = async (row: UpdateRequestRow) => {
  const ok = await flash.confirm({
    title: 'Approve product update?',
    message: `Apply the selected vendor changes to "${row.master_product?.Product_Name || 'this product'}"?`,
    confirmText: 'Approve update',
    cancelText: 'Cancel',
  })
  if (!ok) return

  updateActionBusy.value = true
  try {
    await $axios.post(`/api/admin/product-update-requests/${row.id}/approve`)
    flash.success('Vendor product update approved and applied.')
    await fetchUpdateRequests()
  } catch (e: any) {
    flash.error(e?.response?.data?.message || 'Failed to approve update request.')
  } finally {
    updateActionBusy.value = false
  }
}

const openRejectUpdateRequest = (row: UpdateRequestRow) => {
  selectedUpdateRequest.value = row
  updateRejectReason.value = ''
  showUpdateReject.value = true
}

const rejectUpdateRequest = async () => {
  if (!selectedUpdateRequest.value) return
  if (updateRejectReason.value.trim().length < 3) {
    flash.warning('Please write a rejection reason.')
    return
  }

  updateActionBusy.value = true
  try {
    await $axios.post(`/api/admin/product-update-requests/${selectedUpdateRequest.value.id}/reject`, {
      reason: updateRejectReason.value,
    })
    flash.success('Vendor product update rejected.')
    showUpdateReject.value = false
    selectedUpdateRequest.value = null
    updateRejectReason.value = ''
    await fetchUpdateRequests()
  } catch (e: any) {
    flash.error(e?.response?.data?.message || 'Failed to reject update request.')
  } finally {
    updateActionBusy.value = false
  }
}

watch(
  () => [table.page, table.perPage, table.search, table.sortBy, table.sortDir, table.status],
  () => fetchVendors()
)

watch(
  () => [updateTable.page, updateTable.perPage, updateTable.search, updateTable.status],
  () => fetchUpdateRequests()
)

onMounted(async () => {
  await Promise.all([fetchVendors(), fetchUpdateRequests()])
})
</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color:#ef4444">Product Requests (Vendors)</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg" />
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">Vendor Requests</li>
      </ul>
    </div>

    <div class="row g-3 mb-24">
      <div class="col-md-4">
        <div class="card border-0 shadow-sm radius-12 h-100">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="w-44-px h-44-px rounded-circle bg-primary-50 text-primary-600 d-flex align-items-center justify-content-center">
              <iconify-icon icon="solar:box-linear" class="text-xl" />
            </div>
            <div>
              <div class="text-muted small">Vendor Submission Groups</div>
              <div class="fw-semibold fs-5">{{ pagination.total || 0 }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card border-0 shadow-sm radius-12 h-100">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="w-44-px h-44-px rounded-circle bg-warning-50 text-warning-600 d-flex align-items-center justify-content-center">
              <iconify-icon icon="solar:refresh-circle-linear" class="text-xl" />
            </div>
            <div>
              <div class="text-muted small">Open Approved-Product Updates</div>
              <div class="fw-semibold fs-5">{{ openUpdateCount }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card border-0 shadow-sm radius-12 h-100">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="w-44-px h-44-px rounded-circle bg-success-50 text-success-600 d-flex align-items-center justify-content-center">
              <iconify-icon icon="solar:check-circle-linear" class="text-xl" />
            </div>
            <div>
              <div class="text-muted small">Update Request Records</div>
              <div class="fw-semibold fs-5">{{ updatePagination.total || 0 }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card h-100 p-0 radius-12 overflow-hidden">
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

            <div class="icon-field">
              <input v-model="table.search" type="text" class="form-control form-control-sm w-auto" placeholder="Search vendor..." />
              <span class="icon"><iconify-icon icon="ion:search-outline" /></span>
            </div>

            <select v-model="table.status" class="form-select form-select-sm w-auto">
              <option value="all">All</option>
              <option value="pending">Pending Only</option>
            </select>
          </div>
        </div>

        <div class="card-body">
          <div class="table-responsive table-scroll rounded-3 border shadow-sm">
            <table class="table table-hover table-striped align-middle mb-0 table-sticky">
              <thead class="table-header-gradient text-white">
                <tr class="text-uppercase small">
                  <th class="py-3 px-3">S.L</th>
                  <th class="py-3 px-3">Vendor</th>
                  <th class="py-3 px-3">Vendor Code</th>
                  <th class="py-3 px-3 text-center">Pending</th>
                  <th class="py-3 px-3 text-center">Total Requests</th>
                  <th class="py-3 px-3">Last Submitted</th>
                  <th class="py-3 px-3 text-center" style="width: 10rem;">Action</th>
                </tr>
              </thead>

              <tbody>
                <tr v-if="loading">
                  <td colspan="7" class="py-4 text-center text-muted">Loading...</td>
                </tr>

                <tr v-for="(v, index) in vendors" :key="v.Vendor_Id">
                  <td class="py-2 px-3">{{ index + 1 }}</td>

                  <td class="py-2 px-3">
                    <div class="fw-semibold">{{ v.Vendor_Name }}</div>
                    <div class="small text-muted" v-if="v.Trade_Name">{{ v.Trade_Name }}</div>
                  </td>

                  <td class="py-2 px-3 font-monospace">{{ v.Vendor_Code || '-' }}</td>

                  <td class="py-2 px-3 text-center">
                    <span class="badge rounded-pill bg-warning text-dark">
                      {{ v.pending_count }}
                    </span>
                  </td>

                  <td class="py-2 px-3 text-center">
                    <span class="badge rounded-pill bg-primary">
                      {{ v.requests_count }}
                    </span>
                  </td>

                  <td class="py-2 px-3 text-nowrap">
                    {{ v.last_submitted_at ? new Date(v.last_submitted_at).toLocaleDateString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    }) : '-' }}
                  </td>

                  <td class="py-2 px-3">
                    <div class="d-flex justify-content-center gap-2">
                      <NuxtLink
                        :to="`/admin/products-temp/vendors/${v.Vendor_Id}`"
                        class="btn btn-sm btn-success px-3"
                      >
                        View Requests
                      </NuxtLink>
                    </div>
                  </td>
                </tr>

                <tr v-if="!loading && vendors.length === 0">
                  <td colspan="7" class="py-4 text-center text-muted">No vendor requests found.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-24">
            <span>
              Showing {{ pagination.from || 0 }} to {{ pagination.to || 0 }} of {{ pagination.total || 0 }} entries
            </span>

            <ul class="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
              <li class="page-item" :class="{ disabled: table.page === 1 }">
                <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                   href="javascript:void(0)" @click="table.page > 1 && (table.page -= 1)">
                  <iconify-icon icon="ep:d-arrow-left" class="text-xl" />
                </a>
              </li>

              <li v-for="p in pagination.last_page" :key="p" class="page-item">
                <a href="javascript:void(0)" @click="table.page = p" :class="[
                  'page-link fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px',
                  p === table.page ? 'bg-primary-600 text-white' : 'bg-primary-50 text-secondary-light'
                ]">
                  {{ p }}
                </a>
              </li>

              <li class="page-item" :class="{ disabled: table.page === pagination.last_page }">
                <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                   href="javascript:void(0)" @click="table.page < pagination.last_page && (table.page += 1)">
                  <iconify-icon icon="ep:d-arrow-right" class="text-xl" />
                </a>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </div>

    <div class="card h-100 p-0 radius-12 overflow-hidden mt-24">
      <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div>
          <div class="fw-semibold">Approved Product Update Requests</div>
          <div class="text-muted small">Vendor requests to change live product fields such as price, stock, or dimensions.</div>
        </div>

        <div class="d-flex flex-wrap align-items-center gap-2">
          <input
            v-model="updateTable.search"
            type="text"
            class="form-control form-control-sm w-auto"
            placeholder="Search product, vendor..."
          />
          <select v-model="updateTable.status" class="form-select form-select-sm w-auto">
            <option value="open">Open</option>
            <option value="all">All</option>
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div class="card-body">
        <div class="table-responsive table-scroll rounded-3 border shadow-sm">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th>Product</th>
                <th>Vendor</th>
                <th>Requested Changes</th>
                <th>Status</th>
                <th>Requested At</th>
                <th class="text-center" style="width: 12rem;">Review</th>
              </tr>
            </thead>

            <tbody>
              <tr v-if="updateLoading">
                <td colspan="6" class="py-4 text-center text-muted">Loading update requests...</td>
              </tr>

              <tr v-for="row in updateRequests" :key="row.id">
                <td>
                  <div class="fw-semibold">{{ row.master_product?.Product_Name || '-' }}</div>
                  <div class="small text-muted font-monospace">{{ row.master_product?.Product_Code || `#${row.id}` }}</div>
                  <div v-if="row.Comment" class="small text-muted mt-1">{{ row.Comment }}</div>
                </td>

                <td>
                  <div class="fw-semibold">{{ row.vendor?.Vendor_Name || '-' }}</div>
                  <div class="small text-muted font-monospace">{{ row.vendor?.Vendor_Code || '-' }}</div>
                </td>

                <td>
                  <div class="d-flex flex-wrap gap-2">
                    <span
                      v-for="change in changeEntries(row)"
                      :key="change.key"
                      class="badge bg-primary-50 text-secondary-light border"
                    >
                      {{ change.label }}: {{ change.value }}
                    </span>
                    <span
                      v-for="spec in specificationEntries(row)"
                      :key="`${row.id}-${spec.description_id}-${spec.value_id}`"
                      class="badge bg-info-50 text-secondary-light border"
                    >
                      {{ spec.description }}: {{ spec.value }}
                    </span>
                    <span v-if="imageChangeSummary(row)" class="badge bg-warning-50 text-secondary-light border">
                      Images: {{ imageChangeSummary(row) }}
                    </span>
                    <span v-if="changeEntries(row).length === 0 && specificationEntries(row).length === 0 && !imageChangeSummary(row)" class="text-muted small">No structured changes</span>
                  </div>
                </td>

                <td>
                  <span class="badge rounded-pill" :class="statusBadge(row.Status)">
                    {{ row.Status }}
                  </span>
                </td>

                <td class="text-nowrap">
                  {{ row.Action_At ? new Date(row.Action_At).toLocaleString() : '-' }}
                </td>

                <td class="text-center">
                  <div class="d-flex justify-content-center gap-2">
                    <NuxtLink
                      :to="`/admin/products-temp/update-requests/${row.id}`"
                      class="btn btn-sm btn-primary px-3 d-inline-flex align-items-center gap-1"
                    >
                      <iconify-icon icon="solar:document-text-linear" />
                      Review
                    </NuxtLink>
                  </div>
                </td>
              </tr>

              <tr v-if="!updateLoading && updateRequests.length === 0">
                <td colspan="6" class="py-4 text-center text-muted">No approved product update requests found.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-24">
          <span>
            Showing {{ updatePagination.from || 0 }} to {{ updatePagination.to || 0 }} of {{ updatePagination.total || 0 }} entries
          </span>

          <ul class="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
            <li class="page-item" :class="{ disabled: updateTable.page === 1 }">
              <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                 href="javascript:void(0)" @click="updateTable.page > 1 && (updateTable.page -= 1)">
                <iconify-icon icon="ep:d-arrow-left" class="text-xl" />
              </a>
            </li>

            <li v-for="p in updatePagination.last_page" :key="p" class="page-item">
              <a href="javascript:void(0)" @click="updateTable.page = p" :class="[
                'page-link fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px',
                p === updateTable.page ? 'bg-primary-600 text-white' : 'bg-primary-50 text-secondary-light'
              ]">
                {{ p }}
              </a>
            </li>

            <li class="page-item" :class="{ disabled: updateTable.page === updatePagination.last_page }">
              <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                 href="javascript:void(0)" @click="updateTable.page < updatePagination.last_page && (updateTable.page += 1)">
                <iconify-icon icon="ep:d-arrow-right" class="text-xl" />
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div
        v-if="showUpdateReject"
        class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
        style="background: rgba(15, 23, 42, 0.55); z-index: 2050;"
      >
        <div class="bg-white radius-12 shadow-lg p-24" style="width: min(520px, calc(100vw - 2rem));">
          <div class="d-flex align-items-start justify-content-between gap-3 mb-16">
            <div>
              <h6 class="fw-semibold mb-1">Reject Update Request</h6>
              <div class="text-muted small">{{ selectedUpdateRequest?.master_product?.Product_Name || 'Product update' }}</div>
            </div>
            <button type="button" class="btn-close" @click="showUpdateReject = false" />
          </div>

          <label class="form-label text-sm fw-semibold">Reason for vendor</label>
          <textarea
            v-model="updateRejectReason"
            rows="4"
            class="form-control"
            placeholder="Explain why this product update cannot be accepted..."
          />

          <div class="d-flex justify-content-end gap-2 mt-16">
            <button class="btn btn-outline-secondary" :disabled="updateActionBusy" @click="showUpdateReject = false">
              Cancel
            </button>
            <button class="btn btn-danger" :disabled="updateActionBusy" @click="rejectUpdateRequest">
              {{ updateActionBusy ? 'Rejecting...' : 'Reject Request' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
