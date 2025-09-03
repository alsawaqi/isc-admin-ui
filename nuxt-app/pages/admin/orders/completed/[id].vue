<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'departments'
})

import { ref, onMounted, computed } from 'vue'
const { $axios } = useNuxtApp()
const route = useRoute()

const Orders_Id = computed(() => String(route.params.id || ''))

// Data shape from API
const order      = ref<any>(null)
const customer   = ref<any>(null)
const shipper    = ref<any>(null)
const details    = ref<any[]>([])
const transaction= ref<any>(null)
const packagesByDetail = ref<Record<number, any[]>>({})
const logs       = ref<any[]>([])

const loading    = ref(false)
const errorMsg   = ref<string | null>(null)

async function load() {
  loading.value = true
  errorMsg.value = null
  try {
    const { data } = await $axios.get(`/api/orders-placed/${Orders_Id.value}/overview`)
    order.value       = data.order
    customer.value    = data.customer_contact
    shipper.value     = data.shipper
    details.value     = data.details || []
    transaction.value = data.transaction || null
    packagesByDetail.value = data.packages_by_detail || {}
    logs.value        = data.logs || []
  } catch (e:any) {
    errorMsg.value = e?.response?.data?.message || e?.message || 'Failed to load.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

// Helpers
const money = (v?: number|null) => `OMR ${Number(v||0).toFixed(3)}`
const fmt   = (d?: string|null) => (d ? new Date(d).toLocaleString() : '—')

// Optional step label mapping for nicer display
const stepLabel: Record<string,string> = {
  ORDER_CONFIRMED: 'Order Confirmed',
  PACKING_CONFIRMED: 'Packing Confirmed',
  DISPATCH_READY: 'Dispatch Ready',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
}
</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
      <h6 class="fw-semibold mb-0">Order Overview</h6>
      <div class="small text-muted">
        <span class="me-2">Order:</span>
        <span class="fw-semibold">{{ order?.Order_Code || '—' }}</span>
        <span class="ms-3 me-2">Txn#:</span>
        <span class="fw-semibold">{{ order?.Transaction_Number || '—' }}</span>
      </div>
    </div>

    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white border-0 py-3">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div class="small">
            <span class="me-3"><strong>Status:</strong> {{ order?.Status || '—' }}</span>
            <span class="me-3"><strong>Shipper:</strong> {{ shipper?.Shippers_Name || '—' }}</span>
            <span><strong>Created:</strong> {{ fmt(order?.created_at) }}</span>
          </div>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-sm btn-outline-secondary">
              <iconify-icon icon="basil:printer-outline" class="me-1"></iconify-icon> Print
            </button>
          </div>
        </div>
      </div>

      <div class="card-body">
        <!-- Tabs -->
        <ul class="nav nav-tabs" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#pane-order" type="button" role="tab">
              Order Details
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" data-bs-toggle="tab" data-bs-target="#pane-transactions" type="button" role="tab">
              Transactions
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" data-bs-toggle="tab" data-bs-target="#pane-packages" type="button" role="tab">
              Packages (Photos)
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" data-bs-toggle="tab" data-bs-target="#pane-log" type="button" role="tab">
              Process Log
            </button>
          </li>
        </ul>

        <div class="tab-content pt-3">
          <!-- Order Details -->
          <div id="pane-order" class="tab-pane fade show active" role="tabpanel">
            <div v-if="loading" class="text-muted small">Loading…</div>
            <div v-else-if="errorMsg" class="alert alert-danger py-2">{{ errorMsg }}</div>
            <div v-else>
              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <h6 class="text-uppercase text-muted small mb-2">Customer</h6>
                  <div class="border rounded-3 p-3">
                    <div class="fw-semibold">{{ customer?.Contact_Person_Name || '—' }}</div>
                    <div class="small text-muted">{{ customer?.Designation || '—' }}</div>
                    <div class="small text-muted">{{ customer?.Telephone || '—' }}</div>
                  </div>
                </div>
                <div class="col-md-6">
                  <h6 class="text-uppercase text-muted small mb-2">Totals</h6>
                  <div class="border rounded-3 p-3">
                    <div class="d-flex justify-content-between small mb-1">
                      <span class="text-muted">Shipping</span><span class="fw-semibold">{{ money(order?.Shipping_Price) }}</span>
                    </div>
                    <div class="d-flex justify-content-between small mb-1">
                      <span class="text-muted">Tax</span><span class="fw-semibold">{{ money(order?.Tax) }}</span>
                    </div>
                    <div class="d-flex justify-content-between small">
                      <span class="text-muted">Total</span><span class="fw-semibold">{{ money(order?.Total_Price) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="table-responsive rounded-3 border">
                <table class="table table-sm align-middle mb-0">
                  <thead class="table-light">
                    <tr class="text-muted">
                      <th>#</th>
                      <th>Item</th>
                      <th class="text-center">Qty</th>
                      <th class="text-end">Unit</th>
                      <th class="text-end">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(d,i) in details" :key="d.id">
                      <td class="text-muted">{{ i+1 }}</td>
                      <td>{{ d.product?.Product_Name || '—' }}</td>
                      <td class="text-center">{{ d.Quantity }}</td>
                      <td class="text-end">{{ money(d.Price) }}</td>
                      <td class="text-end">{{ money(d.Subtotal) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Transactions -->
          <div id="pane-transactions" class="tab-pane fade" role="tabpanel">
            <div v-if="!transaction" class="text-muted small">No sales transactions linked to this order.</div>
            <div v-else>
              <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <h6 class="mb-1">Sales Transaction</h6>
                  <div class="small text-muted">
                    <span class="me-3"><strong>Txn#:</strong> {{ transaction.Transaction_No || transaction.Sales_Transaction_Header_code || '—' }}</span>
                    <span><strong>Date:</strong> {{ fmt(transaction.created_at) }}</span>
                  </div>
                </div>
                <div class="text-end small">
                  <div><span class="text-muted">Bill No:</span> {{ transaction.Bill_No || '—' }}</div>
                  <div><span class="text-muted">Settlement:</span> {{ transaction.Settlement_Code || '—' }}</div>
                </div>
              </div>

              <div v-if="(transaction.details?.length || 0) > 0" class="table-responsive rounded-3 border">
                <table class="table table-sm align-middle mb-0">
                  <thead class="table-light">
                    <tr class="text-muted">
                      <th>#</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th class="text-nowrap">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(t,i) in transaction.details" :key="t.id">
                      <td class="text-muted">{{ i+1 }}</td>
                      <td class="text-capitalize">
                        <span class="badge rounded-pill"
                          :class="{
                            'bg-success': t.Payment_Method==='card',
                            'bg-primary': t.Payment_Method==='transfer',
                            'bg-warning text-dark': t.Payment_Method==='cod',
                            'bg-secondary': !['card','transfer','cod'].includes(t.Payment_Method)
                          }"
                        >{{ t.Payment_Method || '—' }}</span>
                        <span v-if="t.Payment_Method==='card' && t.Card_Brand" class="ms-2 small text-muted">
                          {{ t.Card_Brand }} •••• {{ t.Card_Last4 }}
                        </span>
                        <span v-else-if="t.Payment_Method==='transfer' && t.Transfer_Reference" class="ms-2 small text-muted">
                          Ref: {{ t.Transfer_Reference }}
                        </span>
                      </td>
                      <td>
                        <span class="badge rounded-pill"
                          :class="{
                            'bg-secondary': t.Payment_Status==='pending_authorization',
                            'bg-info': t.Payment_Status==='pending_verification',
                            'bg-success': ['captured','transfer_received','cod_collected','confirmed'].includes(t.Payment_Status),
                            'bg-danger': ['failed','voided','refunded'].includes(t.Payment_Status),
                            'bg-warning text-dark': !t.Payment_Status
                          }"
                        >{{ t.Payment_Status || 'pending' }}</span>
                      </td>
                      <td class="small text-muted">
                        <span v-if="t.Card_Transaction_Id">Txn: {{ t.Card_Transaction_Id }}</span>
                        <span v-else-if="t.Transfer_Received_At">Received: {{ fmt(t.Transfer_Received_At) }}</span>
                        <span v-else-if="t.COD_Collected_At">Collected: {{ fmt(t.COD_Collected_At) }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="text-muted small">No transaction line details.</div>
            </div>
          </div>

          <!-- Packages -->
          <div id="pane-packages" class="tab-pane fade" role="tabpanel">
            <div v-if="!details.length" class="text-muted small">No items.</div>
            <div v-else class="row g-3">
              <div v-for="d in details" :key="d.id" class="col-12">
                <div class="border rounded-3 p-3">
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="fw-semibold">{{ d.product?.Product_Name || 'Item' }}</div>
                    <div class="small text-muted">Detail ID: {{ d.id }}</div>
                  </div>

                  <div v-if="packagesByDetail[d.id]?.length" class="d-flex flex-wrap gap-3">
                    <div v-for="p in packagesByDetail[d.id]" :key="p.id" class="package-thumb">
                      <div class="thumb border rounded-3 overflow-hidden">
                        <img v-if="p.packed" :src="p.packed" alt="packed" />
                        <div v-else class="p-3 small text-muted">No image</div>
                      </div>
                      <div class="small mt-1">
                        <div class="text-muted">By {{ p.packed_by || '—' }}</div>
                        <div class="text-muted">{{ fmt(p.created_at) }}</div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="small text-muted">No package photos uploaded for this line.</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Process Log (timeline) -->
          <div id="pane-log" class="tab-pane fade" role="tabpanel">
            <div v-if="!logs.length" class="text-muted small">No process logs yet.</div>
            <div v-else class="timeline">
              <div v-for="(l,i) in logs" :key="l.id" class="timeline-item">
                <div class="timeline-dot"
                  :class="{
                    'ok': ['done','confirmed','completed','shipped','delivered','processing'].includes((l.status||'').toLowerCase()),
                    'warn': ['pending','in_progress'].includes((l.status||'').toLowerCase()),
                    'err': ['failed','cancelled','error','voided'].includes((l.status||'').toLowerCase())
                  }"
                ></div>
                <div class="timeline-card border rounded-3 p-3">
                  <div class="d-flex justify-content-between align-items-start">
                    <div>
                      <div class="fw-semibold">
                        {{ stepLabel[l.step_code] || l.step_code }}
                        <span class="badge ms-2"
                          :class="{
                            'bg-success': (l.status||'').toLowerCase()==='done' || (l.status||'').toLowerCase()==='confirmed',
                            'bg-primary': (l.status||'').toLowerCase()==='processing',
                            'bg-warning text-dark': (l.status||'').toLowerCase()==='pending',
                            'bg-danger': (l.status||'').toLowerCase()==='failed'
                          }"
                        >{{ l.status }}</span>
                      </div>
                      <div class="small text-muted">
                        {{ l.actor?.name || '—' }} <span v-if="l.actor?.role">({{ l.actor.role }})</span>
                        • {{ fmt(l.created_at) }}
                      </div>
                    </div>
                  </div>

                  <div v-if="l.notes" class="mt-2 small">
                    <span class="text-muted">Notes:</span> {{ l.notes }}
                  </div>

                  <div v-if="l.signature?.url" class="mt-2">
                    <a :href="l.signature.url" target="_blank" class="small">View Signature</a>
                  </div>

                  <div v-if="(l.evidence?.length||0)>0" class="mt-2 d-flex flex-wrap gap-2">
                    <a v-for="(e,ei) in l.evidence" :key="ei" :href="e" target="_blank" class="evidence-thumb">
                      <img :src="e" alt="evidence" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- /Process Log -->
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.package-thumb .thumb { width: 140px; height: 100px; display:flex; align-items:center; justify-content:center; background:#f7f7f9; }
.package-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
.evidence-thumb { width:80px; height:60px; border:1px solid #e5e7eb; border-radius:.5rem; overflow:hidden; }
.evidence-thumb img{ width:100%; height:100%; object-fit:cover; display:block; }

/* Timeline */
.timeline { position: relative; margin-left: 1rem; padding-left: 1.25rem; }
.timeline:before { content:''; position:absolute; left:.4rem; top:0; bottom:0; width:2px; background:#e9ecef; }
.timeline-item { position: relative; margin-bottom: 1rem; }
.timeline-dot { position:absolute; left:-.15rem; top:.5rem; width:.75rem; height:.75rem; border-radius:50%; background:#adb5bd; border:2px solid #fff; box-shadow: 0 0 0 2px #e9ecef; }
.timeline-dot.ok   { background:#22c55e; }  /* green */
.timeline-dot.warn { background:#f59e0b; }  /* amber */
.timeline-dot.err  { background:#ef4444; }  /* red */
.timeline-card { margin-left: .75rem; background:#fff; }
</style>
