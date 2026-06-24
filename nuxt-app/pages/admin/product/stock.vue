<script setup lang="ts">
import { definePageMeta, useNuxtApp } from '#imports'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useFlashStore } from '~/stores/flashs'

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permission: 'product stock',
})

const { $axios } = (useNuxtApp() as any)
const flash = useFlashStore()

type RelationName = {
  Product_Department_Name?: string | null
  Sub_Department_Name?: string | null
  Product_Sub_Sub_Department_Name?: string | null
}

type ProductRow = {
  id: number
  Product_Code?: string | null
  Product_Sku?: string | null
  Product_Name: string
  Product_Stock?: number | null
  Status?: string | null
  department?: RelationName | null
  subDepartment?: RelationName | null
  sub_department?: RelationName | null
  subSubDepartment?: RelationName | null
  sub_sub_department?: RelationName | null
}

type StockMovement = {
  id: number
  Movement_Type: 'increase' | 'decrease' | 'set'
  Quantity_Delta: number
  Quantity: number
  Previous_Stock: number
  New_Stock: number
  Actor_Name?: string | null
  Notes?: string | null
  created_at?: string | null
}

const table = reactive({
  page: 1,
  perPage: 10,
  search: '',
  sortBy: 'Product_Stock',
  sortDir: 'asc',
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
const movements = ref<StockMovement[]>([])
const departmentOptions = ref<any[]>([])
const subDepartmentOptions = ref<any[]>([])
const subSubDepartmentOptions = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)
const movementsLoading = ref(false)
const selectedProduct = ref<ProductRow | null>(null)

const adjustment = reactive({
  movementType: 'increase' as 'increase' | 'decrease' | 'set',
  quantity: 1,
  newStock: 0,
  notes: '',
})

const totalStock = computed(() => {
  return products.value.reduce((sum, product) => sum + Number(product.Product_Stock || 0), 0)
})

const lowStockCount = computed(() => {
  return products.value.filter((product) => Number(product.Product_Stock || 0) <= 5).length
})

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

const statusClass = (status?: string | null) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'available') return 'bg-success-focus text-success-main'
  if (normalized === 'out_of_stock') return 'bg-danger-focus text-danger-main'
  return 'bg-secondary-focus text-secondary-main'
}

const stockTone = (stock?: number | null) => {
  const value = Number(stock || 0)
  if (value <= 0) return 'stock-pill danger'
  if (value <= 5) return 'stock-pill warning'
  return 'stock-pill success'
}

