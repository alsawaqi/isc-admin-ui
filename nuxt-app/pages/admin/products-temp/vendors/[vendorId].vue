<script setup lang="ts">
import { definePageMeta, useNuxtApp } from "#imports"
import { ref, reactive, watch, onMounted, computed } from "vue"
import { useRoute } from "vue-router"
import { useFlashStore } from "~/stores/flashs"

definePageMeta({
  layout: "admin",
  middleware: ["permission"],
  permission: "vendor requests",
})

const { $axios, $r2Url } = useNuxtApp() as any
const route = useRoute()
const flash = useFlashStore()

const vendorId = Number(route.params.vendorId)

type Status = "pending" | "approved" | "rejected" | "all"

interface DefaultImage {
  id: number
  Image_Path: string
  Is_Default: number
}
interface TempProduct {
  id: number
  Temp_Product_Code: string
  Product_Name: string
  Product_Price: number
  Product_Stock: number
  Submission_Status: "pending" | "approved" | "rejected"
  Submitted_At?: string
  approval_sla?: {
    sla_status?: string
    sla_due_at?: string | null
    hours_remaining?: number | null
  }
  default_image?: DefaultImage | null
  defaultImage?: DefaultImage | null
}

const table = reactive({
  page: 1,
  perPage: 10,
  search: "",
  status: "all" as Status,
  sortBy: "Submitted_At",
  sortDir: "desc" as "asc" | "desc",
})

const pagination = ref({
  total: 0,
  from: 0,
  to: 0,
  last_page: 1,
})

const loading = ref(false)
const error = ref<string | null>(null)
const products = ref<TempProduct[]>([])

function imageUrl(path?: string | null) {
  if (!path) return ""
  return `${$r2Url}/${path}`
}

function badgeClass(s: string) {
  if (s === "pending") return "bg-warning text-dark"
  if (s === "approved") return "bg-success"
  if (s === "rejected") return "bg-danger"
  return "bg-secondary"
}

function slaBadgeClass(s?: string) {
  if (s === "overdue") return "bg-danger"
  if (s === "due_soon") return "bg-warning text-dark"
  if (s === "completed") return "bg-success"
  return "bg-secondary"
}

const pageTitle = computed(() => `Vendor #${vendorId} — Temp Products`)

// ---- Bulk approve with commission ----
const selectedIds = ref<number[]>([])
const showBulkApprove = ref(false)
const bulkBusy = ref(false)

const bulkCommissionType = ref<"percent" | "fixed">("percent")
const bulkCommissionValue = ref<number | null>(null)
const bulkCommissionError = ref<string | null>(null)

const pendingProducts = computed(() =>
  products.value.filter((p) => p.Submission_Status === "pending")
)

const allPendingSelected = computed(
  () =>
    pendingProducts.value.length > 0 &&
    pendingProducts.value.every((p) => selectedIds.value.includes(p.id))
)

const toggleSelectAll = () => {
  if (allPendingSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = pendingProducts.value.map((p) => p.id)
  }
}

const toggleRow = (id: number) => {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((x) => x !== id)
  } else {
    selectedIds.value = [...selectedIds.value, id]
  }
}

const openBulkApprove = () => {
  if (selectedIds.value.length === 0) return
  bulkCommissionError.value = null
  showBulkApprove.value = true
}

const validateBulkCommission = (): boolean => {
  bulkCommissionError.value = null
  const v = Number(bulkCommissionValue.value)
  if (bulkCommissionValue.value === null || isNaN(v) || v <= 0) {
    bulkCommissionError.value = "Commission value must be greater than 0."
    return false
  }
  if (bulkCommissionType.value === "percent" && v > 100) {
    bulkCommissionError.value = "Percent commission cannot exceed 100."
    return false
  }
  return true
}

