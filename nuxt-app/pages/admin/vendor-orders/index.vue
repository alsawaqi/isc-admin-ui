<script setup lang="ts">
import { definePageMeta, useNuxtApp } from "#imports"
import { ref, onMounted, computed } from "vue"

definePageMeta({
  layout: "admin",
  middleware: ["permission"],
  permissions: "orders", // change to your permission key
})

const { $axios } = useNuxtApp() as any

const loading = ref(false)
const error = ref<string | null>(null)

const rows = ref<any[]>([])
const page = ref(1)
const perPage = ref(15)
const total = ref(0)

const status = ref("pending") // filter
const needsCommission = ref(true)

const fetchList = async () => {
  loading.value = true
  error.value = null
  try {
    const { data } = await $axios.get("/api/admin/vendor-orders", {
      params: {
        status: status.value,
        per_page: perPage.value,
        page: page.value,
        needs_commission: needsCommission.value ? 1 : 0,
      },
    })

    console.log(data,"data");


    rows.value = data.data || []
    total.value = data.meta?.total || 0
  } catch (e: any) {
    error.value = e?.response?.data?.message || "Failed to load vendor orders."
  } finally {
    loading.value = false
  }
}

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))

onMounted(fetchList)
</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <div>
        <h6 class="fw-semibold mb-1">Vendor Orders (Pending)</h6>
        <div class="text-muted small">Set commission per vendor order</div>
      </div>

      <div class="d-flex gap-2 align-items-center flex-wrap">
        <select v-model="status" class="form-select form-select-sm" style="width: 160px" @change="page=1; fetchList()">
          <option value="pending">pending</option>
          <option value="processing">processing</option>
          <option value="shipped">shipped</option>
          <option value="completed">completed</option>
          <option value="cancelled">cancelled</option>
        </select>

        <label class="d-flex gap-2 align-items-center small">
          <input type="checkbox" v-model="needsCommission" @change="page=1; fetchList()" />
          Needs commission
        </label>

        <button class="btn btn-sm btn-outline-secondary" @click="fetchList" :disabled="loading">
          Refresh
        </button>
      </div>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="loading" class="alert alert-info">Loading...</div>

    <div v-if="!loading" class="card radius-12 overflow-hidden">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table mb-0 align-middle">
            <thead class="table-light">
              <tr>
                <th>Vendor Order</th>
                <th>Order ID</th>
                <th>Vendor</th>
                <th>Sub Total</th>
                <th>Commission</th>
                <th>Status</th>
                <th class="text-end">Action</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="r in rows" :key="r.id">
                <td class="font-monospace">{{ r.Vendor_Order_Code || ("#"+r.id) }}</td>
                <td class="font-monospace">{{ r.Orders_Placed_Id }}</td>
                <td class="font-monospace">{{ r.Vendor_Id }}</td>
                <td>{{ Number(r.Sub_Total || 0).toFixed(3) }}</td>
                <td>
                  <span v-if="r.Commission_Type">
                    {{ r.Commission_Type }} / {{ r.Commission_Value }}
                    <span class="text-muted"> ({{ Number(r.Commission_Amount || 0).toFixed(3) }})</span>
                  </span>
                  <span v-else class="badge bg-warning text-dark">Not set</span>
                </td>
                <td><span class="badge bg-secondary">{{ r.Status }}</span></td>

                <td class="text-end">
                  <NuxtLink :to="`/admin/vendor-orders/${r.id}`" class="btn btn-sm btn-primary">
                    Set commission
                  </NuxtLink>
                </td>
              </tr>

              <tr v-if="rows.length === 0">
                <td colspan="7" class="text-center text-muted py-4">
                  No vendor orders found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="d-flex justify-content-between align-items-center p-3">
          <div class="text-muted small">
            Page {{ page }} / {{ totalPages }} — Total: {{ total }}
          </div>

          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-secondary" :disabled="page<=1" @click="page--; fetchList()">
              Prev
            </button>
            <button class="btn btn-sm btn-outline-secondary" :disabled="page>=totalPages" @click="page++; fetchList()">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
