<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'departments'
})

import { ref, onMounted, computed } from 'vue'


import SignaturePad from '~/components/SignaturePad.vue'

// state + refs
const showSignature = ref(false)
const submitting = ref(false)
const sigRef = ref<InstanceType<typeof SignaturePad> | null>(null)
const signNote = ref<string>('')   // add this line to define signNote



const showCancel = ref(false)
const cancelling = ref(false)
const cancelNote = ref<string>('')


// open/close
const openSignatureModal = () => { showSignature.value = true }
const closeSignatureModal = () => {
  showSignature.value = false
  sigRef.value?.clear()
}

const { $axios } = useNuxtApp()
const route = useRoute()



 

const Orders_Id = computed(() => String(route.params.id || ''))

// start as an object so template bindings are safe pre-fetch
const orders = ref<any>({ orderlist: [], transaction: null })

// computed subtotal for the invoice table
const subtotal = computed(() =>
  (orders.value?.orderlist || []).reduce(
    (s: number, l: any) => s + Number(l?.Subtotal || 0),
    0
  )
)



// open/close cancel modal
const openCancelModal = () => { showCancel.value = true }
const closeCancelModal = () => { showCancel.value = false; cancelNote.value = '' }

// submit cancellation
const submitCancellation = async () => {
  if (!cancelNote.value.trim()) {
    alert('Please add a brief cancellation reason.')
    return
  }
  cancelling.value = true
  try {
    await $axios.post(`/api/orders-placed/${Orders_Id.value}/cancel`, {
      note: cancelNote.value.trim(),
    })
    closeCancelModal()
    navigateTo('/admin/orders/ordersplaced') // adjust destination if you have a different page
  } catch (e) {
    console.error('Cancellation failed:', e)
    alert('Failed to cancel the order.')
  } finally {
    cancelling.value = false
  }
}

const getorders = async (): Promise<void> => {
  try {
    const { data } = await $axios.get(`/api/orders-placed/${Orders_Id.value}`)
    orders.value = data
    console.log('Orders fetched successfully:', orders.value)
  } catch (error) {
    console.error('Failed to fetch order details:', error)
  }
}

const submitPacking = async () => {
  if (!sigRef.value || sigRef.value.isEmpty()) {
    alert('Please add your signature first.')
    return
  }
  submitting.value = true
  try {
    const dataUrl = sigRef.value.toDataURL('image/png')
    await $axios.post(`/api/orders-placed/${Orders_Id.value}/pack`, {
      signature: dataUrl,
      note: signNote.value || null,
    })
    closeSignatureModal()
    navigateTo('/admin/orders/orderspacking')
  } catch (e) {
    console.error('Pack failed:', e)
    alert('Failed to confirm packing.')
  } finally {
    submitting.value = false
  }
}


const printA5 = (orientation: 'portrait' | 'landscape' = 'portrait') => {
  // allow switching orientation at runtime if you need it
  const id = 'a5-orientation-style'
  let s = document.getElementById(id) as HTMLStyleElement | null
  const css = `@page{size:A5 ${orientation}; margin:8mm;}`
  if (s) s.innerHTML = css
  else {
    s = document.createElement('style')
    s.id = id
    s.media = 'print'
    s.innerHTML = css
    document.head.appendChild(s)
  }
  window.print()
}

 

onMounted(async()=> await getorders())
</script>