const formatDate = (value?: string | null) => {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

const extractError = (error: any, fallback: string) => {
  const errors = error?.response?.data?.errors
  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat()[0]
    if (first) return String(first)
  }

  return error?.response?.data?.message || fallback
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
    const { data } = await $axios.get('/api/product-stock/products', {
      params: {
        page: table.page,
        per_page: table.perPage,
        search: table.search,
        sort_by: table.sortBy,
        sort_dir: table.sortDir,
        product_department_id: table.productDepartmentId || undefined,
        product_sub_department_id: table.productSubDepartmentId || undefined,
        product_sub_sub_department_id: table.productSubSubDepartmentId || undefined,
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
    flash.error(extractError(error, 'Error fetching stock products.'))
  } finally {
    loading.value = false
  }
}

const fetchMovements = async (productId: number) => {
  movementsLoading.value = true
  try {
    const { data } = await $axios.get(`/api/product-stock/products/${productId}/movements`, {
      params: { per_page: 8 },
    })
    movements.value = data.data || []
  } catch (error) {
    flash.error(extractError(error, 'Could not load stock history.'))
  } finally {
    movementsLoading.value = false
  }
}

const openAdjustPanel = async (product: ProductRow) => {
  selectedProduct.value = product
  adjustment.movementType = 'increase'
  adjustment.quantity = 1
  adjustment.newStock = Number(product.Product_Stock || 0)
  adjustment.notes = ''
  await fetchMovements(product.id)
}

const closeAdjustPanel = () => {
  selectedProduct.value = null
  movements.value = []
}

const submitAdjustment = async () => {
  if (!selectedProduct.value) return

  saving.value = true

  try {
    const payload = {
      movement_type: adjustment.movementType,
      quantity: adjustment.movementType === 'set' ? undefined : Number(adjustment.quantity || 0),
      new_stock: adjustment.movementType === 'set' ? Number(adjustment.newStock || 0) : undefined,
      notes: adjustment.notes || undefined,
    }

    await $axios.post(`/api/product-stock/products/${selectedProduct.value.id}/adjust`, payload)
    flash.success('Stock updated successfully.')
    await fetchProducts()

    const refreshed = products.value.find((product) => product.id === selectedProduct.value?.id)
    if (refreshed) selectedProduct.value = refreshed
    await fetchMovements(selectedProduct.value.id)
  } catch (error) {
    flash.error(extractError(error, 'Stock update failed.'))
  } finally {
    saving.value = false
  }
}

const clearFilters = () => {
  table.search = ''
  table.productDepartmentId = ''
  table.productSubDepartmentId = ''
  table.productSubSubDepartmentId = ''
  table.page = 1
}

watch(
  () => [
    table.page,
    table.perPage,
    table.search,
    table.sortBy,
    table.sortDir,
    table.productDepartmentId,
    table.productSubDepartmentId,
    table.productSubSubDepartmentId,
  ],
  fetchProducts,
)

watch(
  () => table.productDepartmentId,
  async (departmentId) => {
    table.page = 1
    table.productSubDepartmentId = ''
    table.productSubSubDepartmentId = ''
    subSubDepartmentOptions.value = []
    await fetchSubDepartmentOptions(departmentId)
  },
)

watch(
  () => table.productSubDepartmentId,
  async (subDepartmentId) => {
    table.page = 1
    table.productSubSubDepartmentId = ''
    await fetchSubSubDepartmentOptions(subDepartmentId)
  },
)

watch(
  () => table.productSubSubDepartmentId,
  () => {
    table.page = 1
  },
)

onMounted(async () => {
  await Promise.all([
    fetchDepartmentOptions(),
    fetchProducts(),
  ])
})
</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <div>
        <h6 class="fw-semibold mb-1 text-info">Product Stock</h6>
        <p class="text-muted small mb-0">Search company products by SKU, code, name, or category and update stock.</p>
      </div>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">Product Stock</li>
      </ul>
    </div>

    <div class="stock-summary-grid mb-3">
      <div class="summary-tile">
        <span>Visible products</span>
        <strong>{{ pagination.total }}</strong>
      </div>
      <div class="summary-tile">
        <span>Stock in current view</span>
        <strong>{{ totalStock }}</strong>
      </div>
      <div class="summary-tile">
        <span>Low or empty</span>
        <strong>{{ lowStockCount }}</strong>
      </div>
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

            <div class="icon-field d-flex align-items-center position-relative">
              <input
                v-model="table.search"
                type="text"
                class="form-control form-control-sm ps-5 stock-search"
                placeholder="Search product, SKU, code, barcode..."
              >
              <span class="icon position-absolute start-0 ps-2 d-flex align-items-center h-100 text-muted">
                <iconify-icon icon="ion:search-outline" class="fs-5"></iconify-icon>
              </span>
            </div>
          </div>

          <div class="d-flex flex-wrap align-items-center gap-2">
            <select v-model="table.sortBy" class="form-select form-select-sm w-auto">
              <option value="Product_Stock">Stock</option>
              <option value="Product_Name">Name</option>
              <option value="Product_Code">Code</option>
              <option value="Product_Sku">SKU</option>
              <option value="Status">Status</option>
            </select>
            <select v-model="table.sortDir" class="form-select form-select-sm w-auto">
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </div>
        </div>

        <div class="stock-filter-grid">
          <div>
            <label class="form-label small text-muted mb-1">Department</label>
            <select v-model="table.productDepartmentId" class="form-select form-select-sm">
              <option value="">All departments</option>
              <option
                v-for="department in departmentOptions"
                :key="department.id"
                :value="department.id"
              >
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
              <option
                v-for="subDepartment in subDepartmentOptions"
                :key="subDepartment.id"
                :value="subDepartment.id"
              >
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
              <option
                v-for="subSubDepartment in subSubDepartmentOptions"
                :key="subSubDepartment.id"
                :value="subSubDepartment.id"
              >
                {{ subSubDepartment.Product_Sub_Sub_Department_Name }}
              </option>
            </select>
          </div>

          <div class="d-flex align-items-end">
            <button type="button" class="btn btn-sm btn-outline-secondary w-100" @click="clearFilters">
              Clear filters
            </button>
          </div>
        </div>
      </div>

      <div class="card-body p-0">
        <div v-if="loading" class="py-5 text-center text-muted">
          Loading stock products...
        </div>

        <div v-else class="table-responsive">
          <table class="table mb-0 align-middle table-bordered stock-table">
            <thead class="bg-gray-100">
              <tr>
                <th class="p-3">Product</th>
                <th class="p-3">Category</th>
                <th class="p-3 text-center">SKU</th>
                <th class="p-3 text-center">Status</th>
                <th class="p-3 text-center">Stock</th>
                <th class="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!products.length">
                <td colspan="6" class="p-4 text-center text-muted">
                  No company products found for these filters.
                </td>
              </tr>

              <tr v-for="product in products" :key="product.id">
                <td class="p-3">
                  <div class="fw-semibold text-dark">{{ product.Product_Name }}</div>
                  <div class="text-muted small">{{ product.Product_Code || '-' }}</div>
                </td>
                <td class="p-3">
                  <div class="category-line">{{ categoryName(product, 'department') }}</div>
                  <div class="text-muted small">
                    {{ categoryName(product, 'subDepartment') }} / {{ categoryName(product, 'subSubDepartment') }}
                  </div>
                </td>
                <td class="p-3 text-center">
                  <span class="code-pill">{{ product.Product_Sku || '-' }}</span>
                </td>
                <td class="p-3 text-center">
                  <span :class="['badge rounded-pill px-3 py-2 text-capitalize', statusClass(product.Status)]">
                    {{ String(product.Status || 'unknown').replaceAll('_', ' ') }}
                  </span>
                </td>
                <td class="p-3 text-center">
                  <span :class="stockTone(product.Product_Stock)">
                    {{ Number(product.Product_Stock || 0) }}
                  </span>
                </td>
                <td class="p-3 text-center">
                  <button type="button" class="btn btn-sm btn-primary" @click="openAdjustPanel(product)">
                    <iconify-icon icon="lucide:plus" class="me-1"></iconify-icon>
                    Adjust Stock
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 py-3 px-3">
          <span class="text-muted small">
            Showing {{ pagination.from || 0 }} to {{ pagination.to || 0 }} of {{ pagination.total }} entries
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

    <div v-if="selectedProduct" class="stock-panel-backdrop" @click.self="closeAdjustPanel">
      <aside class="stock-panel">
        <div class="d-flex align-items-start justify-content-between gap-3 mb-3">
          <div>
            <p class="text-muted small mb-1">Stock adjustment</p>
            <h6 class="mb-1">{{ selectedProduct.Product_Name }}</h6>
            <div class="text-muted small">{{ selectedProduct.Product_Code || '-' }} / {{ selectedProduct.Product_Sku || '-' }}</div>
          </div>
          <button type="button" class="btn btn-sm btn-light" @click="closeAdjustPanel">
            <iconify-icon icon="lucide:x" class="fs-5"></iconify-icon>
          </button>
        </div>

        <div class="current-stock-box mb-3">
          <span>Current Stock</span>
          <strong>{{ Number(selectedProduct.Product_Stock || 0) }}</strong>
        </div>

        <form class="stock-form" @submit.prevent="submitAdjustment">
          <div>
            <label class="form-label">Movement</label>
            <select v-model="adjustment.movementType" class="form-select">
              <option value="increase">Increase stock</option>
              <option value="decrease">Decrease stock</option>
              <option value="set">Set exact stock</option>
            </select>
          </div>

          <div v-if="adjustment.movementType !== 'set'">
            <label class="form-label">Quantity</label>
            <input v-model.number="adjustment.quantity" type="number" min="1" step="1" class="form-control">
          </div>

          <div v-else>
            <label class="form-label">New Stock</label>
            <input v-model.number="adjustment.newStock" type="number" min="0" step="1" class="form-control">
          </div>

          <div>
            <label class="form-label">Notes</label>
            <textarea v-model="adjustment.notes" class="form-control" rows="3" placeholder="Optional stock note"></textarea>
          </div>

          <button type="submit" class="btn btn-primary w-100" :disabled="saving">
            <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
            Save Stock
          </button>
        </form>

        <div class="mt-4">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <h6 class="mb-0">Recent Movements</h6>
            <span class="text-muted small">{{ movements.length }} rows</span>
          </div>

          <div v-if="movementsLoading" class="text-muted small py-3">Loading history...</div>
          <div v-else-if="!movements.length" class="text-muted small py-3">No stock history yet.</div>
          <div v-else class="movement-list">
            <div v-for="movement in movements" :key="movement.id" class="movement-row">
              <div>
                <div class="fw-semibold text-capitalize">
                  {{ movement.Movement_Type }} ({{ movement.Quantity_Delta > 0 ? '+' : '' }}{{ movement.Quantity_Delta }})
                </div>
                <div class="text-muted small">
                  {{ movement.Previous_Stock }} to {{ movement.New_Stock }} by {{ movement.Actor_Name || 'system' }}
                </div>
                <div v-if="movement.Notes" class="text-muted small">{{ movement.Notes }}</div>
              </div>
              <span class="text-muted small">{{ formatDate(movement.created_at) }}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.stock-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.summary-tile {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
}

.summary-tile span {
  display: block;
  color: #64748b;
  font-size: 0.78rem;
}

.summary-tile strong {
  display: block;
  margin-top: 0.25rem;
  color: #0f172a;
  font-size: 1.35rem;
}

.stock-filter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(180px, 1fr));
  gap: 0.75rem;
}

