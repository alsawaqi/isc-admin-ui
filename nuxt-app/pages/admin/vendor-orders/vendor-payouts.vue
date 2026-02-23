<script setup lang="ts">
import { definePageMeta, useNuxtApp } from "#imports"
import { ref, onMounted, computed } from "vue"

definePageMeta({
  layout: "admin",
  middleware: ["permission"],
  permissions: "orders",
})

const { $axios } = useNuxtApp() as any

type VendorOrder = {
  id: number
  Orders_Placed_Id: number
  Vendor_Id: number
  Vendor_Order_Code?: string | null
  Sub_Total?: number | string | null
  VAT?: number | string | null
  Shipping?: number | string | null
  Total?: number | string | null
  Status?: string | null

  Commission_Type?: "percent" | "fixed" | null
  Commission_Value?: number | string | null
  Commission_Amount?: number | string | null

  Payout_Status?: "unpaid" | "requested" | "paid" | null
  Payout_Amount?: number | string | null
  Payout_At?: string | null
  Payout_Reference?: string | null
}

const loading = ref(false)
const error = ref<string | null>(null)

const rows = ref<VendorOrder[]>([])
const page = ref(1)
const perPage = ref(15)
const total = ref(0)

// Fixed requirements:
const status = ref("commission_set") // must be commission_set
const payoutStatus = ref<"unpaid" | "requested" | "paid">("unpaid")


// payout modal
const payoutOpen = ref(false)
const payoutBusy = ref(false)
const selected = ref<VendorOrder | null>(null)
const payoutReference = ref("")
const payoutAt = ref<string>("") // datetime-local optional

// Search (optional)
const q = ref("")

const fetchList = async () => {
  loading.value = true
  error.value = null

  try {
    const { data } = await $axios.get("/api/admin/vendor-orders/commissions-set", {
      params: {
        page: page.value,
        per_page: perPage.value,
        status: status.value,              // "commission_set"
        payout_status: payoutStatus.value, // unpaid/requested/paid
        q: q.value?.trim() || undefined,
        needs_commission: false,           // IMPORTANT for payout page
      },
    })

    rows.value = data.data || []
    total.value = data.meta?.total || 0
  } catch (e: any) {
    error.value = e?.response?.data?.message || "Failed to load vendor payouts."
  } finally {
    loading.value = false
  }
}

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))

const money = (v: any) => {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n.toFixed(3) : "0.000"
}

const calcPayout = (r: VendorOrder) => {
  const sub = Number(r.Sub_Total ?? 0)
  const comm = Number(r.Commission_Amount ?? 0)
  const amount = sub - comm
  return amount < 0 ? 0 : amount
}



const openPayout = (r: VendorOrder) => {
  selected.value = r
  payoutReference.value = ""
  payoutAt.value = ""
  payoutOpen.value = true
}

const closePayout = () => {
  payoutOpen.value = false
  selected.value = null
}

const confirmPayout = async () => {
  if (!selected.value) return
  payoutBusy.value = true
  error.value = null

  try {
    const payload: any = {
      payout_amount: calcPayout(selected.value), // optional: backend can compute too
    }

    if (payoutReference.value.trim()) payload.reference = payoutReference.value.trim()
    if (payoutAt.value) {
  // "2026-02-23T01:38" -> "2026-02-23 01:38:00"
  payload.payout_at = payoutAt.value.replace("T", " ") + ":00"
}

    await $axios.post(`/api/admin/vendor-orders/${selected.value.id}/payout`, payload)

    // refresh list after success
    closePayout()
    await fetchList()
  } catch (e: any) {
    error.value = e?.response?.data?.message || "Failed to send payout."
  } finally {
    payoutBusy.value = false
  }
}

onMounted(fetchList)
</script>

