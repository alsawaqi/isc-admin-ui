<script setup lang="ts">
import { definePageMeta, useNuxtApp } from '#imports'
import { computed, ref, onMounted, watch, reactive } from 'vue'
import { useFlashStore } from '~/stores/flashs'
import BulkPriceTable from '~/components/admin/product/BulkPriceTable.vue'
import { normalizeTiers } from '~/utils/bulkPricing'

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

interface ChangeDisplayEntry {
  key: string
  label: string
  current: any
  requested: any
}

interface UpdateRequestRow {
  id: number
  Status: string
  Comment?: string | null
  Requested_Changes_Json?: Record<string, any> | null
  Requested_Changes_Display?: ChangeDisplayEntry[]
  Requested_Images_Display?: { added: number; removed: number } | null
  Requested_Specifications_Display?: Array<{
    description_id: number
    value_id: number
    description: string
    value: string
  }>
  Requested_Bulk_Prices_Display?: {
    current: any[]
    requested: any[]
  } | null
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
    // Prune selection to open rows still on the current page.
    selectedIds.value = selectedIds.value.filter(id =>
      updateRequests.value.some(r => r.id === id && isOpenStatus(r))
    )
  } catch (e: any) {
    flash.error(e?.response?.data?.message || 'Failed to fetch approved product update requests.')
  } finally {
    updateLoading.value = false
  }
}

const changeLabels: Record<string, string> = {
  Product_Department_Id: 'Category',
  Product_Sub_Department_Id: 'Subcategory',
  Product_Sub_Sub_Department_Id: 'Sub-subcategory',
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
    .filter(([key]) => !['specifications', 'image_updates', 'bulk_prices'].includes(key))
    // Commission fields are admin-controlled: never surface vendor-supplied values.
    .filter(([key]) => !key.toLowerCase().startsWith('commission'))
    .map(([key, value]) => ({
      key,
      label: changeLabels[key] || key,
      value,
    }))
}

const specificationEntries = (row: UpdateRequestRow) =>
  row.Requested_Specifications_Display || []

// ---- Bulk price (quantity tier) changes ----
// Prefers the server-computed current/requested display; falls back to the raw
// bulk_prices key in Requested_Changes_Json (requested side only).
const bulkPricesDisplay = (row: UpdateRequestRow): { current: any[]; requested: any[] } | null => {
  const display = row.Requested_Bulk_Prices_Display
  if (display && (Array.isArray(display.current) || Array.isArray(display.requested))) {
    return {
      current: normalizeTiers(display.current),
      requested: normalizeTiers(display.requested),
    }
  }
  const raw = row.Requested_Changes_Json?.bulk_prices
  if (Array.isArray(raw)) {
    return { current: [], requested: normalizeTiers(raw) }
  }
  return null
}

const hasBulkPricesChange = (row: UpdateRequestRow) => bulkPricesDisplay(row) !== null

const requestedBulkCount = (row: UpdateRequestRow) =>
  bulkPricesDisplay(row)?.requested.length ?? 0

const imageChangeSummary = (row: UpdateRequestRow) => {
  const imageUpdates = row.Requested_Changes_Json?.image_updates
  if (!imageUpdates) return ''

  const removed = Array.isArray(imageUpdates.remove_image_ids) ? imageUpdates.remove_image_ids.length : 0
  const added = Array.isArray(imageUpdates.new_images) ? imageUpdates.new_images.length : 0

  if (!removed && !added) return ''

  return `${added} added, ${removed} removed`
}

const OPEN_STATUSES = ['requested', 'pending', 'under_review', 'needs_changes']

const isOpenStatus = (row?: UpdateRequestRow | null) =>
  OPEN_STATUSES.includes(String(row?.Status || '').toLowerCase())

const MONEY_KEYS = ['Product_Price', 'Product_Cost']
const LONG_TEXT_THRESHOLD = 120

const formatChangeValue = (key: string, value: any) => {
  if (value === null || value === undefined || value === '') return '-'
  if (MONEY_KEYS.includes(key)) {
    const n = Number(value)
    return Number.isNaN(n) ? String(value) : n.toFixed(3)
  }
  return String(value)
}

// Server-computed diff (current -> requested); falls back to the client-side
// requested-only rendering when the API doesn't return the display field yet.
const diffEntries = (row: UpdateRequestRow): ChangeDisplayEntry[] => {
  if (Array.isArray(row.Requested_Changes_Display)) return row.Requested_Changes_Display
  return changeEntries(row).map(c => ({ key: c.key, label: c.label, current: null, requested: c.value }))
}