.stock-search {
  min-width: 280px;
}

.stock-table th {
  color: #475569;
  font-size: 0.75rem;
  text-transform: uppercase;
}

.category-line {
  color: #0f172a;
  font-weight: 600;
}

.code-pill,
.stock-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
  border-radius: 999px;
  padding: 0.3rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 700;
}

.code-pill {
  background: #f8fafc;
  color: #334155;
  border: 1px solid #e2e8f0;
}

.stock-pill.success {
  background: #ecfdf5;
  color: #047857;
}

.stock-pill.warning {
  background: #fffbeb;
  color: #b45309;
}

.stock-pill.danger {
  background: #fef2f2;
  color: #b91c1c;
}

.stock-panel-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1080;
  display: flex;
  justify-content: flex-end;
  background: rgba(15, 23, 42, 0.45);
}

.stock-panel {
  width: min(520px, 100%);
  height: 100%;
  overflow-y: auto;
  background: #ffffff;
  padding: 1.25rem;
  box-shadow: -20px 0 40px rgba(15, 23, 42, 0.16);
}

.current-stock-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid #bae6fd;
  background: #f0f9ff;
  border-radius: 8px;
  padding: 1rem;
}

.current-stock-box span {
  color: #0369a1;
  font-weight: 600;
}

.current-stock-box strong {
  color: #0c4a6e;
  font-size: 1.8rem;
}

.stock-form {
  display: grid;
  gap: 1rem;
}

.movement-list {
  display: grid;
  gap: 0.65rem;
}

.movement-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.85rem;
}

@media (max-width: 991px) {
  .stock-summary-grid,
  .stock-filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 575px) {
  .stock-summary-grid,
  .stock-filter-grid {
    grid-template-columns: 1fr;
  }

  .stock-search {
    min-width: 100%;
  }

  .movement-row {
    flex-direction: column;
  }
}
</style>
