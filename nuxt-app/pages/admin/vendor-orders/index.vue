<script setup lang="ts">
import { definePageMeta, useNuxtApp } from "#imports"
import { ref, onMounted, computed } from "vue"

definePageMeta({
  layout: "admin",
  middleware: ["permission"],
  permission: "vendor orders",
})

const { $axios } = useNuxtApp() as any

type Tab = "needs" | "awaiting" | "confirmed"

const activeTab = ref<Tab>("needs")

const loading = ref(false)
const error = ref<string | null>(null)

const rows = ref<any[]>([])
const page = ref(1)
const perPage = ref(15)
const total = ref(0)

// Bulk confirm state (Awaiting confirmation tab)
const selectedIds = ref<number[]>([])
const bulkBusy = ref(false)
const confirmBusyId = ref<number | null>(null)
const bulkResult = ref<{ confirmed_count: number; skipped: { id: number; reason: string }[] } | null>(null)
const actionError = ref<string | null>(null)

const fetchList = async () => {
  loading.value = true
  error.value = null
  try {
    let data: any

    if (activeTab.value === "confirmed") {
      const res = await $axios.get("/api/admin/vendor-orders/commissions-set", {
        params: {
          per_page: perPage.value,
          page: page.value,
        },
      })
      data = res.data
    } else {
      const res = await $axios.get("/api/admin/vendor-orders", {
        params: {
          status: activeTab.value === "needs" ? "pending" : "commission_auto",
          needs_commission: activeTab.value === "needs" ? 1 : 0,
          per_page: perPage.value,
          page: page.value,
        },
      })
      data = res.data
    }

    rows.value = data.data || []
    total.value = data.meta?.total || 0

    // Drop selections that are no longer visible
    const visible = new Set(rows.value.map((r: any) => r.id))
    selectedIds.value = selectedIds.value.filter((id) => visible.has(id))
  } catch (e: any) {
    error.value = e?.response?.data?.message || "Failed to load vendor orders."
  } finally {
    loading.value = false
  }
}

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))

const switchTab = (tab: Tab) => {
  if (activeTab.value === tab) return
  activeTab.value = tab
  page.value = 1
  selectedIds.value = []
  bulkResult.value = null
  actionError.value = null
  fetchList()
}

// ---- Awaiting confirmation: selection helpers ----
const allSelected = computed(() =>
  rows.value.length > 0 && rows.value.every((r: any) => selectedIds.value.includes(r.id))
)

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = rows.value.map((r: any) => r.id)
  }
}

const toggleRow = (id: number) => {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((x) => x !== id)
  } else {
    selectedIds.value = [...selectedIds.value, id]
  }
}

// ---- Confirm actions ----
const confirmOne = async (id: number) => {
  actionError.value = null
  bulkResult.value = null
  confirmBusyId.value = id
  try {
    await $axios.post(`/api/admin/vendor-orders/${id}/confirm-commission`)
    await fetchList()
  } catch (e: any) {
    actionError.value = e?.response?.data?.message || "Failed to confirm commission."
  } finally {
    confirmBusyId.value = null
  }
}

const confirmSelected = async () => {
  if (selectedIds.value.length === 0) return
  actionError.value = null
  bulkResult.value = null
  bulkBusy.value = true
  try {
    const { data } = await $axios.post("/api/admin/vendor-orders/bulk/confirm-commission", {
      ids: selectedIds.value,
    })
    bulkResult.value = data.data || { confirmed_count: 0, skipped: [] }
    selectedIds.value = []
    await fetchList()
  } catch (e: any) {
    actionError.value = e?.response?.data?.message || "Bulk confirm failed."
  } finally {
    bulkBusy.value = false
  }
}

const commissionLabel = (r: any) => {
  if (!r.Commission_Type) return null
  if (r.Commission_Type === "percent") return `${Number(r.Commission_Value || 0)}%`
  if (r.Commission_Type === "fixed") return `${Number(r.Commission_Value || 0).toFixed(3)} fixed`
  return r.Commission_Type // e.g. 'auto'
}

