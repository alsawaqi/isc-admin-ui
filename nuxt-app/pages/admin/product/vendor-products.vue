<script setup lang="ts">
import { definePageMeta, useNuxtApp } from '#imports'
import { onMounted, reactive, ref, watch } from 'vue'
import { useFlashStore } from '~/stores/flashs'

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permission: 'product activation',
})

const { $axios } = (useNuxtApp() as any)
const flash = useFlashStore()

type ProductRow = {
  id: number
  Product_Code?: string | null
  Product_Sku?: string | null
  Product_Name: string
  Product_Price: number
  Product_Stock?: number | null
  Status?: string | null
  Is_Active?: boolean | number | string | null
  deleted_at?: string | null
  Vendor_Id?: number | null
  Commission_Type?: string | null
  Commission_Value?: number | null
  created_at?: string | null
  vendor?: {
    Vendor_Code?: string | null
    Vendor_Name?: string | null
    Trade_Name?: string | null
  } | null
  department?: {
    Product_Department_Name?: string | null
  } | null
  sub_department?: {
    Sub_Department_Name?: string | null
  } | null
  subDepartment?: {
    Sub_Department_Name?: string | null
  } | null
  sub_sub_department?: {
    Product_Sub_Sub_Department_Name?: string | null
  } | null
  subSubDepartment?: {
    Product_Sub_Sub_Department_Name?: string | null
  } | null
}

const table = reactive({
  page: 1,
  perPage: 10,
  search: '',
  sortBy: 'id',
  sortDir: 'desc',
  vendorId: '',
  productDepartmentId: '',
  productSubDepartmentId: '',
  productSubSubDepartmentId: '',
})

const pagination = ref({
  total: 0,
  from: 0,
  to: 0,
  last_page: 1,
})

const products = ref<ProductRow[]>([])

// 'current' shows live products, 'deleted' lists soft-deleted (trashed) products
const viewMode = ref<'current' | 'deleted'>('current')

const vendorOptions = ref<any[]>([])
const departmentOptions = ref<any[]>([])
const subDepartmentOptions = ref<any[]>([])
const subSubDepartmentOptions = ref<any[]>([])
const loading = ref(false)

const vendorLabel = (product: ProductRow) => {
  return product.vendor?.Trade_Name
    || product.vendor?.Vendor_Name
    || product.vendor?.Vendor_Code
    || 'Vendor not found'
}

const categoryName = (product: ProductRow, level: 'department' | 'subDepartment' | 'subSubDepartment') => {
  if (level === 'department') {
    return product.department?.Product_Department_Name || 'Unassigned'
  }

  if (level === 'subDepartment') {
    return product.subDepartment?.Sub_Department_Name
      || product.sub_department?.Sub_Department_Name
      || 'Unassigned'
  }

  return product.subSubDepartment?.Product_Sub_Sub_Department_Name
    || product.sub_sub_department?.Product_Sub_Sub_Department_Name
    || 'Unassigned'
}

const fetchVendors = async () => {
  const { data } = await $axios.get('/api/vendors/all')
  vendorOptions.value = Array.isArray(data) ? data : []
}

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

const fetchProducts = async () => {
  loading.value = true

  try {
    const { data } = await $axios.get('/api/productmaster', {
      params: {
        owner: 'vendor',
        page: table.page,
        per_page: table.perPage,
        search: table.search,
        sort_by: table.sortBy,
        sort_dir: table.sortDir,
        vendor_id: table.vendorId || undefined,
        product_department_id: table.productDepartmentId || undefined,
        product_sub_department_id: table.productSubDepartmentId || undefined,
        product_sub_sub_department_id: table.productSubSubDepartmentId || undefined,
        trashed: viewMode.value === 'deleted' ? 1 : undefined,
      },
    })

    products.value = data.data || []
    pagination.value = {
      total: data.total || 0,
      from: data.from || 0,
      to: data.to || 0,
      last_page: data.last_page || 1,
    }
  } catch (error) {
    flash.error('Error fetching vendor products.')
  } finally {
    loading.value = false
  }
}

// ---- Per-product commission ----
const showCommission = ref(false)
const commissionProduct = ref<ProductRow | null>(null)
const commissionType = ref<'percent' | 'fixed'>('percent')
const commissionValue = ref<number | null>(null)
const commissionError = ref<string | null>(null)
const commissionBusy = ref(false)