const bulkApprove = async () => {
  if (!validateBulkCommission()) return

  bulkBusy.value = true
  try {
    const { data } = await $axios.post("/api/admin/products-temp/bulk/approve", {
      ids: selectedIds.value,
      commission_type: bulkCommissionType.value,
      commission_value: Number(bulkCommissionValue.value),
    })

    const approvedCount = data?.approved_ids?.length ?? 0
    const failed: { id: number; error: string }[] = data?.failed ?? []

    if (failed.length > 0) {
      flash.warning(
        `Approved ${approvedCount} product(s). Skipped ${failed.length}: ` +
          failed.map((f) => `#${f.id} — ${f.error}`).join("; ")
      )
    } else {
      flash.success(`Approved ${approvedCount} product(s).`)
    }

    showBulkApprove.value = false
    selectedIds.value = []
    bulkCommissionValue.value = null
    await fetchVendorProducts()
  } catch (e: any) {
    const errs = e?.response?.data?.errors
    const firstErr = errs ? (Object.values(errs)[0] as string[])?.[0] : null
    bulkCommissionError.value = firstErr || e?.response?.data?.message || "Bulk approve failed."
  } finally {
    bulkBusy.value = false
  }
}

const fetchVendorProducts = async () => {
  loading.value = true
  error.value = null

  try {
    const { data } = await $axios.get(`/api/admin/products-temp/vendors/${vendorId}`, {
      params: {
        page: table.page,
        per_page: table.perPage,
        search: table.search,
        status: table.status === "all" ? null : table.status,
        sortBy: table.sortBy,
        sortDir: table.sortDir,
      },
    })

    products.value = data.data

    pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message || "Failed to fetch vendor products."
  } finally {
    loading.value = false
  }
}

watch(
  () => [table.page, table.perPage, table.search, table.status, table.sortBy, table.sortDir],
  () => fetchVendorProducts()
)