<template>

  <div class="dashboard-main-body">

    <div class="flex flex-wrap items-center justify-between gap-2 mb-6">
      <h6 class="font-semibold mb-0 dark:text-white">Invoice List</h6>

    </div>

    <div class="card border-0 shadow-sm">
      <!-- Actions -->
      <div class="card-header bg-white border-0 py-3 no-print">
        <div class="d-flex flex-wrap align-items-center justify-content-end gap-2">
          <a href="javascript:void(0)" class="btn btn-sm btn-primary d-inline-flex align-items-center gap-1">
            <iconify-icon icon="pepicons-pencil:paper-plane" class="fs-5"></iconify-icon> Send Invoice
          </a>
          <a href="javascript:void(0)" class="btn btn-sm btn-warning text-white d-inline-flex align-items-center gap-1">
            <iconify-icon icon="solar:download-linear" class="fs-5"></iconify-icon> Download
          </a>

          <button type="button" class="btn btn-sm btn-danger d-inline-flex align-items-center gap-1"
             @click="printA5()">
            <iconify-icon icon="basil:printer-outline" class="fs-5"></iconify-icon> Print
          </button>
          <button type="button" class="btn btn-sm btn-outline-success" @click.prevent="openSignatureModal">Packing</button>
          <button type="button" class="btn btn-sm btn-outline-danger" @click.prevent="openCancelModal">Cancel</button>
        </div>
      </div>

      <div class="card-body py-3">
        <!-- Tabs -->
        <ul class="nav nav-tabs" id="orderTabs" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active" id="tab-order-details" data-bs-toggle="tab"
              data-bs-target="#pane-order-details" type="button" role="tab" aria-controls="pane-order-details"
              aria-selected="true">
              Order Details
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="tab-transactions" data-bs-toggle="tab" data-bs-target="#pane-transactions"
              type="button" role="tab" aria-controls="pane-transactions" aria-selected="false">
              Transactions
            </button>
          </li>
        </ul>







        <div class="tab-content pt-3" id="orderTabsContent">
          <!-- ===================== ORDER DETAILS (your existing invoice) ===================== -->
          <div class="tab-pane fade show active" id="pane-order-details" role="tabpanel"
            aria-labelledby="tab-order-details" tabindex="0">
            <!-- ======= your existing invoice markup START ======= -->
            <div id="invoice" class="mx-auto" style="max-width: 980px;">
              <div class="border rounded-3 overflow-hidden invoice">
                <!-- Brand / Meta -->
                <div class="p-4 border-bottom bg-light">
                  <div class="d-flex justify-content-between align-items-start gap-3">
                    <div>
                      <h3 class="h5 mb-1 fw-semibold">
                        Invoice <span class="text-muted">#{{ orders.Transaction_Number }}




                          <Qrcode :value="Orders_Id" variant="pixelated" :height="70" :scale="2" />




                        </span>
                      </h3>
                      <div class="small text-muted">Date Issued: {{ new Date(orders.created_at).toLocaleString() }}
                      </div>
                    </div>
                    <div class="text-end">
                      <img :src="'https://isc-depot.com/images/logonew1.jpg'" alt="Logo" class="img-fluid mb-1"
                        style="max-height:48px;">
                      <div class="small text-muted">ISC</div>
                    </div>
                  </div>
                </div>

                <!-- Parties & Info -->
                <div class="p-4">
                  <div class="row g-4 mb-3">
                    <div class="col-md-6">
                      <h6 class="text-uppercase text-muted small mb-2">Issued For</h6>
                      <ul class="list-unstyled small mb-0">
                        <li><span class="text-muted">Name:</span> {{ orders.customer_contact?.Contact_Person_Name || '-'
                          }}</li>
                        <li><span class="text-muted">Address:</span> {{ orders.customer_contact?.Designation || '-' }}
                        </li>
                        <li><span class="text-muted">Phone:</span> {{ orders.customer_contact?.Telephone || '-' }}</li>
                      </ul>
                    </div>
                    <div class="col-md-6">
                      <h6 class="text-uppercase text-muted small mb-2">Invoice Info</h6>
                      <ul class="list-unstyled small mb-0">
                        <li><span class="text-muted">Order Code:</span> {{ orders.Order_Code }}</li>
                        <li><span class="text-muted">Issue Date:</span> {{ new
                          Date(orders.created_at).toLocaleDateString() }}</li>
                        <li><span class="text-muted">Shipment ID:</span> {{ orders.shipper?.Shippers_Name || '-' }}</li>
                      </ul>
                    </div>
                  </div>

                  <!-- Items -->
                  <div class="table-responsive mb-3">
                    <table class="table table-sm align-middle mb-0">
                      <thead class="table-light">
                        <tr class="text-muted">
                          <th>SL.</th>
                          <th>Item</th>
                          <th class="text-center">Qty</th>
                          <th class="text-end">Unit Price</th>
                          <th class="text-end">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(line, i) in orders.orderlist" :key="line.id">
                          <td class="text-muted">{{ i + 1 }}</td>
                          <td>{{ line.product?.Product_Name || '-' }}</td>
                          <td class="text-center">{{ line.Quantity }}</td>
                          <td class="text-end">OMR {{ Number(line.Price || 0).toFixed(3) }}</td>
                          <td class="text-end">OMR {{ Number(line.Subtotal || 0).toFixed(3) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <!-- Totals -->
                  <div class="row align-items-start g-3">
                    <div class="col-md-6">
                      <div class="small text-muted">Thank you for your business.</div>
                    </div>
                    <div class="col-md-6">
                      <table class="table table-sm mb-0">
                        <tbody>
                          <tr>
                            <td class="text-muted">Subtotal</td>
                            <td class="text-end">

                            </td>
                          </tr>
                          <tr v-if="orders.Shipping_Price">
                            <td class="text-muted">Shipping</td>
                            <td class="text-end">OMR {{ Number(orders.Shipping_Price).toFixed(3) }}</td>
                          </tr>
                          <tr v-if="orders.Tax">
                            <td class="text-muted">Tax</td>
                            <td class="text-end">OMR {{ Number(orders.Tax).toFixed(3) }}</td>
                          </tr>
                          <tr class="table-light">
                            <th>Total</th>
                            <th class="text-end">OMR {{ Number(orders.Total_Price || 0).toFixed(3) }}</th>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <!-- Note -->
                <div class="px-4 py-3 bg-light border-top small text-muted">
                  <div class="d-flex justify-content-between flex-wrap gap-2">
                    <div>Invoice was created electronically and is valid without a signature or seal.</div>
                    <div>Kasr Althqt LTljart EST</div>
                  </div>
                </div>
              </div>
            </div>
            <!-- ======= your existing invoice markup END ======= -->
          </div>

          <!-- ===================== TRANSACTIONS TAB ===================== -->
          <div class="tab-pane fade" id="pane-transactions" role="tabpanel" aria-labelledby="tab-transactions"
            tabindex="0">
            <div class="border rounded-3 p-3">
              <div v-if="orders.transaction" class="mb-3">
                <div class="d-flex flex-wrap justify-content-between align-items-start gap-3">
                  <div>
                    <h5 class="mb-1">Sales Transaction</h5>
                    <div class="small text-muted">
                      Transaction No:
                      <span class="fw-semibold">{{ orders.transaction.Sales_Transaction_Header_code || '-' }}
                        <Barcode :value="orders.transaction.Transaction_No" format="CODE128" renderAs="svg" :height="70"
                          :width="20" />
                      </span>
                      <span class="ms-3">Date: {{ orders.transaction.created_at || '-' }}</span>
                    </div>
                  </div>
                  <div class="text-end small">
                    <div><span class="text-muted">Bill No:</span> {{ orders.transaction.Bill_No || '-' }}</div>
                    <div><span class="text-muted">Settlement Code:</span> {{ orders.transaction.Settlement_Code || '-'
                      }}</div>
                  </div>
                </div>
              </div>

              <div v-if="orders.transaction && (orders.transaction.details?.length || 0) > 0" class="table-responsive">
                <table class="table table-sm align-middle mb-0">
                  <thead class="table-light">
                    <tr class="text-muted">
                      
               
                      <th>Payment</th>
                      <th>Status</th>
                      <th class="text-nowrap">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(t, i) in orders.transaction.details" :key="t.id">
                     
                 

                      <!-- Payment method -->
                      <td class="text-capitalize">
                        <span class="badge rounded-pill" :class="{
                          'bg-success': t.Payment_Method === 'card',
                          'bg-primary': t.Payment_Method === 'transfer',
                          'bg-warning text-dark': t.Payment_Method === 'cod',
                          'bg-secondary': !['card', 'transfer', 'cod'].includes(t.Payment_Method)
                        }">
                          {{ t.Payment_Method || '-' }}
                        </span>
                        <!-- extra info inline -->
                        <span v-if="t.Payment_Method === 'card'" class="ms-2 small text-muted">
                          {{ t.Card_Brand || '' }} •••• {{ t.Card_Last4 || '' }}
                        </span>
                        <span v-else-if="t.Payment_Method === 'transfer'" class="ms-2 small text-muted">
                          Ref: {{ t.Transfer_Reference || '-' }}
                        </span>
                        <span v-else-if="t.Payment_Method === 'cod'" class="ms-2 small text-muted">
                          {{ t.COD_Collected ? 'Collected' : 'Pending' }}
                        </span>
                      </td>

                      <!-- Payment status -->
                      <td>
                        <span class="badge rounded-pill" :class="{
                          'bg-secondary': t.Payment_Status === 'pending_authorization',
                          'bg-info': t.Payment_Status === 'pending_verification',
                          'bg-success': ['captured', 'transfer_received', 'cod_collected'].includes(t.Payment_Status),
                          'bg-danger': ['failed', 'voided', 'refunded'].includes(t.Payment_Status),
                          'bg-warning text-dark': !t.Payment_Status
                        }">
                          {{ t.Payment_Status || 'pending' }}
                        </span>
                      </td>

                      <!-- Notes -->
                      <td class="small text-muted">
                        <span v-if="t.Payment_Method === 'card' && t.Card_Transaction_Id">
                          Txn: {{ t.Card_Transaction_Id }}
                        </span>
                        <span v-else-if="t.Payment_Method === 'transfer' && t.Transfer_Received_At">
                          Received: {{ t.Transfer_Received_At }}
                        </span>
                        <span v-else-if="t.Payment_Method === 'cod' && t.COD_Collected_At">
                          Collected: {{ t.COD_Collected_At }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-else class="text-muted small">No sales transactions linked to this order yet.</div>
            </div>
          </div>
        </div>
      </div>
    </div>



  </div>



  <!-- Cancel modal -->
<div v-if="showCancel" class="sig-modal-backdrop">
  <div class="sig-modal" role="dialog" aria-modal="true" aria-label="Cancel dialog">
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="mb-0">Cancel order</h6>
      <button type="button" class="btn btn-sm btn-light" @click="closeCancelModal">×</button>
    </div>

    <div class="mb-2">
      <label class="form-label fw-semibold">Reason / Notes</label>
      <textarea v-model="cancelNote" class="form-control" rows="4" placeholder="Brief reason for cancellation"></textarea>
    </div>

    <div class="d-flex justify-content-end gap-2">
      <button type="button" class="btn btn-sm btn-secondary" @click="closeCancelModal">Close</button>
      <button type="button" class="btn btn-sm btn-danger" :disabled="cancelling" @click="submitCancellation">
        <span v-if="cancelling" class="spinner-border spinner-border-sm me-1"></span>
        Confirm Cancel
      </button>
    </div>
  </div>
</div>


  <div v-if="showSignature" class="sig-modal-backdrop">
  <div class="sig-modal" role="dialog" aria-modal="true" aria-label="Signature dialog">
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="mb-0">Sign to confirm packing</h6>
      <button type="button" class="btn btn-sm btn-light" @click="closeSignatureModal">×</button>
    </div>

    <!-- Your SignaturePad.vue -->
    <SignaturePad ref="sigRef" :height="220" :lineWidth="2" penColor="#111" backgroundColor="#fff" />

    <div class="d-flex gap-2 mt-3">
      <input v-model="signNote" class="form-control form-control-sm" placeholder="Note (optional)" />
      <button type="button" class="btn btn-sm btn-light" @click="sigRef?.clear()">Clear</button>
      <button type="button" class="btn btn-sm btn-secondary" @click="closeSignatureModal">Cancel</button>
      <button type="button" class="btn btn-sm btn-success" :disabled="submitting" @click="submitPacking">
        <span v-if="submitting" class="spinner-border spinner-border-sm me-1"></span>
        Confirm & Sign
      </button>
    </div>
  </div>
  </div>
</template>

<style>
/* -------- A5 print for the #invoice block only -------- */
@media print {
  /* Force A5, tweak to 'landscape' if you prefer */
  @page {
    size: A5 portrait;
    margin: 8mm;           /* printer margins */
  }

  /* Don't print toolbars, buttons, etc. */
  .no-print { display: none !important; }

  /* Hide everything except the invoice */
  body * { visibility: hidden; }
  #invoice, #invoice * { visibility: visible; }

  /* Lift the invoice to fill the page area */
  #invoice {
    position: absolute;
    inset: 0;
    width: 100%;
  }
}


/* Simple overlay */
.sig-modal-backdrop{
  position: fixed; inset: 0; background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 1050; /* above most UI */
}
.sig-modal{
  width: min(640px, 92vw);
  background: #fff; border-radius: .5rem; padding: 1rem;
  box-shadow: 0 12px 40px rgba(0,0,0,.25);
}

/* Nice A5 preview width on screen (optional) */
@media screen {
  #invoice {
    max-width: 148mm;      /* A5 portrait width; use 210mm for landscape */
  }
}
</style>
