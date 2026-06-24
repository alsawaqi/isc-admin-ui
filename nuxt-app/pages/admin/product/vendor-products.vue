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
                <th class="p-3 fw-semibold">Status</th>
                <th class="p-3 text-center fw-semibold">Action</th>
              </tr>
            </thead>

            <tbody>
              <tr v-if="loading">
                <td colspan="10" class="p-4 text-center text-muted">Loading vendor products...</td>
              </tr>

              <tr v-else-if="products.length === 0">
                <td colspan="10" class="p-4 text-center text-muted">No vendor products match the selected filters.</td>
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
                  <td class="p-3 fw-semibold">OMR {{ product.Product_Price }}</td>
                  <td class="p-3">
                    <span class="status-pill">{{ product.Status || 'available' }}</span>
                  </td>
                  <td class="p-3 text-center">
                    <NuxtLink :to="`/admin/product/${product.id}`" class="btn-icon-lg bg-green-100 text-green-700">
                      <iconify-icon icon="lucide:edit" class="fs-5"></iconify-icon>
                    </NuxtLink>
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
  </div>
</template>

<style scoped>
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
