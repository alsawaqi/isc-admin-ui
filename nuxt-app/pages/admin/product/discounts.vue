<script setup lang="ts">
import { definePageMeta, useNuxtApp } from '#imports'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useFlashStore } from '~/stores/flashs'

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permission: 'product activation',
})

const { $axios } = (useNuxtApp() as any)
const flash = useFlashStore()

type TargetType = 'product' | 'department' | 'sub_department' | 'sub_sub_department'
type DiscountType = 'percentage' | 'fixed'

type DiscountRow = {
  id: number
  Product_Discount_Code?: string | null
  Product_Discount_Name: string
  Target_Type: TargetType
  Product_Discount_Type: DiscountType
  Product_Discount_Value: number
  Product_Discount_Is_Active: boolean
  Start_Date?: string | null
  End_Date?: string | null
  Products_Id?: number | null
  Product_Department_Id?: number | null
  Product_Sub_Department_Id?: number | null
  Product_Sub_Sub_Department_Id?: number | null
  target_label?: string | null
  product?: any
  department?: any
  sub_department?: any
  subDepartment?: any
  sub_sub_department?: any
  subSubDepartment?: any
  effective_status?: string
  effective_status_label?: string
}

type PickerProduct = {
  id: number
  Product_Code?: string | null
  Product_Name: string
  Product_Sku?: string | null
  Product_Price: number
  Product_Stock?: number | null
  Is_Active: boolean
  has_active_discount: boolean
  active_discount: { type: DiscountType, value: number } | null
}

type BulkResult = {
  message?: string
  created_count: number
  skipped: Array<{ id: number, reason: string }>
  warnings: Array<{ product_id: number, warning: string }>
}

const targetTypes = [
  { value: 'product', label: 'Single product' },
  { value: 'department', label: 'Department' },
  { value: 'sub_department', label: 'Sub department' },
  { value: 'sub_sub_department', label: 'Sub sub department' },
] as const

const discountTypes = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed', label: 'Fixed amount' },
] as const

/* ------------------------------------------------------------------ */
/* View switching                                                      */
/* ------------------------------------------------------------------ */

const view = ref<'list' | 'builder'>('list')

/* ------------------------------------------------------------------ */
/* View A — discounts list                                             */
/* ------------------------------------------------------------------ */

const table = reactive({
  page: 1,
  perPage: 12,
  search: '',
  targetType: '',
  active: '',
})

const pagination = ref({
  total: 0,
  from: 0,
  to: 0,
  last_page: 1,
})

const discounts = ref<DiscountRow[]>([])
const loading = ref(false)
let refreshTimer: ReturnType<typeof setInterval> | null = null

const targetLabel = (row: DiscountRow) => row.target_label || row.product?.Product_Name || row.department?.Product_Department_Name || row.subDepartment?.Sub_Department_Name || row.sub_department?.Sub_Department_Name || row.subSubDepartment?.Product_Sub_Sub_Department_Name || row.sub_sub_department?.Product_Sub_Sub_Department_Name || 'Target'

const targetTypeLabel = (value: string) => targetTypes.find(item => item.value === value)?.label || value

const isLegacyRow = (row: DiscountRow) => row.Target_Type !== 'product'

