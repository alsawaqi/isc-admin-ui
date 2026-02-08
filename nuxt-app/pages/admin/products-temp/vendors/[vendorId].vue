<script setup lang="ts">
import { definePageMeta, useNuxtApp } from "#imports"
import { ref, reactive, watch, onMounted, computed } from "vue"
import { useRoute } from "vue-router"

definePageMeta({
  layout: "admin",
  middleware: ["permission"],
  permissions: "products_temp",
})

const { $axios, $r2Url } = useNuxtApp() as any
const route = useRoute()

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

const pageTitle = computed(() => `Vendor #${vendorId} — Temp Products`)

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

          <div class="d-flex gap-2">
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
                  <th class="py-3 px-3">S.L</th>
                  <th class="py-3 px-3">Thumbnail</th>
                  <th class="py-3 px-3">Temp Code</th>
                  <th class="py-3 px-3">Product Name</th>
                  <th class="py-3 px-3 text-end">Price</th>
                  <th class="py-3 px-3 text-end">Stock</th>
                  <th class="py-3 px-3">Status</th>
                  <th class="py-3 px-3">Submitted</th>
                  <th class="py-3 px-3 text-center" style="width: 9rem;">Action</th>
                </tr>
              </thead>

              <tbody>
                <tr v-if="loading">
                  <td colspan="9" class="py-4 text-center text-muted">Loading...</td>
                </tr>

                <tr v-else-if="products.length === 0">
                  <td colspan="9" class="py-4 text-center text-muted">No temp products found.</td>
                </tr>

                <tr v-else v-for="(p, index) in products" :key="p.id">
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
  </div>
</template>