const imagesSummary = (row: UpdateRequestRow) => {
  const d = row.Requested_Images_Display
  if (d) {
    const added = Number(d.added) || 0
    const removed = Number(d.removed) || 0
    if (!added && !removed) return ''
    return `${added} added, ${removed} removed`
  }
  return imageChangeSummary(row)
}

// ---- Changes popup ----
const showChanges = ref(false)
const changesRow = ref<UpdateRequestRow | null>(null)
const expandedFields = ref<Record<string, boolean>>({})

const openChangesModal = (row: UpdateRequestRow) => {
  changesRow.value = row
  expandedFields.value = {}
  showChanges.value = true
}

const closeChangesModal = () => {
  showChanges.value = false
  changesRow.value = null
}

const fieldToggleKey = (key: string, side: string) => `${key}:${side}`

const cellRaw = (entry: ChangeDisplayEntry, side: 'current' | 'requested') =>
  formatChangeValue(entry.key, side === 'current' ? entry.current : entry.requested)

const cellExpandable = (entry: ChangeDisplayEntry, side: 'current' | 'requested') =>
  cellRaw(entry, side).length > LONG_TEXT_THRESHOLD

const cellText = (entry: ChangeDisplayEntry, side: 'current' | 'requested') => {
  const text = cellRaw(entry, side)
  if (text.length > LONG_TEXT_THRESHOLD && !expandedFields.value[fieldToggleKey(entry.key, side)]) {
    return `${text.slice(0, LONG_TEXT_THRESHOLD)}…`
  }
  return text
}

const toggleCellExpand = (entry: ChangeDisplayEntry, side: 'current' | 'requested') => {
  const key = fieldToggleKey(entry.key, side)
  expandedFields.value[key] = !expandedFields.value[key]
}

// ---- Bulk approve ----
const selectedIds = ref<number[]>([])
const bulkApproveBusy = ref(false)

const openRows = computed(() => updateRequests.value.filter(r => isOpenStatus(r)))

const isSelected = (id: number) => selectedIds.value.includes(id)

const toggleSelect = (id: number) => {
  selectedIds.value = isSelected(id)
    ? selectedIds.value.filter(x => x !== id)
    : [...selectedIds.value, id]
}

const allOpenSelected = computed(
  () => openRows.value.length > 0 && openRows.value.every(r => selectedIds.value.includes(r.id))
)

const toggleSelectAll = () => {
  selectedIds.value = allOpenSelected.value ? [] : openRows.value.map(r => r.id)
}