const formatDate = (value?: string | null) => {
  if (!value) return 'No limit'
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
  if (!match) return value

  const [, year, month, day, hour, minute] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const discountLabel = (row: { Product_Discount_Type: DiscountType, Product_Discount_Value: number }) => {
  const value = Number(row.Product_Discount_Value || 0)
  return row.Product_Discount_Type === 'percentage'
    ? `${value.toFixed(value % 1 ? 2 : 0)}%`
    : `OMR ${value.toFixed(3)}`
}

const effectiveStatusLabel = (row: DiscountRow) => row.effective_status_label || (row.Product_Discount_Is_Active ? 'Active' : 'Unpublished')

const effectiveStatusClass = (row: DiscountRow) => {
  const status = row.effective_status || (row.Product_Discount_Is_Active ? 'active' : 'unpublished')
  return {
    active: 'published',
    scheduled: 'scheduled',
    expired: 'expired',
    unpublished: 'draft',
  }[status] || 'draft'
}

const fetchDiscounts = async () => {
  loading.value = true
  try {
    const { data } = await $axios.get('/api/product-discounts', {
      params: {
        page: table.page,
        per_page: table.perPage,
        search: table.search || undefined,
        target_type: table.targetType || undefined,
        active: table.active || undefined,
      },
    })

    discounts.value = data?.data || []
    pagination.value = {
      total: data?.total || 0,
      from: data?.from || 0,
      to: data?.to || 0,
      last_page: data?.last_page || 1,
    }
  } catch (error: any) {
    flash.error(error?.response?.data?.message || 'Unable to load discounts.')
  } finally {
    loading.value = false
  }
}

const clearFilters = () => {
  table.search = ''
  table.targetType = ''
  table.active = ''
  table.page = 1
}

const toggleDiscount = async (row: DiscountRow) => {
  try {
    await $axios.post(`/api/product-discounts/${row.id}/toggle`)
    await fetchDiscounts()
  } catch (error: any) {
    flash.error(error?.response?.data?.message || 'Unable to update discount status.')
  }
}

const deleteDiscount = async (row: DiscountRow) => {
  const ok = await flash.confirm({
    title: 'Delete discount?',
    message: `Delete "${row.Product_Discount_Name}"? Old orders keep their saved discount snapshot.`,
    confirmText: 'Delete',
  })
  if (!ok) return

  try {
    await $axios.delete(`/api/product-discounts/${row.id}`)
    flash.success('Discount deleted successfully.')
    await fetchDiscounts()
  } catch (error: any) {
    flash.error(error?.response?.data?.message || 'Unable to delete discount.')
  }
}

watch(
  () => [table.page, table.perPage, table.search, table.targetType, table.active],
  fetchDiscounts,
)

/* ------------------------------------------------------------------ */
/* Edit modal (single product-targeted discount)                       */
/* ------------------------------------------------------------------ */

const editRow = ref<DiscountRow | null>(null)
const savingEdit = ref(false)

const editForm = reactive({
  Product_Discount_Name: '',
  Product_Discount_Type: 'percentage' as DiscountType,
  Product_Discount_Value: '' as string | number,
  Start_Date: '',
  End_Date: '',
  Product_Discount_Is_Active: true,
})

const editValueHint = computed(() => editForm.Product_Discount_Type === 'percentage' ? 'Example: 10 means 10%' : 'Example: 5 means OMR 5.000')

const dateToInput = (value?: string | null) => {
  if (!value) return ''
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/)
  return match ? `${match[1]}T${match[2]}` : ''
}

const inputToPayloadDate = (value?: string | null) => {
  if (!value) return null
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)
  return match ? `${match[1]} ${match[2]}:00` : value
}

const validateDiscountFields = (type: DiscountType, rawValue: string | number, start: string, end: string) => {
  const value = Number(rawValue)
  if (!Number.isFinite(value) || value <= 0) return 'Discount value must be greater than zero.'
  if (type === 'percentage' && value > 100) return 'Percentage discount cannot exceed 100%.'
  if (start && end && end < start) return 'End date must be on or after the start date.'
  return null
}

const openEdit = (row: DiscountRow) => {
  if (isLegacyRow(row)) return
  editRow.value = row
  editForm.Product_Discount_Name = row.Product_Discount_Name || ''
  editForm.Product_Discount_Type = row.Product_Discount_Type
  editForm.Product_Discount_Value = Number(row.Product_Discount_Value || 0)
  editForm.Start_Date = dateToInput(row.Start_Date)
  editForm.End_Date = dateToInput(row.End_Date)
  editForm.Product_Discount_Is_Active = Boolean(row.Product_Discount_Is_Active)
}

const closeEdit = () => {
  editRow.value = null
}

const saveEdit = async () => {
  if (!editRow.value) return

  if (!editForm.Product_Discount_Name.trim()) {
    flash.error('Discount name is required.')
    return
  }

  const validationError = validateDiscountFields(editForm.Product_Discount_Type, editForm.Product_Discount_Value, editForm.Start_Date, editForm.End_Date)
  if (validationError) {
    flash.error(validationError)
    return
  }

  savingEdit.value = true
  try {
    await $axios.put(`/api/product-discounts/${editRow.value.id}`, {
      Product_Discount_Name: editForm.Product_Discount_Name,
      Target_Type: 'product',
      Products_Id: editRow.value.Products_Id,
      Product_Discount_Type: editForm.Product_Discount_Type,
      Product_Discount_Value: Number(editForm.Product_Discount_Value || 0),
      Start_Date: inputToPayloadDate(editForm.Start_Date),
      End_Date: inputToPayloadDate(editForm.End_Date),
      Product_Discount_Is_Active: editForm.Product_Discount_Is_Active,
    })
    flash.success('Discount updated successfully.')
    closeEdit()
    await fetchDiscounts()
  } catch (error: any) {
    const errors = error?.response?.data?.errors
    const first = errors ? Object.values(errors).flat()[0] : null
    flash.error(String(first || error?.response?.data?.message || 'Unable to save discount.'))
  } finally {
    savingEdit.value = false
  }
}