const commissionLabel = (product: ProductRow) => {
  if (!product.Commission_Type || product.Commission_Value == null) return '—'
  if (product.Commission_Type === 'percent') return `${Number(product.Commission_Value)}%`
  if (product.Commission_Type === 'fixed') return `${Number(product.Commission_Value).toFixed(3)} fixed/unit`
  return `${product.Commission_Type} / ${product.Commission_Value}`
}

const openCommission = (product: ProductRow) => {
  commissionProduct.value = product
  commissionType.value = (product.Commission_Type === 'fixed' ? 'fixed' : 'percent')
  commissionValue.value = product.Commission_Value != null ? Number(product.Commission_Value) : null
  commissionError.value = null
  showCommission.value = true
}

const validateCommission = (): boolean => {
  commissionError.value = null
  const v = Number(commissionValue.value)
  if (commissionValue.value === null || isNaN(v) || v <= 0) {
    commissionError.value = 'Commission value must be greater than 0.'
    return false
  }
  if (commissionType.value === 'percent' && v > 100) {
    commissionError.value = 'Percent commission cannot exceed 100.'
    return false
  }
  return true
}

const saveCommission = async () => {
  if (!commissionProduct.value) return
  if (!validateCommission()) return

  commissionBusy.value = true
  try {
    await $axios.post(`/api/admin/vendor-products/${commissionProduct.value.id}/commission`, {
      commission_type: commissionType.value,
      commission_value: Number(commissionValue.value),
    })
    flash.success('Commission saved. It applies to future orders only.')
    showCommission.value = false
    commissionProduct.value = null
    await fetchProducts()
  } catch (e: any) {
    const errs = e?.response?.data?.errors
    const firstErr = errs ? (Object.values(errs)[0] as string[])?.[0] : null
    commissionError.value = firstErr || e?.response?.data?.message || 'Failed to save commission.'
  } finally {
    commissionBusy.value = false
  }
}

// ---- Activate / deactivate / soft delete / restore ----
const isActive = (product: ProductRow) =>
  product.Is_Active === undefined || product.Is_Active === null
    ? true
    : Number(product.Is_Active) === 1

const toggleActive = async (product: ProductRow) => {
  const activating = !isActive(product)
  const ok = await flash.confirm({
    title: activating ? 'Activate Product?' : 'Deactivate Product?',
    message: activating
      ? `"${product.Product_Name}" will become visible and purchasable on the storefront again.`
      : `"${product.Product_Name}" will be hidden from the storefront and cannot be purchased until reactivated.`,
    confirmText: activating ? 'Yes, activate' : 'Yes, deactivate',
    cancelText: 'Cancel',
  })
  if (!ok) return

  try {
    await $axios.post(`/api/productmaster/${product.id}/${activating ? 'activate' : 'deactivate'}`)
    flash.success(activating ? 'Product activated.' : 'Product deactivated.')
    await fetchProducts()
  } catch (e: any) {
    flash.error(e?.response?.data?.message || 'Failed to update product status.')
  }
}

const deleteProduct = async (product: ProductRow) => {
  const ok = await flash.confirm({
    title: 'Delete Product?',
    message: `This moves "${product.Product_Name}" to Deleted; it can be restored later from the Deleted view.`,
    confirmText: 'Yes, delete',
    cancelText: 'No, cancel',
  })
  if (!ok) return

  try {
    await $axios.delete(`/api/productmaster/${product.id}`)
    flash.success('Product moved to Deleted. It can be restored from the Deleted view.')
    await fetchProducts()
  } catch (e: any) {
    flash.error(e?.response?.data?.message || 'Error deleting product.')
  }
}

const restoreProduct = async (product: ProductRow) => {
  const ok = await flash.confirm({
    title: 'Restore Product?',
    message: `"${product.Product_Name}" will be restored and returned to the product list.`,
    confirmText: 'Yes, restore',
    cancelText: 'Cancel',
  })
  if (!ok) return

  try {
    await $axios.post(`/api/productmaster/${product.id}/restore`)
    flash.success('Product restored successfully.')
    await fetchProducts()
  } catch (e: any) {
    flash.error(e?.response?.data?.message || 'Failed to restore product.')
  }
}

const clearFilters = () => {
  table.vendorId = ''
  table.productDepartmentId = ''
  table.productSubDepartmentId = ''
  table.productSubSubDepartmentId = ''
  table.search = ''
  table.page = 1
}

