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

const targetTypes = [
  { value: 'product', label: 'Single product', icon: 'lucide:package' },
  { value: 'department', label: 'Department', icon: 'lucide:blocks' },
  { value: 'sub_department', label: 'Sub department', icon: 'lucide:folder-tree' },
  { value: 'sub_sub_department', label: 'Sub sub department', icon: 'lucide:git-branch' },
] as const

const discountTypes = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed', label: 'Fixed amount' },
] as const

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
const saving = ref(false)
const editingId = ref<number | null>(null)
const hydratingForm = ref(false)

const departmentOptions = ref<any[]>([])
const subDepartmentOptions = ref<any[]>([])
const subSubDepartmentOptions = ref<any[]>([])
const productOptions = ref<any[]>([])
const productSearch = ref('')
let refreshTimer: ReturnType<typeof setInterval> | null = null

const form = reactive({
  Product_Discount_Name: '',
  Target_Type: 'product' as TargetType,
  Products_Id: '' as string | number,
  Product_Department_Id: '' as string | number,
  Product_Sub_Department_Id: '' as string | number,
  Product_Sub_Sub_Department_Id: '' as string | number,
  Product_Discount_Type: 'percentage' as DiscountType,
  Product_Discount_Value: '' as string | number,
  Start_Date: '',
  End_Date: '',
  Product_Discount_Is_Active: true,
})

const isEditing = computed(() => editingId.value !== null)
const valueHint = computed(() => form.Product_Discount_Type === 'percentage' ? 'Example: 10 means 10%' : 'Example: 5 means OMR 5.000')

const targetLabel = (row: DiscountRow) => row.target_label || row.product?.Product_Name || row.department?.Product_Department_Name || row.subDepartment?.Sub_Department_Name || row.sub_department?.Sub_Department_Name || row.subSubDepartment?.Product_Sub_Sub_Department_Name || row.sub_sub_department?.Product_Sub_Sub_Department_Name || 'Target'

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

const discountLabel = (row: DiscountRow) => {
  const value = Number(row.Product_Discount_Value || 0)
  return row.Product_Discount_Type === 'percentage'
    ? `${value.toFixed(value % 1 ? 2 : 0)}%`
    : `OMR ${value.toFixed(3)}`
}

const targetTypeLabel = (value: string) => targetTypes.find(item => item.value === value)?.label || value

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