/* ------------------------------------------------------------------ */
/* View B — builder: department filters                                */
/* ------------------------------------------------------------------ */

const departmentOptions = ref<any[]>([])
const subDepartmentOptions = ref<any[]>([])
const subSubDepartmentOptions = ref<any[]>([])

const fetchDepartmentOptions = async () => {
  const { data } = await $axios.get('/api/productdepartment/all')
  departmentOptions.value = Array.isArray(data) ? data : []
}

const fetchSubDepartmentOptions = async (departmentId: string | number) => {
  if (!departmentId) {
    subDepartmentOptions.value = []
    return
  }

  const { data } = await $axios.get(`/api/sub-departments/${departmentId}`)
  subDepartmentOptions.value = Array.isArray(data?.sub_departments) ? data.sub_departments : []
}

const fetchSubSubDepartmentOptions = async (subDepartmentId: string | number) => {
  if (!subDepartmentId) {
    subSubDepartmentOptions.value = []
    return
  }

  const { data } = await $axios.get(`/api/sub-sub-departments/${subDepartmentId}`)
  subSubDepartmentOptions.value = Array.isArray(data) ? data : []
}

/* ------------------------------------------------------------------ */
/* View B — builder: product picker                                    */
/* ------------------------------------------------------------------ */

const picker = reactive({
  department_id: '' as string | number,
  sub_department_id: '' as string | number,
  sub_sub_department_id: '' as string | number,
  search: '',
  page: 1,
  perPage: 15,
})

const pickerRows = ref<PickerProduct[]>([])
const pickerLoading = ref(false)
const pickerPagination = ref({
  total: 0,
  from: 0,
  to: 0,
  last_page: 1,
})

const selectedIds = reactive(new Set<number>())
const productNameById = reactive(new Map<number, string>())
let pickerSearchTimer: ReturnType<typeof setTimeout> | null = null

const fetchPickerProducts = async () => {
  pickerLoading.value = true
  try {
    const { data } = await $axios.get('/api/product-discounts/products', {
      params: {
        department_id: picker.department_id || undefined,
        sub_department_id: picker.sub_department_id || undefined,
        sub_sub_department_id: picker.sub_sub_department_id || undefined,
        search: picker.search || undefined,
        per_page: picker.perPage,
        page: picker.page,
      },
    })

    pickerRows.value = data?.data || []
    pickerRows.value.forEach((row) => productNameById.set(row.id, row.Product_Name))
    pickerPagination.value = {
      total: data?.total || 0,
      from: data?.from || 0,
      to: data?.to || 0,
      last_page: data?.last_page || 1,
    }
  } catch (error: any) {
    flash.error(error?.response?.data?.message || 'Unable to load products.')
  } finally {
    pickerLoading.value = false
  }
}

const resetPickerPageAndFetch = () => {
  picker.page = 1
  fetchPickerProducts()
}

const onPickerDepartmentChange = async () => {
  picker.sub_department_id = ''
  picker.sub_sub_department_id = ''
  subSubDepartmentOptions.value = []
  await fetchSubDepartmentOptions(picker.department_id)
  resetPickerPageAndFetch()
}

const onPickerSubDepartmentChange = async () => {
  picker.sub_sub_department_id = ''
  await fetchSubSubDepartmentOptions(picker.sub_department_id)
  resetPickerPageAndFetch()
}

const onPickerSubSubDepartmentChange = () => {
  resetPickerPageAndFetch()
}

const resetPickerFilters = () => {
  picker.department_id = ''
  picker.sub_department_id = ''
  picker.sub_sub_department_id = ''
  picker.search = ''
  subDepartmentOptions.value = []
  subSubDepartmentOptions.value = []
  resetPickerPageAndFetch()
}

const goToPickerPage = (page: number) => {
  picker.page = page
  fetchPickerProducts()
}

watch(
  () => picker.search,
  () => {
    if (pickerSearchTimer) clearTimeout(pickerSearchTimer)
    pickerSearchTimer = setTimeout(resetPickerPageAndFetch, 350)
  },
)

/* Selection persists across pages and filter changes. */
const isSelected = (row: PickerProduct) => selectedIds.has(row.id)

const toggleRowSelection = (row: PickerProduct) => {
  if (selectedIds.has(row.id)) {
    selectedIds.delete(row.id)
  } else {
    selectedIds.add(row.id)
    productNameById.set(row.id, row.Product_Name)
  }
}

const allPageSelected = computed(() => pickerRows.value.length > 0 && pickerRows.value.every((row) => selectedIds.has(row.id)))

const toggleSelectAllPage = () => {
  if (allPageSelected.value) {
    pickerRows.value.forEach((row) => selectedIds.delete(row.id))
  } else {
    pickerRows.value.forEach((row) => {
      selectedIds.add(row.id)
      productNameById.set(row.id, row.Product_Name)
    })
  }
}