<template>
  <div class="dashboard-main-body vendor-payouts-page">
    <!-- Header -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <div>
        <ul class="d-flex align-items-center gap-2 mb-2 list-unstyled">
          <li class="fw-medium">
            <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
              <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg" />
              Dashboard
            </NuxtLink>
          </li>
          <li class="text-muted">–</li>
          <li class="fw-medium">Vendor Payouts</li>
        </ul>
        <h6 class="fw-semibold mb-1 page-title">Vendor Payouts (Commission Set)</h6>
        <p class="text-muted small mb-0 desc">
          Orders with <strong>Status = commission_set</strong>. Payout = Sub total − Commission.
        </p>
      </div>

      <div class="filters-row d-flex gap-2 align-items-center flex-wrap">
        <select
          v-model="payoutStatus"
          class="form-select form-select-sm filter-select"
          @change="page = 1; fetchList()"
        >
          <option value="unpaid">Unpaid</option>
          <option value="requested">Requested</option>
          <option value="paid">Paid</option>
        </select>
        <div class="search-wrap">
          <input
            v-model="q"
            class="form-control form-control-sm search-input"
            placeholder="Search code, vendor, order..."
            @keyup.enter="page = 1; fetchList()"
          />
        </div>
        <button
          class="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
          :disabled="loading"
          @click="fetchList"
        >
          <iconify-icon icon="solar:refresh-outline" class="icon" />
          Refresh
        </button>
      </div>
    </div>

    <div v-if="error" class="alert alert-danger d-flex align-items-center gap-2" role="alert">
      <iconify-icon icon="solar:danger-circle-outline" />
      {{ error }}
    </div>

    <!-- Table Card -->
    <div class="card radius-12 overflow-hidden border-0 shadow-sm table-card">
      <div v-if="loading" class="card-body text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="text-muted small mt-2 mb-0">Loading vendor payouts...</p>
      </div>

      <div v-else class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0 align-middle payout-table">
            <thead>
              <tr>
                <th>Vendor Order</th>
                <th>Order ID</th>
                <th>Vendor</th>
                <th class="text-end">Sub Total</th>
                <th>Commission</th>
                <th class="text-end">Payout</th>
                <th>Status</th>
                <th class="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in rows" :key="r.id" class="payout-row">
                <td>
                  <span class="font-monospace fw-medium">{{ r.Vendor_Order_Code || ("#" + r.id) }}</span>
                </td>
                <td class="font-monospace text-muted">{{ r.Orders_Placed_Id }}</td>
                <td class="font-monospace">{{ r.Vendor_Id }}</td>
                <td class="text-end">{{ money(r.Sub_Total) }}</td>
                <td>
                  <span v-if="r.Commission_Type" class="small">
                    {{ r.Commission_Type }} / {{ r.Commission_Value }}
                    <span class="text-muted">({{ money(r.Commission_Amount) }})</span>
                  </span>
                  <span v-else class="badge bg-warning text-dark">Not set</span>
                </td>
                <td class="text-end fw-semibold payout-amount">{{ money(calcPayout(r)) }}</td>
                <td>
                  <span
                    class="badge status-badge"
                    :class="r.Payout_Status === 'paid'
                      ? 'bg-success'
                      : r.Payout_Status === 'requested'
                        ? 'bg-warning text-dark'
                        : 'bg-secondary'"
                  >
                    {{ r.Payout_Status || "unpaid" }}
                  </span>
                  <div v-if="r.Payout_At" class="text-muted small mt-1">
                    {{ new Date(r.Payout_At).toLocaleString() }}
                  </div>
                  <div v-if="r.Payout_Reference" class="text-muted small">Ref: {{ r.Payout_Reference }}</div>
                </td>
                <td class="text-end">
                  <button
                    class="btn btn-sm btn-success action-btn"
                    :disabled="r.Payout_Status === 'paid'"
                    @click="openPayout(r)"
                  >
                    {{ r.Payout_Status === 'paid' ? 'Paid' : 'Send payout' }}
                  </button>
                </td>
              </tr>
              <tr v-if="rows.length === 0">
                <td colspan="8" class="text-center text-muted py-5">
                  <iconify-icon icon="solar:document-text-outline" class="icon empty-icon" />
                  <p class="mb-0 mt-2">No vendor orders found.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination-bar d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div class="text-muted small">
            Page <strong>{{ page }}</strong> of <strong>{{ totalPages }}</strong>
            <span class="ms-1">({{ total }} total)</span>
          </div>
          <div class="d-flex gap-1">
            <button
              class="btn btn-sm btn-outline-secondary"
              :disabled="page <= 1"
              @click="page--; fetchList()"
            >
              Previous
            </button>
            <button
              class="btn btn-sm btn-outline-secondary"
              :disabled="page >= totalPages"
              @click="page++; fetchList()"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Payout Modal -->
    <transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="payoutOpen && selected"
        class="payout-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payout-modal-title"
        @click.self="closePayout"
      >
        <div class="payout-modal-card">
          <div class="payout-modal-header">
            <h6 id="payout-modal-title" class="payout-modal-title">Send Payout</h6>
            <button type="button" class="payout-modal-close" aria-label="Close" @click="closePayout">
              <iconify-icon icon="solar:close-circle-outline" />
            </button>
          </div>

          <div class="payout-modal-body">
            <div class="payout-summary mb-4">
              <div class="payout-summary-item">
                <span class="label">Vendor Order</span>
                <span class="value font-monospace">{{ selected.Vendor_Order_Code || ("#" + selected.id) }}</span>
              </div>
              <div class="payout-summary-item highlight">
                <span class="label">Payout Amount</span>
                <span class="value">{{ money(calcPayout(selected)) }}</span>
              </div>
            </div>

            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label fw-semibold small">Payout Reference (optional)</label>
                <input
                  v-model="payoutReference"
                  type="text"
                  class="form-control form-control-sm radius-8"
                  placeholder="Bank ref / note..."
                />
              </div>
              <div class="col-md-6">
                <label class="form-label fw-semibold small">Payout Date & Time (optional)</label>
                <input
                  v-model="payoutAt"
                  type="datetime-local"
                  class="form-control form-control-sm radius-8"
                />
                <div class="form-text small">Leave empty to use server time.</div>
              </div>
            </div>

            <div v-if="error" class="alert alert-danger py-2 px-3 mt-3 small">{{ error }}</div>
          </div>

          <div class="payout-modal-footer">
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              :disabled="payoutBusy"
              @click="closePayout"
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-sm btn-success d-flex align-items-center gap-2"
              :disabled="payoutBusy"
              @click="confirmPayout"
            >
              <span v-if="payoutBusy" class="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              Confirm payout
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.vendor-payouts-page .page-title {
  color: #0f766e;
}