onMounted(fetchVendorProducts)
</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color:#ef4444">{{ pageTitle }}</h6>

      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg" />
            Dashboard
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">
          <NuxtLink to="/admin/products-temp/vendors" class="hover-text-primary">Temp Requests</NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">Vendor #{{ vendorId }}</li>
      </ul>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>

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

            <select v-model="table.status" class="form-select form-select-sm w-auto">
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <div class="icon-field">
              <input
                type="text"
                class="form-control form-control-sm w-auto"
                placeholder="Search by code/name..."
                v-model="table.search"
              />
              <span class="icon">
                <iconify-icon icon="ion:search-outline" />
              </span>
            </div>
          </div>

          <div class="d-flex gap-2 align-items-center">
            <button
              class="btn btn-sm btn-success"
              :disabled="selectedIds.length === 0 || bulkBusy"
              @click="openBulkApprove"
            >
              Approve selected ({{ selectedIds.length }})
            </button>
            <NuxtLink to="/admin/products-temp" class="btn btn-sm btn-outline-secondary">
              ← Back to Vendors
            </NuxtLink>
          </div>
        </div>

        <div class="card-body">
          <div class="table-responsive table-scroll rounded-3 border shadow-sm">
            <table class="table table-hover table-striped align-middle mb-0 table-sticky">
              <thead class="table-header-gradient text-white">
                <tr class="text-uppercase small">
                  <th class="py-3 px-3" style="width: 2.5rem;">
                    <input
                      type="checkbox"
                      class="form-check-input"
                      :checked="allPendingSelected"
                      :disabled="pendingProducts.length === 0"
                      @change="toggleSelectAll"
                    />
                  </th>
                  <th class="py-3 px-3">S.L</th>
                  <th class="py-3 px-3">Thumbnail</th>
                  <th class="py-3 px-3">Temp Code</th>
                  <th class="py-3 px-3">Product Name</th>
                  <th class="py-3 px-3 text-end">Price</th>
                  <th class="py-3 px-3 text-end">Stock</th>
                  <th class="py-3 px-3">Status</th>
                  <th class="py-3 px-3">SLA</th>
                  <th class="py-3 px-3">Submitted</th>
                  <th class="py-3 px-3 text-center" style="width: 9rem;">Action</th>
                </tr>
              </thead>

              <tbody>
                <tr v-if="loading">
                  <td colspan="11" class="py-4 text-center text-muted">Loading...</td>
                </tr>

                <tr v-else-if="products.length === 0">
                  <td colspan="11" class="py-4 text-center text-muted">No temp products found.</td>
                </tr>

                <tr v-else v-for="(p, index) in products" :key="p.id">
                  <td class="py-2 px-3">
                    <input
                      v-if="p.Submission_Status === 'pending'"
                      type="checkbox"
                      class="form-check-input"
                      :checked="selectedIds.includes(p.id)"
                      @change="toggleRow(p.id)"
                    />
                  </td>
                  <td class="py-2 px-3 text-muted small">{{ index + 1 }}</td>

                  <td class="py-2 px-3">
                    <div class="d-flex align-items-center gap-2">
                      <img
                        v-if="imageUrl((p.defaultImage?.Image_Path || p.default_image?.Image_Path) ?? null)"
                        :src="imageUrl((p.defaultImage?.Image_Path || p.default_image?.Image_Path) ?? null)"
                        class="rounded-3 border"
                        style="height:46px;width:46px;object-fit:cover;"
                      />
                      <div v-else class="rounded-3 border bg-light d-flex align-items-center justify-content-center"
                           style="height:46px;width:46px;">
                        <iconify-icon icon="solar:gallery-outline" class="text-xl text-secondary" />
                      </div>
                    </div>
                  </td>

                  <td class="py-2 px-3">
                    <div class="text-truncate fw-semibold font-monospace" style="max-width: 200px;">
                      {{ p.Temp_Product_Code || "-" }}
                    </div>
                  </td>

                  <td class="py-2 px-3">
                    <div class="fw-semibold text-truncate" style="max-width: 320px;">
                      {{ p.Product_Name || "-" }}
                    </div>
                  </td>

                  <td class="py-2 px-3 text-end text-nowrap">
                    {{ Number(p.Product_Price || 0).toFixed(3) }}
                  </td>

                  <td class="py-2 px-3 text-end text-nowrap">
                    {{ Number(p.Product_Stock || 0) }}
                  </td>

                  <td class="py-2 px-3">
                    <span class="badge rounded-pill" :class="badgeClass(p.Submission_Status)">
                      {{ p.Submission_Status }}
                    </span>
                  </td>

                  <td class="py-2 px-3">
                    <span class="badge rounded-pill" :class="slaBadgeClass(p.approval_sla?.sla_status)">
                      {{ p.approval_sla?.sla_status?.replace('_', ' ') || '-' }}
                    </span>
                    <div class="text-muted small">{{ p.approval_sla?.sla_due_at || '-' }}</div>
                  </td>

                  <td class="py-2 px-3 text-nowrap">
                    {{ p.Submitted_At ? new Date(p.Submitted_At).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "-" }}
                  </td>

                  <td class="py-2 px-3">
                    <div class="d-flex justify-content-center gap-2">
                      <NuxtLink :to="`/admin/products-temp/${p.id}`" class="btn btn-sm btn-success px-3">
                        View
                      </NuxtLink>
                    </div>
                  </td>
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

    <!-- Bulk approve modal: ONE commission applied to all selected -->
    <div v-if="showBulkApprove" class="modal-backdropx">
      <div class="modal-cardx">
        <h6 class="mb-2">Bulk Approve Products</h6>
        <p class="text-muted small mb-3">
          The commission below will be <b>applied to all {{ selectedIds.length }} selected products</b>.
        </p>

        <div v-if="bulkCommissionError" class="alert alert-danger py-2">{{ bulkCommissionError }}</div>

        <div class="mb-3">
          <label class="form-label small">Commission Type</label>
          <select v-model="bulkCommissionType" class="form-select">
            <option value="percent">percent (%)</option>
            <option value="fixed">fixed (OMR per unit)</option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label small">Commission Value</label>
          <input
            v-model.number="bulkCommissionValue"
            type="number"
            min="0"
            :max="bulkCommissionType === 'percent' ? 100 : undefined"
            step="0.001"
            class="form-control"
            :placeholder="bulkCommissionType === 'percent' ? 'e.g. 10 (%)' : 'e.g. 2.500 (OMR per unit)'"
          />
          <div class="text-muted small mt-1">
            {{ bulkCommissionType === 'percent'
              ? 'Percentage of each line subtotal (0 < value ≤ 100).'
              : 'Fixed amount in OMR charged per unit sold (value > 0).' }}
          </div>
        </div>

        <div class="d-flex justify-content-end gap-2">
          <button class="btn btn-light" @click="showBulkApprove = false" :disabled="bulkBusy">Cancel</button>
          <button class="btn btn-success" @click="bulkApprove" :disabled="bulkBusy">
            {{ bulkBusy ? 'Approving...' : `Approve ${selectedIds.length} product(s)` }}
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
</style>