const clearSelection = () => {
  selectedIds.clear()
}

const productName = (id: number) => productNameById.get(id) || `Product #${id}`

const formatPrice = (value: number | string | null | undefined) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toFixed(3) : '-'
}

const activeDiscountBadge = (row: PickerProduct) => {
  if (!row.active_discount) return 'Discounted'
  const value = Number(row.active_discount.value || 0)
  return row.active_discount.type === 'percentage'
    ? `${value.toFixed(value % 1 ? 2 : 0)}% off`
    : `OMR ${value.toFixed(3)} off`
}

/* ------------------------------------------------------------------ */
/* View B — builder: bulk discount form                                */
/* ------------------------------------------------------------------ */

const bulkForm = reactive({
  Product_Discount_Name: '',
  Product_Discount_Type: 'percentage' as DiscountType,
  Product_Discount_Value: '' as string | number,
  Start_Date: '',
  End_Date: '',
  Product_Discount_Is_Active: true,
})

const applying = ref(false)
const bulkResult = ref<BulkResult | null>(null)

const bulkValueHint = computed(() => bulkForm.Product_Discount_Type === 'percentage' ? 'Example: 10 means 10%' : 'Example: 5 means OMR 5.000')

const resetBulkForm = () => {
  bulkForm.Product_Discount_Name = ''
  bulkForm.Product_Discount_Type = 'percentage'
  bulkForm.Product_Discount_Value = ''
  bulkForm.Start_Date = ''
  bulkForm.End_Date = ''
  bulkForm.Product_Discount_Is_Active = true
}

const bulkValidationError = () => {
  if (selectedIds.size === 0) return 'Select at least one product first.'
  if (selectedIds.size > 500) return 'You can apply a discount to at most 500 products at once.'
  if (!bulkForm.Product_Discount_Name.trim()) return 'Discount name is required.'
  return validateDiscountFields(bulkForm.Product_Discount_Type, bulkForm.Product_Discount_Value, bulkForm.Start_Date, bulkForm.End_Date)
}

const applyBulkDiscount = async () => {
  const validationError = bulkValidationError()
  if (validationError) {
    flash.error(validationError)
    return
  }

  const count = selectedIds.size
  const ok = await flash.confirm({
    title: 'Apply discount?',
    message: `Apply "${bulkForm.Product_Discount_Name}" to ${count} selected product${count === 1 ? '' : 's'}?`,
    confirmText: 'Apply',
  })
  if (!ok) return

  applying.value = true
  try {
    const { data } = await $axios.post('/api/product-discounts/bulk', {
      product_ids: Array.from(selectedIds),
      Product_Discount_Name: bulkForm.Product_Discount_Name,
      Product_Discount_Type: bulkForm.Product_Discount_Type,
      Product_Discount_Value: Number(bulkForm.Product_Discount_Value || 0),
      Start_Date: inputToPayloadDate(bulkForm.Start_Date),
      End_Date: inputToPayloadDate(bulkForm.End_Date),
      Product_Discount_Is_Active: bulkForm.Product_Discount_Is_Active,
    })

    bulkResult.value = {
      message: data?.message,
      created_count: data?.created_count || 0,
      skipped: Array.isArray(data?.skipped) ? data.skipped : [],
      warnings: Array.isArray(data?.warnings) ? data.warnings : [],
    }

    flash.success(data?.message || `Created ${bulkResult.value.created_count} discount${bulkResult.value.created_count === 1 ? '' : 's'}.`)
    clearSelection()
    resetBulkForm()
    view.value = 'list'
    await fetchDiscounts()
  } catch (error: any) {
    const errors = error?.response?.data?.errors
    const first = errors ? Object.values(errors).flat()[0] : null
    flash.error(String(first || error?.response?.data?.message || 'Unable to apply the discount.'))
  } finally {
    applying.value = false
  }
}

const dismissBulkResult = () => {
  bulkResult.value = null
}

/* ------------------------------------------------------------------ */
/* View switching helpers                                              */
/* ------------------------------------------------------------------ */

const openBuilder = async () => {
  view.value = 'builder'
  if (departmentOptions.value.length === 0) {
    fetchDepartmentOptions().catch(() => {})
  }
  await fetchPickerProducts()
}

const backToList = () => {
  view.value = 'list'
}

/* ------------------------------------------------------------------ */
/* Lifecycle                                                           */
/* ------------------------------------------------------------------ */