.vendor-payouts-page .desc {
  font-size: 0.875rem;
}

.filters-row .filter-select {
  width: 140px;
}

.filters-row .search-input {
  width: 220px;
}

.table-card {
  background: #fff;
}

.payout-table thead {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.payout-table thead th {
  font-weight: 600;
  font-size: 0.8125rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: #475569;
  padding: 0.875rem 1rem;
}

.payout-table tbody td {
  padding: 0.875rem 1rem;
  vertical-align: middle;
}

.payout-row:hover {
  background: #f8fafc;
}

.payout-amount {
  color: #0f766e;
}

.status-badge {
  font-size: 0.75rem;
  font-weight: 500;
}

.action-btn {
  min-width: 100px;
}

.pagination-bar {
  padding: 0.875rem 1.25rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.empty-icon {
  font-size: 2.5rem;
  opacity: 0.5;
}

/* Payout Modal */
.payout-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: grid;
  place-items: center;
  z-index: 1050;
  padding: 1rem;
}

.payout-modal-card {
  width: min(520px, 100%);
  max-height: 90vh;
  overflow: auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}

.payout-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.payout-modal-title {
  font-weight: 600;
  font-size: 1.125rem;
  color: #0f172a;
  margin: 0;
}

.payout-modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background: transparent;
  color: #64748b;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.payout-modal-close:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.payout-modal-close .icon {
  font-size: 1.25rem;
}

.payout-modal-body {
  padding: 1.5rem;
}

.payout-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.payout-summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.payout-summary-item .label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.payout-summary-item .value {
  font-weight: 600;
  color: #0f172a;
}

.payout-summary-item.highlight .value {
  font-size: 1.25rem;
  color: #0f766e;
}

.payout-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  background: #fafafa;
  border-radius: 0 0 12px 12px;
}
</style>