watch(
  () => [
    table.page,
    table.perPage,
    table.search,
    table.sortBy,
    table.sortDir,
    table.vendorId,
    table.productDepartmentId,
    table.productSubDepartmentId,
    table.productSubSubDepartmentId,
  ],
  async () => {
    await fetchProducts()
  }
)

watch(
  () => table.productDepartmentId,
  async (departmentId) => {
    table.page = 1
    table.productSubDepartmentId = ''
    table.productSubSubDepartmentId = ''
    subSubDepartmentOptions.value = []
    await fetchSubDepartmentOptions(departmentId)
  }
)

watch(
  () => table.productSubDepartmentId,
  async (subDepartmentId) => {
    table.page = 1
    table.productSubSubDepartmentId = ''
    await fetchSubSubDepartmentOptions(subDepartmentId)
  }
)

watch(
  () => table.vendorId,
  () => {
    table.page = 1
  }
)

watch(viewMode, async () => {
  if (table.page !== 1) {
    table.page = 1 // the table watcher refetches
  } else {
    await fetchProducts()
  }
})

onMounted(async () => {
  await Promise.all([
    fetchVendors(),
    fetchDepartmentOptions(),
    fetchProducts(),
  ])
})
</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <div>
        <h6 class="fw-semibold mb-1" style="color: #0f766e">Vendor Product Activation</h6>
        <p class="text-muted small mb-0">Filter approved vendor products by vendor and category hierarchy.</p>
      </div>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">Vendor Products</li>
      </ul>
    </div>

    <div class="card h-100 p-0 radius-12 overflow-hidden border-0 shadow-sm">
      <div class="card-header bg-light">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
          <div class="d-flex flex-wrap align-items-center gap-3">
            <div class="d-flex align-items-center gap-2">
              <span class="text-muted">Show</span>
              <select v-model="table.perPage" class="form-select form-select-sm w-auto">
                <option :value="10">10</option>
                <option :value="15">15</option>
                <option :value="20">20</option>
              </select>
            </div>

            <div class="d-flex align-items-center gap-2">
              <span class="text-muted">View</span>
              <select v-model="viewMode" class="form-select form-select-sm w-auto">
                <option value="current">Current</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>

            <div class="icon-field d-flex align-items-center position-relative">
              <input
                v-model="table.search"
                type="text"
                class="form-control form-control-sm ps-5"
                placeholder="Search product, SKU, or code..."
              >
              <span class="icon position-absolute start-0 ps-2 d-flex align-items-center h-100 text-muted">
                <iconify-icon icon="ion:search-outline" class="fs-5"></iconify-icon>
              </span>
            </div>
          </div>

          <button type="button" class="btn btn-sm btn-outline-secondary" @click="clearFilters">
            Clear filters
          </button>
        </div>

        <div class="activation-filter-grid">
          <div>
            <label class="form-label small text-muted mb-1">Vendor</label>
            <select v-model="table.vendorId" class="form-select form-select-sm">
              <option value="">All vendors</option>
              <option v-for="vendor in vendorOptions" :key="vendor.id" :value="vendor.id">
                {{ vendor.Vendor_Name }} <template v-if="vendor.Vendor_Code">({{ vendor.Vendor_Code }})</template>
              </option>
            </select>
          </div>

          <div>
            <label class="form-label small text-muted mb-1">Department</label>
            <select v-model="table.productDepartmentId" class="form-select form-select-sm">
              <option value="">All departments</option>
              <option v-for="department in departmentOptions" :key="department.id" :value="department.id">
                {{ department.Product_Department_Name }}
              </option>
            </select>
          </div>

          <div>
            <label class="form-label small text-muted mb-1">Sub Department</label>
            <select
              v-model="table.productSubDepartmentId"
              class="form-select form-select-sm"
              :disabled="!table.productDepartmentId"
            >
              <option value="">All sub departments</option>
              <option v-for="subDepartment in subDepartmentOptions" :key="subDepartment.id" :value="subDepartment.id">
                {{ subDepartment.Sub_Department_Name }}
              </option>
            </select>
          </div>

          <div>
            <label class="form-label small text-muted mb-1">Sub Sub Department</label>
            <select
              v-model="table.productSubSubDepartmentId"
              class="form-select form-select-sm"
              :disabled="!table.productSubDepartmentId"
            >
              <option value="">All sub sub departments</option>
              <option v-for="subSubDepartment in subSubDepartmentOptions" :key="subSubDepartment.id" :value="subSubDepartment.id">
                {{ subSubDepartment.Product_Sub_Sub_Department_Name }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table mb-0 align-middle table-bordered">
            <thead class="bg-gray-100">
              <tr>
                <th class="p-3 fw-semibold">S.L</th>
                <th class="p-3 fw-semibold">Product</th>
                <th class="p-3 fw-semibold">Vendor</th>
                <th class="p-3 fw-semibold">Department</th>
                <th class="p-3 fw-semibold">Sub Department</th>
                <th class="p-3 fw-semibold">Sub Sub Department</th>
                <th class="p-3 fw-semibold">Stock</th>
                <th class="p-3 fw-semibold">Amount</th>
                <th class="p-3 fw-semibold">Commission</th>
                <th class="p-3 fw-semibold">Status</th>
                <th class="p-3 text-center fw-semibold">Active</th>
                <th class="p-3 text-center fw-semibold">Action</th>
              </tr>
            </thead>

            <tbody>
              <tr v-if="loading">
                <td colspan="12" class="p-4 text-center text-muted">Loading vendor products...</td>
              </tr>

              <tr v-else-if="products.length === 0">
                <td colspan="12" class="p-4 text-center text-muted">No vendor products match the selected filters.</td>
              </tr>

              <template v-else>
                <tr v-for="(product, index) in products" :key="product.id">
                  <td class="p-3 text-muted small">{{ pagination.from + index }}</td>
                  <td class="p-3">
                    <div class="d-flex flex-column">
                      <span class="fw-semibold">{{ product.Product_Name }}</span>
                      <span class="text-muted small">{{ product.Product_Code || product.Product_Sku || `#${product.id}` }}</span>
                    </div>
                  </td>
                  <td class="p-3">
                    <div class="d-flex flex-column">
                      <span class="fw-semibold">{{ vendorLabel(product) }}</span>
                      <span v-if="product.vendor?.Vendor_Code" class="text-muted small">{{ product.vendor.Vendor_Code }}</span>
                    </div>
                  </td>
                  <td class="p-3"><span class="category-pill">{{ categoryName(product, 'department') }}</span></td>
                  <td class="p-3"><span class="category-pill">{{ categoryName(product, 'subDepartment') }}</span></td>
                  <td class="p-3"><span class="category-pill">{{ categoryName(product, 'subSubDepartment') }}</span></td>
                  <td class="p-3">{{ product.Product_Stock ?? '-' }}</td>
                  <td class="p-3 fw-semibold">OMR {{ Number(product.Product_Price || 0).toFixed(3) }}</td>
                  <td class="p-3">
                    <span :class="product.Commission_Type ? 'fw-semibold' : 'text-muted'">
                      {{ commissionLabel(product) }}
                    </span>
                  </td>
                  <td class="p-3">
                    <span class="status-pill">{{ product.Status || 'available' }}</span>
                  </td>
                  <td class="p-3 text-center">
                    <span v-if="viewMode === 'deleted'" class="state-pill state-pill-deleted">Deleted</span>
                    <span v-else-if="isActive(product)" class="state-pill state-pill-active">Active</span>
                    <span v-else class="state-pill state-pill-inactive">Inactive</span>
                  </td>
                  <td class="p-3 text-center">
                    <div v-if="viewMode === 'deleted'" class="d-flex align-items-center justify-content-center gap-2">
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-success text-nowrap"
                        @click="restoreProduct(product)"
                      >
                        Restore
                      </button>
                    </div>
                    <div v-else class="d-flex align-items-center justify-content-center gap-2 flex-wrap">
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-primary text-nowrap"
                        @click="openCommission(product)"
                      >
                        Set commission
                      </button>
                      <button
                        type="button"
                        :class="['btn btn-sm text-nowrap', isActive(product) ? 'btn-outline-warning' : 'btn-outline-success']"
                        @click="toggleActive(product)"
                      >
                        {{ isActive(product) ? 'Deactivate' : 'Activate' }}
                      </button>
                      <NuxtLink :to="`/admin/product/${product.id}`" class="btn-icon-lg bg-green-100 text-green-700">
                        <iconify-icon icon="lucide:edit" class="fs-5"></iconify-icon>
                      </NuxtLink>
                      <button type="button" @click.prevent="deleteProduct(product)"
                        class="btn-icon-lg bg-red-100 text-red-700">
                        <iconify-icon icon="mingcute:delete-2-line" class="fs-5"></iconify-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 py-3 px-3">
          <span class="text-muted small">
            Showing {{ pagination.from || 0 }} to {{ pagination.to || 0 }} of {{ pagination.total || 0 }} entries
          </span>

          <ul class="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center mb-0">
            <li class="page-item" :class="{ disabled: table.page === 1 }">
              <a class="page-link pagination-btn" href="javascript:void(0)" @click="table.page > 1 && (table.page -= 1)">
                <iconify-icon icon="ep:d-arrow-left" class="fs-5"></iconify-icon>
              </a>
            </li>
            <li v-for="p in pagination.last_page" :key="p" class="page-item">
              <a
                :class="['page-link pagination-btn', p === table.page ? 'active' : '']"
                href="javascript:void(0)"
                @click="table.page = p"
              >
                {{ p }}
              </a>
            </li>
            <li class="page-item" :class="{ disabled: table.page === pagination.last_page }">
              <a class="page-link pagination-btn" href="javascript:void(0)" @click="table.page < pagination.last_page && (table.page += 1)">
                <iconify-icon icon="ep:d-arrow-right" class="fs-5"></iconify-icon>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Set commission modal -->
    <div v-if="showCommission" class="modal-backdropx">
      <div class="modal-cardx">
        <h6 class="mb-1">Set Product Commission</h6>
        <div class="text-muted small mb-3">
          {{ commissionProduct?.Product_Name }}
          <span class="font-monospace">({{ commissionProduct?.Product_Code || commissionProduct?.Product_Sku || `#${commissionProduct?.id}` }})</span>
          — applies to future orders only.
        </div>

        <div v-if="commissionError" class="alert alert-danger py-2">{{ commissionError }}</div>

        <div class="mb-3">
          <label class="form-label small">Commission Type</label>
          <select v-model="commissionType" class="form-select">
            <option value="percent">percent (%)</option>
            <option value="fixed">fixed (OMR per unit)</option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label small">Commission Value</label>
          <input
            v-model.number="commissionValue"
            type="number"
            min="0"
            :max="commissionType === 'percent' ? 100 : undefined"
            step="0.001"
            class="form-control"
            :placeholder="commissionType === 'percent' ? 'e.g. 10 (%)' : 'e.g. 2.500 (OMR per unit)'"
          />
          <div class="text-muted small mt-1">
            {{ commissionType === 'percent'
              ? 'Percentage of each line subtotal (0 < value ≤ 100).'
              : 'Fixed amount in OMR charged per unit sold (value > 0).' }}
          </div>
        </div>

        <div class="d-flex justify-content-end gap-2">
          <button class="btn btn-light" @click="showCommission = false" :disabled="commissionBusy">Cancel</button>
          <button class="btn btn-primary" @click="saveCommission" :disabled="commissionBusy">
            {{ commissionBusy ? 'Saving...' : 'Save Commission' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdropx {
  position: fixed;
  inset: 0;
  z-index: 2050;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.58);
  backdrop-filter: blur(3px);
}

.modal-cardx {
  width: min(520px, 100%);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.22);
  padding: 1.25rem;
}

.activation-filter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(180px, 1fr));
  gap: 0.75rem;
}