onMounted(async () => {
  await Promise.all([
    fetchDepartmentOptions(),
    fetchDiscounts(),
  ])

  refreshTimer = setInterval(() => {
    if (view.value === 'list' && !editRow.value) fetchDiscounts()
  }, 30000)
})

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (pickerSearchTimer) clearTimeout(pickerSearchTimer)
})
</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <div>
        <h6 class="fw-semibold mb-1" style="color: #7c3aed">Product Discounts</h6>
        <p class="text-muted small mb-0">Find products by department, select them, and apply one discount to all of them at once.</p>
      </div>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">Product Discounts</li>
      </ul>
    </div>

    <!-- ============================================================ -->
    <!-- VIEW A — discounts list                                      -->
    <!-- ============================================================ -->
    <template v-if="view === 'list'">
      <div v-if="bulkResult" class="card border-0 shadow-sm mb-3 bulk-result-card">
        <div class="card-body">
          <div class="d-flex align-items-start justify-content-between gap-3">
            <div>
              <h6 class="mb-1">Bulk discount result</h6>
              <p class="mb-2 small text-muted">{{ bulkResult.message || `Created ${bulkResult.created_count} discounts.` }}</p>
              <div class="d-flex flex-wrap gap-2 mb-2">
                <span class="status-pill published">Created: {{ bulkResult.created_count }}</span>
                <span v-if="bulkResult.skipped.length" class="status-pill expired">Skipped: {{ bulkResult.skipped.length }}</span>
                <span v-if="bulkResult.warnings.length" class="status-pill draft">Warnings: {{ bulkResult.warnings.length }}</span>
              </div>
              <ul v-if="bulkResult.skipped.length" class="small mb-2 result-list">
                <li v-for="item in bulkResult.skipped" :key="`skip-${item.id}`">
                  <span class="fw-semibold">{{ productName(item.id) }}</span> — skipped: {{ item.reason }}
                </li>
              </ul>
              <ul v-if="bulkResult.warnings.length" class="small mb-0 result-list warning">
                <li v-for="(item, index) in bulkResult.warnings" :key="`warn-${item.product_id}-${index}`">
                  <span class="fw-semibold">{{ productName(item.product_id) }}</span> — {{ item.warning }}
                </li>
              </ul>
            </div>
            <button type="button" class="btn btn-sm btn-light" @click="dismissBulkResult">Dismiss</button>
          </div>
        </div>
      </div>

      <section class="card border-0 shadow-sm">
        <div class="card-header bg-white border-0">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
            <div>
              <h6 class="mb-1">Discount List</h6>
              <p class="text-muted small mb-0">The best active discount is selected automatically for each product.</p>
            </div>
            <div class="d-flex align-items-center gap-2">
              <button type="button" class="btn btn-sm btn-outline-secondary" @click="clearFilters">
                Clear filters
              </button>
              <button type="button" class="btn btn-primary" @click="openBuilder">
                <iconify-icon icon="lucide:plus" class="me-1"></iconify-icon>
                New discount
              </button>
            </div>
          </div>

          <div class="list-filter-grid">
            <input v-model.trim="table.search" type="text" class="form-control form-control-sm" placeholder="Search discount name or code">
            <select v-model="table.targetType" class="form-select form-select-sm">
              <option value="">All targets</option>
              <option v-for="target in targetTypes" :key="target.value" :value="target.value">{{ target.label }}</option>
            </select>
            <select v-model="table.active" class="form-select form-select-sm">
              <option value="">All statuses</option>
              <option value="1">Published</option>
              <option value="0">Unpublished</option>
            </select>
          </div>
        </div>

        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table mb-0 align-middle">
              <thead class="bg-light">
                <tr>
                  <th class="p-3">Discount</th>
                  <th class="p-3">Target</th>
                  <th class="p-3">Value</th>
                  <th class="p-3">Dates</th>
                  <th class="p-3">Status</th>
                  <th class="p-3 text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="6" class="p-4 text-center text-muted">Loading discounts...</td>
                </tr>
                <tr v-else-if="discounts.length === 0">
                  <td colspan="6" class="p-4 text-center text-muted">No discounts found.</td>
                </tr>
                <template v-else>
                  <tr v-for="row in discounts" :key="row.id">
                    <td class="p-3">
                      <div class="fw-semibold">{{ row.Product_Discount_Name }}</div>
                      <div class="small text-muted">{{ row.Product_Discount_Code || `#${row.id}` }}</div>
                    </td>
                    <td class="p-3">
                      <div class="d-flex align-items-center gap-2 flex-wrap">
                        <span class="target-pill">{{ targetTypeLabel(row.Target_Type) }}</span>
                        <span v-if="isLegacyRow(row)" class="legacy-pill" title="Department discounts can no longer be created. This one keeps working until you delete it.">legacy</span>
                      </div>
                      <div class="small text-muted mt-1">{{ targetLabel(row) }}</div>
                    </td>
                    <td class="p-3 fw-semibold">{{ discountLabel(row) }}</td>
                    <td class="p-3 small">
                      <div><span class="text-muted">Start:</span> {{ formatDate(row.Start_Date) }}</div>
                      <div><span class="text-muted">End:</span> {{ formatDate(row.End_Date) }}</div>
                    </td>
                    <td class="p-3">
                      <span :class="['status-pill', effectiveStatusClass(row)]">
                        {{ effectiveStatusLabel(row) }}
                      </span>
                      <div v-if="row.Product_Discount_Is_Active && row.effective_status === 'expired'" class="small text-muted mt-1">
                        Stopped automatically by end date.
                      </div>
                    </td>
                    <td class="p-3 text-end">
                      <div class="d-inline-flex align-items-center gap-2">
                        <button type="button" class="btn btn-sm btn-outline-secondary" @click="toggleDiscount(row)">
                          {{ row.Product_Discount_Is_Active ? 'Unpublish' : 'Publish' }}
                        </button>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-primary"
                          :disabled="isLegacyRow(row)"
                          :title="isLegacyRow(row) ? 'Legacy department discounts cannot be edited. Delete it and create product discounts instead.' : 'Edit discount'"
                          @click="openEdit(row)"
                        >
                          Edit
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger" @click="deleteDiscount(row)">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 border-top">
            <span class="text-muted small">
              Showing {{ pagination.from || 0 }} to {{ pagination.to || 0 }} of {{ pagination.total || 0 }} entries
            </span>
            <div class="d-flex align-items-center gap-2">
              <button class="btn btn-sm btn-light" :disabled="table.page <= 1" @click="table.page -= 1">Prev</button>
              <span class="small text-muted">Page {{ table.page }} / {{ pagination.last_page }}</span>
              <button class="btn btn-sm btn-light" :disabled="table.page >= pagination.last_page" @click="table.page += 1">Next</button>
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- ============================================================ -->
    <!-- VIEW B — new discount builder                                -->
    <!-- ============================================================ -->
    <template v-else>
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body py-3">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div class="d-flex align-items-center gap-3">
              <button type="button" class="btn btn-sm btn-light" @click="backToList">
                <iconify-icon icon="lucide:arrow-left" class="me-1"></iconify-icon>
                Back to list
              </button>
              <div>
                <h6 class="mb-0">New Discount</h6>
                <p class="text-muted small mb-0">Filter products by department, select them across pages, then apply one discount to all of them.</p>
              </div>
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="selected-chip">
                Selected: {{ selectedIds.size }}
              </span>
              <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="selectedIds.size === 0" @click="clearSelection">
                Clear selection
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body py-3">
          <div class="picker-filter-grid">
            <div>
              <label class="form-label small text-muted mb-1">Department</label>
              <select v-model="picker.department_id" class="form-select form-select-sm" @change="onPickerDepartmentChange">
                <option value="">All departments</option>
                <option v-for="department in departmentOptions" :key="department.id" :value="department.id">
                  {{ department.Product_Department_Name }}
                </option>
              </select>
            </div>
            <div>
              <label class="form-label small text-muted mb-1">Sub department</label>
              <select v-model="picker.sub_department_id" class="form-select form-select-sm" :disabled="!picker.department_id" @change="onPickerSubDepartmentChange">
                <option value="">All sub departments</option>
                <option v-for="subDepartment in subDepartmentOptions" :key="subDepartment.id" :value="subDepartment.id">
                  {{ subDepartment.Sub_Department_Name }}
                </option>
              </select>
            </div>
            <div>
              <label class="form-label small text-muted mb-1">Sub sub department</label>
              <select v-model="picker.sub_sub_department_id" class="form-select form-select-sm" :disabled="!picker.sub_department_id" @change="onPickerSubSubDepartmentChange">
                <option value="">All sub sub departments</option>
                <option v-for="subSubDepartment in subSubDepartmentOptions" :key="subSubDepartment.id" :value="subSubDepartment.id">
                  {{ subSubDepartment.Product_Sub_Sub_Department_Name }}
                </option>
              </select>
            </div>
            <div>
              <label class="form-label small text-muted mb-1">Search</label>
              <input v-model.trim="picker.search" type="text" class="form-control form-control-sm" placeholder="Product name, SKU, or code">
            </div>
            <div class="d-flex align-items-end">
              <button type="button" class="btn btn-sm btn-outline-secondary w-100" @click="resetPickerFilters">
                Reset filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="builder-layout">
        <section class="card border-0 shadow-sm">
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table mb-0 align-middle">
                <thead class="bg-light">
                  <tr>
                    <th class="p-3" style="width: 42px">
                      <input
                        type="checkbox"
                        class="form-check-input"
                        :checked="allPageSelected"
                        :disabled="pickerRows.length === 0"
                        title="Select all products on this page"
                        @change="toggleSelectAllPage"
                      >
                    </th>
                    <th class="p-3">Product</th>
                    <th class="p-3">SKU</th>
                    <th class="p-3 text-end">Price (OMR)</th>
                    <th class="p-3 text-end">Stock</th>
                    <th class="p-3">Status</th>
                    <th class="p-3">Current discount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="pickerLoading">
                    <td colspan="7" class="p-4 text-center text-muted">Loading products...</td>
                  </tr>
                  <tr v-else-if="pickerRows.length === 0">
                    <td colspan="7" class="p-4 text-center text-muted">No products match these filters.</td>
                  </tr>
                  <template v-else>
                    <tr
                      v-for="row in pickerRows"
                      :key="row.id"
                      class="picker-row"
                      :class="{ selected: isSelected(row) }"
                      @click="toggleRowSelection(row)"
                    >
                      <td class="p-3" @click.stop>
                        <input
                          type="checkbox"
                          class="form-check-input"
                          :checked="isSelected(row)"
                          @change="toggleRowSelection(row)"
                        >
                      </td>
                      <td class="p-3">
                        <div class="fw-semibold">{{ row.Product_Name }}</div>
                        <div class="small text-muted">{{ row.Product_Code || `#${row.id}` }}</div>
                      </td>
                      <td class="p-3 small">{{ row.Product_Sku || '-' }}</td>
                      <td class="p-3 text-end fw-semibold">{{ formatPrice(row.Product_Price) }}</td>
                      <td class="p-3 text-end">{{ row.Product_Stock ?? '-' }}</td>
                      <td class="p-3">
                        <span :class="['status-pill', row.Is_Active ? 'published' : 'draft']">
                          {{ row.Is_Active ? 'Active' : 'Inactive' }}
                        </span>
                      </td>
                      <td class="p-3">
                        <span
                          v-if="row.has_active_discount"
                          class="status-pill draft"
                          title="This product already has a live discount. Applying another one may double-discount it."
                        >
                          {{ activeDiscountBadge(row) }}
                        </span>
                        <span v-else class="text-muted small">-</span>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>

            <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 border-top">
              <span class="text-muted small">
                Showing {{ pickerPagination.from || 0 }} to {{ pickerPagination.to || 0 }} of {{ pickerPagination.total || 0 }} products
              </span>
              <div class="d-flex align-items-center gap-2">
                <button class="btn btn-sm btn-light" :disabled="picker.page <= 1 || pickerLoading" @click="goToPickerPage(picker.page - 1)">Prev</button>
                <span class="small text-muted">Page {{ picker.page }} / {{ pickerPagination.last_page }}</span>
                <button class="btn btn-sm btn-light" :disabled="picker.page >= pickerPagination.last_page || pickerLoading" @click="goToPickerPage(picker.page + 1)">Next</button>
              </div>
            </div>
          </div>
        </section>

        <section class="card border-0 shadow-sm discount-panel">
          <div class="card-header bg-white border-0 pb-0">
            <h6 class="mb-1">Discount details</h6>
            <p class="text-muted small mb-0">This discount will be applied to every selected product.</p>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <label class="form-label small text-muted">Discount name</label>
              <input v-model.trim="bulkForm.Product_Discount_Name" type="text" class="form-control" placeholder="Example: Ramadan tools offer">
            </div>

            <div class="mb-3">
              <label class="form-label small text-muted">Discount type</label>
              <select v-model="bulkForm.Product_Discount_Type" class="form-select">
                <option v-for="type in discountTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </option>
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label small text-muted">Discount value</label>
              <input v-model="bulkForm.Product_Discount_Value" type="number" min="0" step="0.001" class="form-control" :placeholder="bulkValueHint">
              <div class="form-text">{{ bulkValueHint }}</div>
            </div>

            <div class="mb-3">
              <label class="form-label small text-muted">Start date</label>
              <input v-model="bulkForm.Start_Date" type="datetime-local" class="form-control">
            </div>

            <div class="mb-3">
              <label class="form-label small text-muted">End date</label>
              <input v-model="bulkForm.End_Date" type="datetime-local" class="form-control">
            </div>

            <div class="form-text mb-3">
              Dates are saved as local business time. A published discount only applies during this start/end window.
            </div>

            <label class="form-check d-flex align-items-center gap-2 mb-4">
              <input v-model="bulkForm.Product_Discount_Is_Active" class="form-check-input" type="checkbox">
              <span class="form-check-label">Publish this discount</span>
            </label>

            <button
              type="button"
              class="btn btn-primary w-100"
              :disabled="applying || selectedIds.size === 0"
              @click="applyBulkDiscount"
            >
              <span v-if="applying" class="spinner-border spinner-border-sm me-2"></span>
              Apply to {{ selectedIds.size }} selected product{{ selectedIds.size === 1 ? '' : 's' }}
            </button>
            <div v-if="selectedIds.size === 0" class="form-text text-center mt-2">
              Select products in the table to enable this button.
            </div>
          </div>
        </section>
      </div>
    </template>

    <!-- ============================================================ -->
    <!-- Edit modal (product-targeted only)                           -->
    <!-- ============================================================ -->
    <div v-if="editRow" class="edit-modal-backdrop" @click.self="closeEdit">
      <div class="edit-modal card border-0 shadow">
        <div class="card-header bg-white border-0 pb-0">
          <div class="d-flex align-items-start justify-content-between gap-3">
            <div>
              <h6 class="mb-1">Edit Discount</h6>
              <p class="text-muted small mb-0">
                Product: <span class="fw-semibold">{{ targetLabel(editRow) }}</span>
              </p>
            </div>
            <button type="button" class="btn btn-sm btn-light" @click="closeEdit">Close</button>
          </div>
        </div>
        <div class="card-body">
          <div class="mb-3">
            <label class="form-label small text-muted">Discount name</label>
            <input v-model.trim="editForm.Product_Discount_Name" type="text" class="form-control">
          </div>

          <div class="discount-value-grid mb-3">
            <div>
              <label class="form-label small text-muted">Discount type</label>
              <select v-model="editForm.Product_Discount_Type" class="form-select">
                <option v-for="type in discountTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="form-label small text-muted">Discount value</label>
              <input v-model="editForm.Product_Discount_Value" type="number" min="0" step="0.001" class="form-control" :placeholder="editValueHint">
              <div class="form-text">{{ editValueHint }}</div>
            </div>
          </div>

          <div class="discount-value-grid mb-3">
            <div>
              <label class="form-label small text-muted">Start date</label>
              <input v-model="editForm.Start_Date" type="datetime-local" class="form-control">
            </div>
            <div>
              <label class="form-label small text-muted">End date</label>
              <input v-model="editForm.End_Date" type="datetime-local" class="form-control">
            </div>
          </div>

          <label class="form-check d-flex align-items-center gap-2 mb-4">
            <input v-model="editForm.Product_Discount_Is_Active" class="form-check-input" type="checkbox">
            <span class="form-check-label">Publish this discount</span>
          </label>

          <button type="button" class="btn btn-primary w-100" :disabled="savingEdit" @click="saveEdit">
            <span v-if="savingEdit" class="spinner-border spinner-border-sm me-2"></span>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.builder-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 380px);
  gap: 1rem;
  align-items: start;
}