const fetchProductOptions = async () => {
  const { data } = await $axios.get('/api/productmaster', {
    params: {
      search: productSearch.value || undefined,
      per_page: 12,
      sort_by: 'Product_Name',
      sort_dir: 'asc',
    },
  })
  productOptions.value = data?.data || []
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

const resetTarget = () => {
  form.Products_Id = ''
  form.Product_Department_Id = ''
  form.Product_Sub_Department_Id = ''
  form.Product_Sub_Sub_Department_Id = ''
}

const resetForm = () => {
  editingId.value = null
  form.Product_Discount_Name = ''
  form.Target_Type = 'product'
  form.Product_Discount_Type = 'percentage'
  form.Product_Discount_Value = ''
  form.Start_Date = ''
  form.End_Date = ''
  form.Product_Discount_Is_Active = true
  productSearch.value = ''
  resetTarget()
}

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

const editDiscount = async (row: DiscountRow) => {
  hydratingForm.value = true
  editingId.value = row.id
  form.Product_Discount_Name = row.Product_Discount_Name || ''
  form.Target_Type = row.Target_Type
  form.Product_Discount_Type = row.Product_Discount_Type
  form.Product_Discount_Value = Number(row.Product_Discount_Value || 0)
  form.Start_Date = dateToInput(row.Start_Date)
  form.End_Date = dateToInput(row.End_Date)
  form.Product_Discount_Is_Active = Boolean(row.Product_Discount_Is_Active)
  form.Products_Id = row.Products_Id || ''
  form.Product_Department_Id = row.Product_Department_Id || ''
  form.Product_Sub_Department_Id = row.Product_Sub_Department_Id || ''
  form.Product_Sub_Sub_Department_Id = row.Product_Sub_Sub_Department_Id || ''

  if (row.product && !productOptions.value.find((p) => p.id === row.product.id)) {
    productOptions.value = [row.product, ...productOptions.value]
  }

  if (form.Product_Department_Id) await fetchSubDepartmentOptions(form.Product_Department_Id)
  if (form.Product_Sub_Department_Id) await fetchSubSubDepartmentOptions(form.Product_Sub_Department_Id)
  hydratingForm.value = false
}

const payload = () => ({
  Product_Discount_Name: form.Product_Discount_Name,
  Target_Type: form.Target_Type,
  Products_Id: form.Target_Type === 'product' ? Number(form.Products_Id || 0) || null : null,
  Product_Department_Id: ['department', 'sub_department', 'sub_sub_department'].includes(form.Target_Type) ? Number(form.Product_Department_Id || 0) || null : null,
  Product_Sub_Department_Id: ['sub_department', 'sub_sub_department'].includes(form.Target_Type) ? Number(form.Product_Sub_Department_Id || 0) || null : null,
  Product_Sub_Sub_Department_Id: form.Target_Type === 'sub_sub_department' ? Number(form.Product_Sub_Sub_Department_Id || 0) || null : null,
  Product_Discount_Type: form.Product_Discount_Type,
  Product_Discount_Value: Number(form.Product_Discount_Value || 0),
  Start_Date: inputToPayloadDate(form.Start_Date),
  End_Date: inputToPayloadDate(form.End_Date),
  Product_Discount_Is_Active: form.Product_Discount_Is_Active,
})

const saveDiscount = async () => {
  saving.value = true
  try {
    if (isEditing.value) {
      await $axios.put(`/api/product-discounts/${editingId.value}`, payload())
      flash.success('Discount updated successfully.')
    } else {
      await $axios.post('/api/product-discounts', payload())
      flash.success('Discount created successfully.')
    }

    resetForm()
    await fetchDiscounts()
  } catch (error: any) {
    const errors = error?.response?.data?.errors
    const first = errors ? Object.values(errors).flat()[0] : null
    flash.error(String(first || error?.response?.data?.message || 'Unable to save discount.'))
  } finally {
    saving.value = false
  }
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

const clearFilters = () => {
  table.search = ''
  table.targetType = ''
  table.active = ''
  table.page = 1
}

watch(
  () => [table.page, table.perPage, table.search, table.targetType, table.active],
  fetchDiscounts,
)

watch(
  () => form.Target_Type,
  () => {
    if (!hydratingForm.value) resetTarget()
  },
)

watch(
  () => form.Product_Department_Id,
  async (departmentId) => {
    form.Product_Sub_Department_Id = ''
    form.Product_Sub_Sub_Department_Id = ''
    subSubDepartmentOptions.value = []
    await fetchSubDepartmentOptions(departmentId)
  },
)

watch(
  () => form.Product_Sub_Department_Id,
  async (subDepartmentId) => {
    form.Product_Sub_Sub_Department_Id = ''
    await fetchSubSubDepartmentOptions(subDepartmentId)
  },
)

watch(productSearch, async () => {
  await fetchProductOptions()
})

onMounted(async () => {
  await Promise.all([
    fetchDepartmentOptions(),
    fetchProductOptions(),
    fetchDiscounts(),
  ])

  refreshTimer = setInterval(fetchDiscounts, 30000)
})

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <div>
        <h6 class="fw-semibold mb-1" style="color: #7c3aed">Product Discounts</h6>
        <p class="text-muted small mb-0">Create promotions for one product or a whole category branch.</p>
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

    <div class="discount-layout">
      <section class="card border-0 shadow-sm">
        <div class="card-header bg-white border-0 pb-0">
          <div class="d-flex align-items-start justify-content-between gap-3">
            <div>
              <h6 class="mb-1">{{ isEditing ? 'Edit Discount' : 'New Discount' }}</h6>
              <p class="text-muted small mb-0">Discounts are resolved at checkout and saved into the order lines.</p>
            </div>
            <button v-if="isEditing" type="button" class="btn btn-sm btn-light" @click="resetForm">
              Cancel
            </button>
          </div>
        </div>

        <div class="card-body">
          <div class="mb-3">
            <label class="form-label small text-muted">Discount name</label>
            <input v-model.trim="form.Product_Discount_Name" type="text" class="form-control" placeholder="Example: Ramadan tools offer">
          </div>

          <div class="mb-3">
            <label class="form-label small text-muted">Target</label>
            <div class="target-grid">
              <button
                v-for="target in targetTypes"
                :key="target.value"
                type="button"
                class="target-card"
                :class="{ active: form.Target_Type === target.value }"
                @click="form.Target_Type = target.value"
              >
                <iconify-icon :icon="target.icon" class="fs-5"></iconify-icon>
                <span>{{ target.label }}</span>
              </button>
            </div>
          </div>

          <div v-if="form.Target_Type === 'product'" class="mb-3">
            <label class="form-label small text-muted">Product</label>
            <input v-model.trim="productSearch" type="text" class="form-control mb-2" placeholder="Search product name, SKU, or code">
            <select v-model="form.Products_Id" class="form-select">
              <option value="">Select product</option>
              <option v-for="product in productOptions" :key="product.id" :value="product.id">
                {{ product.Product_Name }} <template v-if="product.Product_Code">({{ product.Product_Code }})</template>
              </option>
            </select>
          </div>

          <div v-else class="category-select-grid mb-3">
            <div>
              <label class="form-label small text-muted">Department</label>
              <select v-model="form.Product_Department_Id" class="form-select">
                <option value="">Select department</option>
                <option v-for="department in departmentOptions" :key="department.id" :value="department.id">
                  {{ department.Product_Department_Name }}
                </option>
              </select>
            </div>

            <div v-if="['sub_department', 'sub_sub_department'].includes(form.Target_Type)">
              <label class="form-label small text-muted">Sub Department</label>
              <select v-model="form.Product_Sub_Department_Id" class="form-select" :disabled="!form.Product_Department_Id">
                <option value="">Select sub department</option>
                <option v-for="subDepartment in subDepartmentOptions" :key="subDepartment.id" :value="subDepartment.id">
                  {{ subDepartment.Sub_Department_Name }}
                </option>
              </select>
            </div>

            <div v-if="form.Target_Type === 'sub_sub_department'">
              <label class="form-label small text-muted">Sub Sub Department</label>
              <select v-model="form.Product_Sub_Sub_Department_Id" class="form-select" :disabled="!form.Product_Sub_Department_Id">
                <option value="">Select sub sub department</option>
                <option v-for="subSubDepartment in subSubDepartmentOptions" :key="subSubDepartment.id" :value="subSubDepartment.id">
                  {{ subSubDepartment.Product_Sub_Sub_Department_Name }}
                </option>
              </select>
            </div>
          </div>

          <div class="discount-value-grid mb-3">
            <div>
              <label class="form-label small text-muted">Discount type</label>
              <select v-model="form.Product_Discount_Type" class="form-select">
                <option v-for="type in discountTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="form-label small text-muted">Discount value</label>
              <input v-model="form.Product_Discount_Value" type="number" min="0" step="0.001" class="form-control" :placeholder="valueHint">
              <div class="form-text">{{ valueHint }}</div>
            </div>
          </div>

          <div class="discount-value-grid mb-3">
            <div>
              <label class="form-label small text-muted">Start date</label>
              <input v-model="form.Start_Date" type="datetime-local" class="form-control">
            </div>
            <div>
              <label class="form-label small text-muted">End date</label>
              <input v-model="form.End_Date" type="datetime-local" class="form-control">
            </div>
          </div>
          <div class="form-text mb-3">
            Dates are saved as local business time. A published discount only applies during this start/end window.
          </div>

          <label class="form-check d-flex align-items-center gap-2 mb-4">
            <input v-model="form.Product_Discount_Is_Active" class="form-check-input" type="checkbox">
            <span class="form-check-label">Publish this discount</span>
          </label>

          <button type="button" class="btn btn-primary w-100" :disabled="saving" @click="saveDiscount">
            <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
            {{ isEditing ? 'Save Changes' : 'Create Discount' }}
          </button>
        </div>
      </section>

      <section class="card border-0 shadow-sm">
        <div class="card-header bg-white border-0">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
            <div>
              <h6 class="mb-1">Discount List</h6>
              <p class="text-muted small mb-0">The best active discount is selected automatically for each product.</p>
            </div>
            <button type="button" class="btn btn-sm btn-outline-secondary" @click="clearFilters">
              Clear filters
            </button>
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
                      <span class="target-pill">{{ targetTypeLabel(row.Target_Type) }}</span>
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
                        <button type="button" class="btn btn-sm btn-outline-primary" @click="editDiscount(row)">
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
    </div>
  </div>
</template>

<style scoped>
.discount-layout {
  display: grid;
  grid-template-columns: minmax(320px, 430px) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}

.target-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.target-card {
  min-height: 72px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.85rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  color: #334155;
  text-align: left;
  transition: all 0.18s ease;
}

.target-card.active,
.target-card:hover {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
}

.category-select-grid,
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
.status-pill {
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

@media (max-width: 1199px) {
  .discount-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .target-grid,
  .category-select-grid,
  .discount-value-grid,
  .list-filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>