.icon-field input.form-control {
  min-width: 260px;
  border-radius: 999px;
}

.category-pill,
.status-pill {
  display: inline-flex;
  max-width: 220px;
  padding: 0.3rem 0.55rem;
  border-radius: 999px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #334155;
  font-size: 0.78rem;
  line-height: 1.1rem;
  white-space: normal;
}

.status-pill {
  background: #ecfdf5;
  border-color: #bbf7d0;
  color: #047857;
  text-transform: capitalize;
}

.state-pill {
  display: inline-flex;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.1rem;
  white-space: nowrap;
}

.state-pill-active {
  background: #ecfdf5;
  border: 1px solid #bbf7d0;
  color: #047857;
}

.state-pill-inactive {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #64748b;
}

.state-pill-deleted {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

.btn-icon-lg {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
}

.btn-icon-lg:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.18);
  filter: brightness(1.03);
}

.pagination-btn {
  min-width: 36px;
  height: 36px;
  border-radius: 999px !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background-color: #f3f4f6;
  color: #4b5563;
  font-weight: 500;
  transition: all 0.2s ease-in-out;
}

.pagination-btn.active,
.pagination-btn:hover {
  background-color: #2563eb;
  color: #ffffff;
}

@media (max-width: 991px) {
  .activation-filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 575px) {
  .activation-filter-grid {
    grid-template-columns: 1fr;
  }

  .icon-field input.form-control {
    min-width: 100%;
  }
}
</style>