.picker-filter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, 1fr)) minmax(200px, 1.2fr) minmax(120px, 150px);
  gap: 0.75rem;
  align-items: end;
}

.discount-value-grid,
.list-filter-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.list-filter-grid {
  grid-template-columns: minmax(220px, 1fr) minmax(170px, 220px) minmax(150px, 190px);
}

.target-pill,
.status-pill,
.legacy-pill,
.selected-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.28rem 0.55rem;
  font-size: 0.76rem;
  font-weight: 600;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #334155;
}

.legacy-pill {
  border-color: #e9d5ff;
  background: #faf5ff;
  color: #7c3aed;
  text-transform: uppercase;
  font-size: 0.66rem;
  letter-spacing: 0.04em;
}

.selected-chip {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 0.85rem;
  padding: 0.35rem 0.75rem;
}

.status-pill.published {
  border-color: #bbf7d0;
  background: #ecfdf5;
  color: #047857;
}

.status-pill.scheduled {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
}

.status-pill.expired {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.status-pill.draft {
  border-color: #fed7aa;
  background: #fff7ed;
  color: #c2410c;
}

.picker-row {
  cursor: pointer;
}

.picker-row.selected {
  background: #eff6ff;
}

.bulk-result-card {
  border-left: 4px solid #2563eb !important;
}

.result-list {
  padding-left: 1.1rem;
  color: #b91c1c;
}

.result-list.warning {
  color: #c2410c;
}

.edit-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.45);
}

.edit-modal {
  width: 100%;
  max-width: 560px;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
}

@media (max-width: 1199px) {
  .builder-layout {
    grid-template-columns: 1fr;
  }

  .picker-filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .picker-filter-grid,
  .discount-value-grid,
  .list-filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>