const bulkApprove = async () => {
  const ids = [...selectedIds.value]
  if (!ids.length) return

  const ok = await flash.confirm({
    title: 'Approve selected updates?',
    message: `Apply the requested vendor changes for ${ids.length} update request${ids.length === 1 ? '' : 's'}?`,
    confirmText: `Approve ${ids.length} selected`,
    cancelText: 'Cancel',
  })
  if (!ok) return

  bulkApproveBusy.value = true
  try {
    const { data } = await $axios.post('/api/admin/product-update-requests/bulk/approve', { ids })
    const approved = Array.isArray(data?.approved_ids) ? data.approved_ids.length : 0
    const failed: Array<{ id: number; error: string }> = Array.isArray(data?.failed) ? data.failed : []

    if (approved) {
      flash.success(`Approved ${approved} update request${approved === 1 ? '' : 's'}.`)
    }
    if (failed.length) {
      flash.warning(`${failed.length} failed — ${failed.map(f => `#${f.id}: ${f.error}`).join(' | ')}`)
    }
    if (!approved && !failed.length) {
      flash.success(data?.message || 'Bulk approve completed.')
    }

    selectedIds.value = []
    await fetchUpdateRequests()
  } catch (e: any) {
    flash.error(e?.response?.data?.message || 'Failed to bulk approve update requests.')
  } finally {
    bulkApproveBusy.value = false
  }
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

const approveUpdateRequest = async (row: UpdateRequestRow): Promise<boolean> => {
  const ok = await flash.confirm({
    title: 'Approve product update?',
    message: `Apply the selected vendor changes to "${row.master_product?.Product_Name || 'this product'}"?`,
    confirmText: 'Approve update',
    cancelText: 'Cancel',
  })
  if (!ok) return false

  updateActionBusy.value = true
  try {
    await $axios.post(`/api/admin/product-update-requests/${row.id}/approve`)
    flash.success('Vendor product update approved and applied.')
    await fetchUpdateRequests()
    return true
  } catch (e: any) {
    flash.error(e?.response?.data?.message || 'Failed to approve update request.')
    return false
  } finally {
    updateActionBusy.value = false
  }
}

const approveFromChangesModal = async () => {
  if (!changesRow.value) return
  const ok = await approveUpdateRequest(changesRow.value)
  if (ok) closeChangesModal()
}

const rejectFromChangesModal = () => {
  if (!changesRow.value) return
  const row = changesRow.value
  closeChangesModal()
  openRejectUpdateRequest(row)
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
  () => {
    selectedIds.value = []
    fetchUpdateRequests()
  }
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
          <button
            type="button"
            class="btn btn-sm btn-success px-3 d-inline-flex align-items-center gap-1"
            :disabled="selectedIds.length === 0 || bulkApproveBusy"
            @click="bulkApprove"
          >
            <iconify-icon icon="solar:check-circle-linear" />
            {{ bulkApproveBusy ? 'Approving...' : `Approve selected (${selectedIds.length})` }}
          </button>
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
                <th class="text-center" style="width: 2.5rem;">
                  <input
                    type="checkbox"
                    class="form-check-input"
                    :checked="allOpenSelected"
                    :disabled="openRows.length === 0"
                    title="Select all open requests on this page"
                    @change="toggleSelectAll"
                  />
                </th>
                <th>Product</th>
                <th>Vendor</th>
                <th>Requested Changes</th>
                <th>Status</th>
                <th>Requested At</th>
                <th class="text-center" style="width: 15rem;">Review</th>
              </tr>
            </thead>

            <tbody>
              <tr v-if="updateLoading">
                <td colspan="7" class="py-4 text-center text-muted">Loading update requests...</td>
              </tr>

              <tr v-for="row in updateRequests" :key="row.id">
                <td class="text-center">
                  <input
                    v-if="isOpenStatus(row)"
                    type="checkbox"
                    class="form-check-input"
                    :checked="isSelected(row.id)"
                    @change="toggleSelect(row.id)"
                  />
                </td>
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
                      v-for="change in diffEntries(row)"
                      :key="change.key"
                      class="badge bg-primary-50 text-secondary-light border"
                    >
                      {{ change.label }}: {{ formatChangeValue(change.key, change.requested) }}
                    </span>
                    <span
                      v-for="spec in specificationEntries(row)"
                      :key="`${row.id}-${spec.description_id}-${spec.value_id}`"
                      class="badge bg-info-50 text-secondary-light border"
                    >
                      {{ spec.description }}: {{ spec.value }}
                    </span>
                    <span v-if="hasBulkPricesChange(row)" class="badge bg-success-50 text-secondary-light border">
                      Bulk prices: {{ requestedBulkCount(row) }} tier(s)
                    </span>
                    <span v-if="imageChangeSummary(row)" class="badge bg-warning-50 text-secondary-light border">
                      Images: {{ imageChangeSummary(row) }}
                    </span>
                    <span v-if="diffEntries(row).length === 0 && specificationEntries(row).length === 0 && !hasBulkPricesChange(row) && !imageChangeSummary(row)" class="text-muted small">No structured changes</span>
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
                  <div class="d-flex justify-content-center flex-wrap gap-2">
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-primary px-3 d-inline-flex align-items-center gap-1"
                      @click="openChangesModal(row)"
                    >
                      <iconify-icon icon="solar:eye-linear" />
                      View changes
                    </button>
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
                <td colspan="7" class="py-4 text-center text-muted">No approved product update requests found.</td>
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

    <transition name="fade">
      <div
        v-if="showChanges && changesRow"
        class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
        style="background: rgba(15, 23, 42, 0.55); z-index: 2040;"
      >
        <div
          class="bg-white radius-12 shadow-lg p-24 d-flex flex-column"
          style="width: min(760px, calc(100vw - 2rem)); max-height: calc(100vh - 4rem);"
        >
          <div class="d-flex align-items-start justify-content-between gap-3 mb-16">
            <div>
              <h6 class="fw-semibold mb-1">Requested Product Changes</h6>
              <div class="text-muted small">
                <span class="fw-semibold">{{ changesRow.master_product?.Product_Name || '-' }}</span>
                <span class="font-monospace ms-1">{{ changesRow.master_product?.Product_Code || `#${changesRow.id}` }}</span>
              </div>
              <div class="text-muted small">
                Vendor: {{ changesRow.vendor?.Vendor_Name || '-' }}
                <span v-if="changesRow.vendor?.Vendor_Code" class="font-monospace">({{ changesRow.vendor?.Vendor_Code }})</span>
              </div>
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="badge rounded-pill" :class="statusBadge(changesRow.Status)">{{ changesRow.Status }}</span>
              <button type="button" class="btn-close" @click="closeChangesModal" />
            </div>
          </div>

          <div class="overflow-auto" style="min-height: 0;">
            <div v-if="diffEntries(changesRow).length" class="table-responsive rounded-3 border mb-16">
              <table class="table table-sm table-striped align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th style="width: 10rem;">Field</th>
                    <th>Current</th>
                    <th>Requested</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="entry in diffEntries(changesRow)" :key="entry.key">
                    <td class="fw-semibold text-nowrap">{{ entry.label }}</td>
                    <td style="word-break: break-word; white-space: pre-wrap;">
                      {{ cellText(entry, 'current') }}
                      <a
                        v-if="cellExpandable(entry, 'current')"
                        href="javascript:void(0)"
                        class="small ms-1"
                        @click="toggleCellExpand(entry, 'current')"
                      >{{ expandedFields[fieldToggleKey(entry.key, 'current')] ? 'less' : 'more' }}</a>
                    </td>
                    <td class="fw-semibold text-primary-600" style="word-break: break-word; white-space: pre-wrap;">
                      {{ cellText(entry, 'requested') }}
                      <a
                        v-if="cellExpandable(entry, 'requested')"
                        href="javascript:void(0)"
                        class="small ms-1"
                        @click="toggleCellExpand(entry, 'requested')"
                      >{{ expandedFields[fieldToggleKey(entry.key, 'requested')] ? 'less' : 'more' }}</a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="specificationEntries(changesRow).length" class="mb-16">
              <div class="fw-semibold small text-uppercase text-muted mb-2">Specifications</div>
              <div class="d-flex flex-wrap gap-2">
                <span
                  v-for="spec in specificationEntries(changesRow)"
                  :key="`modal-${changesRow.id}-${spec.description_id}-${spec.value_id}`"
                  class="badge bg-info-50 text-secondary-light border"
                >
                  {{ spec.description }}: {{ spec.value }}
                </span>
              </div>
            </div>

            <div v-if="hasBulkPricesChange(changesRow)" class="mb-16">
              <div class="fw-semibold small text-uppercase text-muted mb-2">Bulk Prices</div>
              <div class="row g-3">
                <div class="col-12 col-md-6">
                  <div class="text-muted small mb-1">Current</div>
                  <BulkPriceTable
                    :tiers="bulkPricesDisplay(changesRow)?.current || []"
                    empty-text="No bulk prices on the live product."
                  />
                </div>
                <div class="col-12 col-md-6">
                  <div class="text-muted small mb-1">Requested</div>
                  <BulkPriceTable
                    :tiers="bulkPricesDisplay(changesRow)?.requested || []"
                    empty-text="Vendor requested removing all bulk prices."
                  />
                </div>
              </div>
            </div>

            <div v-if="imagesSummary(changesRow)" class="mb-16">
              <div class="fw-semibold small text-uppercase text-muted mb-2">Images</div>
              <span class="badge bg-warning-50 text-secondary-light border">{{ imagesSummary(changesRow) }}</span>
            </div>

            <div v-if="changesRow.Comment" class="mb-16">
              <div class="fw-semibold small text-uppercase text-muted mb-2">Vendor Comment</div>
              <div class="text-sm bg-neutral-50 border radius-8 p-12" style="white-space: pre-wrap;">{{ changesRow.Comment }}</div>
            </div>

            <div
              v-if="diffEntries(changesRow).length === 0 && specificationEntries(changesRow).length === 0 && !hasBulkPricesChange(changesRow) && !imagesSummary(changesRow)"
              class="text-muted small mb-16"
            >
              No structured changes in this request.
            </div>
          </div>

          <div class="d-flex justify-content-end gap-2 mt-16 pt-16 border-top">
            <button class="btn btn-outline-secondary" :disabled="updateActionBusy" @click="closeChangesModal">
              Close
            </button>
            <template v-if="isOpenStatus(changesRow)">
              <button class="btn btn-outline-danger" :disabled="updateActionBusy" @click="rejectFromChangesModal">
                Reject
              </button>
              <button class="btn btn-success" :disabled="updateActionBusy" @click="approveFromChangesModal">
                {{ updateActionBusy ? 'Approving...' : 'Approve' }}
              </button>
            </template>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