onMounted(fetchList)
</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <div>
        <h6 class="fw-semibold mb-1">Vendor Orders</h6>
        <div class="text-muted small">Commission per vendor order — set, confirm, and track</div>
      </div>

      <div class="d-flex gap-2 align-items-center flex-wrap">
        <button class="btn btn-sm btn-outline-secondary" @click="fetchList" :disabled="loading">
          Refresh
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <ul class="nav nav-pills mb-3 gap-2">
      <li class="nav-item">
        <button
          class="nav-link"
          :class="activeTab === 'needs' ? 'active' : ''"
          type="button"
          @click="switchTab('needs')"
        >
          Needs commission
        </button>
      </li>
      <li class="nav-item">
        <button
          class="nav-link"
          :class="activeTab === 'awaiting' ? 'active' : ''"
          type="button"
          @click="switchTab('awaiting')"
        >
          Awaiting confirmation
        </button>
      </li>
      <li class="nav-item">
        <button
          class="nav-link"
          :class="activeTab === 'confirmed' ? 'active' : ''"
          type="button"
          @click="switchTab('confirmed')"
        >
          Confirmed
        </button>
      </li>
    </ul>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="actionError" class="alert alert-danger">{{ actionError }}</div>

    <!-- Bulk confirm result feedback -->
    <div v-if="bulkResult" class="alert" :class="bulkResult.skipped?.length ? 'alert-warning' : 'alert-success'">
      <div class="fw-semibold">
        Confirmed {{ bulkResult.confirmed_count }} vendor order(s).
      </div>
      <div v-if="bulkResult.skipped?.length" class="mt-2">
        <div class="small fw-semibold">Skipped {{ bulkResult.skipped.length }}:</div>
        <ul class="small mb-0">
          <li v-for="s in bulkResult.skipped" :key="s.id">
            #{{ s.id }} — {{ s.reason }}
          </li>
        </ul>
      </div>
    </div>

    <div v-if="loading" class="alert alert-info">Loading...</div>

    <!-- Awaiting confirmation: bulk toolbar -->
    <div
      v-if="!loading && activeTab === 'awaiting'"
      class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2"
    >
      <div class="text-muted small">
        Auto-computed commissions awaiting accountant confirmation.
      </div>
      <button
        class="btn btn-sm btn-success"
        :disabled="bulkBusy || selectedIds.length === 0"
        @click="confirmSelected"
      >
        {{ bulkBusy ? "Confirming..." : `Confirm selected (${selectedIds.length})` }}
      </button>
    </div>

    <div v-if="!loading" class="card radius-12 overflow-hidden">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table mb-0 align-middle">
            <thead class="table-light">
              <tr>
                <th v-if="activeTab === 'awaiting'" style="width: 2.5rem;">
                  <input
                    type="checkbox"
                    class="form-check-input"
                    :checked="allSelected"
                    @change="toggleSelectAll"
                  />
                </th>
                <th>Vendor Order</th>
                <th>Order ID</th>
                <th>Vendor</th>
                <th>Sub Total</th>
                <th>Shipping</th>
                <th>Total</th>
                <th>Commission</th>
                <th v-if="activeTab === 'awaiting'" class="text-end">Commission Amount</th>
                <th>Status</th>
                <th class="text-end">Action</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="r in rows" :key="r.id">
                <td v-if="activeTab === 'awaiting'">
                  <input
                    type="checkbox"
                    class="form-check-input"
                    :checked="selectedIds.includes(r.id)"
                    @change="toggleRow(r.id)"
                  />
                </td>
                <td class="font-monospace">{{ r.Vendor_Order_Code || ("#" + r.id) }}</td>
                <td class="font-monospace">{{ r.Orders_Placed_Id }}</td>
                <td class="font-monospace">{{ r.Vendor_Id }}</td>
                <td>{{ Number(r.Sub_Total || 0).toFixed(3) }}</td>
                <td>{{ Number(r.Shipping || 0).toFixed(3) }}</td>
                <td class="fw-semibold">{{ Number(r.Total || 0).toFixed(3) }}</td>
                <td>
                  <span v-if="r.Commission_Type">
                    {{ commissionLabel(r) }}
                    <span class="text-muted"> ({{ Number(r.Commission_Amount || 0).toFixed(3) }})</span>
                  </span>
                  <span v-else class="badge bg-warning text-dark">Not set</span>
                </td>
                <td v-if="activeTab === 'awaiting'" class="text-end fw-semibold">
                  {{ Number(r.Commission_Amount || 0).toFixed(3) }}
                </td>
                <td><span class="badge bg-secondary">{{ r.Status }}</span></td>

                <td class="text-end">
                  <!-- Needs commission -->
                  <NuxtLink
                    v-if="activeTab === 'needs'"
                    :to="`/admin/vendor-orders/${r.id}`"
                    class="btn btn-sm btn-primary"
                  >
                    Set commission
                  </NuxtLink>

                  <!-- Awaiting confirmation -->
                  <div v-else-if="activeTab === 'awaiting'" class="d-inline-flex gap-2">
                    <button
                      class="btn btn-sm btn-success"
                      :disabled="confirmBusyId === r.id || bulkBusy"
                      @click="confirmOne(r.id)"
                    >
                      {{ confirmBusyId === r.id ? "Confirming..." : "Confirm" }}
                    </button>
                    <NuxtLink :to="`/admin/vendor-orders/${r.id}`" class="btn btn-sm btn-outline-secondary">
                      View / Edit
                    </NuxtLink>
                  </div>

                  <!-- Confirmed -->
                  <div v-else class="d-inline-flex gap-2">
                    <NuxtLink :to="`/admin/vendor-orders/${r.id}`" class="btn btn-sm btn-outline-secondary">
                      View
                    </NuxtLink>
                    <NuxtLink to="/admin/vendor-orders/vendor-payouts" class="btn btn-sm btn-outline-primary">
                      Payouts
                    </NuxtLink>
                  </div>
                </td>
              </tr>

              <tr v-if="rows.length === 0">
                <td :colspan="activeTab === 'awaiting' ? 11 : 9" class="text-center text-muted py-4">
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
