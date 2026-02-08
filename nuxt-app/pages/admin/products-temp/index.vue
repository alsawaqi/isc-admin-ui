<script setup lang="ts">
import { definePageMeta, useNuxtApp } from '#imports'
import { ref, onMounted, watch, reactive } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'products' // change to your permission key
})

const { $axios } = (useNuxtApp() as any)

interface VendorRow {
  Vendor_Id: number
  Vendor_Name: string
  Trade_Name?: string
  Vendor_Code?: string
  requests_count: number
  pending_count: number
  last_submitted_at?: string
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

watch(
  () => [table.page, table.perPage, table.search, table.sortBy, table.sortDir, table.status],
  () => fetchVendors()
)

onMounted(fetchVendors)
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
  </div>
</template>
