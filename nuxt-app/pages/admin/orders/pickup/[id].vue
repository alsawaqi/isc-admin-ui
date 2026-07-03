<script setup lang="ts">
import { definePageMeta, navigateTo, useNuxtApp, useRoute } from '#imports'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import OrderLineOwnerBadge from '~/components/admin/orders/OrderLineOwnerBadge.vue'
import VendorInfoModal from '~/components/admin/orders/VendorInfoModal.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permission: 'order pickup',
})

const { $axios } = useNuxtApp() as any
const route = useRoute()
const Orders_Id = computed(() => String(route.params.id || ''))

const orders = ref<any>({ orderlist: [] })
const submitting = ref(false)

// vendor info modal (shared, one per page)
const selectedVendor = ref<any>(null)

// -------- collector (pickup handover) form --------
const form = ref({ name: '', contact: '' })
const idFile = ref<File | null>(null)
const idPreview = ref<string | null>(null)
const idFileError = ref<string | null>(null)
const fieldErrors = ref<Record<string, string[]>>({})
const submitError = ref<string | null>(null)

const MAX_ID_FILE_BYTES = 10 * 1024 * 1024 // 10MB (matches backend max:10240)

const alreadyPicked = computed(() => Boolean(orders.value?.Pickup_Person_Name))

const canSubmit = computed(() =>
  Boolean(form.value.name.trim() && form.value.contact.trim() && idFile.value),
)

const invoiceNo = computed(() =>
  orders.value?.invoice_no
  || orders.value?.transaction?.Invoice_No
  || orders.value?.Order_Code
  || '-',
)

const subtotal = computed(() => Number(orders.value?.Sub_Total_Price || 0))
const shippingPrice = computed(() => Number(orders.value?.Shipping_Price || 0))
const vatAmount = computed(() => Number(orders.value?.VAT || orders.value?.Tax || 0))
const grandTotal = computed(() => Number(orders.value?.Total_Price || 0))

function money(value?: number | string | null) {
  return `OMR ${Number(value || 0).toFixed(3)}`
}

function fmt(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-'
}

function lineSku(line: any) {
  return line.product?.Product_Code || line.product?.Product_Master_Code || line.product?.SKU || '-'
}

const collectorName = computed(() => form.value.name.trim() || orders.value?.Pickup_Person_Name || '')
const collectorContact = computed(() => form.value.contact.trim() || orders.value?.Pickup_Person_Contact || '')

const getorders = async () => {
  try {
    const { data } = await $axios.get(`/api/orders-placed/${Orders_Id.value}`)
    orders.value = data
  } catch (error) {
    console.error('Failed to fetch pickup order details:', error)
  }
}

const fieldError = (key: string) => fieldErrors.value[key]?.[0] || null

const onIdFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null

  idFileError.value = null
  if (idPreview.value) {
    URL.revokeObjectURL(idPreview.value)
    idPreview.value = null
  }

  if (!file) {
    idFile.value = null
    return
  }

  if (file.size > MAX_ID_FILE_BYTES) {
    idFile.value = null
    input.value = ''
    idFileError.value = 'The ID file must be 10 MB or smaller.'
    return
  }

  idFile.value = file
  if (file.type.startsWith('image/')) {
    idPreview.value = URL.createObjectURL(file)
  }
}

const completePickup = async () => {
  if (!canSubmit.value || submitting.value) return

  submitting.value = true
  fieldErrors.value = {}
  submitError.value = null

  try {
    const fd = new FormData()
    fd.append('pickup_person_name', form.value.name.trim())
    fd.append('pickup_person_contact', form.value.contact.trim())
    if (idFile.value) fd.append('id_image', idFile.value)

    await $axios.post(`/api/orders-placed/${Orders_Id.value}/pickup-complete`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    navigateTo('/admin/orders/orderspickup')
  } catch (error: any) {
    console.error('Failed to complete pickup order:', error?.response?.data ?? error)
    if (error?.response?.status === 422 && error?.response?.data?.errors) {
      fieldErrors.value = error.response.data.errors
    }
    submitError.value = error?.response?.data?.message || 'Failed to complete pickup order.'
  } finally {
    submitting.value = false
  }
}

// -------- printing (invoice / delivery order) --------
const printMode = ref<'invoice' | 'delivery' | null>(null)

const injectA5Style = () => {
  const id = 'a5-pickup-print-style'
  let style = document.getElementById(id) as HTMLStyleElement | null
  const css = '@page{size:A5 portrait; margin:8mm;}'
  if (style) {
    style.innerHTML = css
  } else {
    style = document.createElement('style')
    style.id = id
    style.media = 'print'
    style.innerHTML = css
    document.head.appendChild(style)
  }
}

const printDoc = async (mode: 'invoice' | 'delivery') => {
  printMode.value = mode
  await nextTick()
  injectA5Style()
  document.body.classList.add('pickup-doc-printing')
  try {
    window.print()
  } finally {
    document.body.classList.remove('pickup-doc-printing')
    printMode.value = null
  }
}

onMounted(getorders)

onBeforeUnmount(() => {
  if (idPreview.value) URL.revokeObjectURL(idPreview.value)
  document.body.classList.remove('pickup-doc-printing')
})
</script>

<template>
  <div class="dashboard-main-body">
    <!-- Screen UI: hidden only while a pickup doc is being printed via the
         buttons (body.pickup-doc-printing). Native browser print (Ctrl+P)
         still prints the on-screen invoice card, like the old printA5 flow. -->
    <div class="pickup-screen-ui">
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h6 class="fw-semibold mb-1">Pickup Order - Collection</h6>
          <div class="small text-muted">
            Invoice <span class="fw-semibold">#{{ invoiceNo }}</span>
            <span class="ms-2">Issued: {{ orders.created_at || '-' }}</span>
          </div>
        </div>
        <ul class="d-flex align-items-center gap-2 small mb-0">
          <li class="fw-medium">
            <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
              <iconify-icon icon="solar:home-smile-angle-outline" class="icon fs-5"></iconify-icon>
              Dashboard
            </NuxtLink>
          </li>
          <li>-</li>
          <li class="fw-medium text-muted">Pickup</li>
        </ul>
      </div>

      <div class="card border-0 shadow-sm">
        <div class="card-header bg-white border-0 py-3 no-print">
          <div class="d-flex flex-wrap align-items-center justify-content-end gap-2">
            <button type="button" class="btn btn-sm btn-danger d-inline-flex align-items-center gap-1" @click="printDoc('invoice')">
              <iconify-icon icon="basil:printer-outline" class="fs-5"></iconify-icon>
              Print invoice
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1" @click="printDoc('delivery')">
              <iconify-icon icon="basil:printer-outline" class="fs-5"></iconify-icon>
              Print delivery order
            </button>
          </div>
        </div>

        <div class="card-body py-4">
          <div id="invoice" class="mx-auto" style="max-width: 980px;">
            <div class="border rounded-3 overflow-hidden">
              <div class="p-4 border-bottom bg-light">
                <div class="d-flex justify-content-between align-items-start gap-3">
                  <div>
                    <h3 class="h5 mb-1">
                      Pickup Invoice <span class="text-muted">#{{ invoiceNo }}</span>
                    </h3>
                    <div class="small text-muted">Date Issued: {{ orders.created_at || '-' }}</div>
                  </div>
                  <div class="text-end">
                    <span class="badge rounded-pill bg-info text-dark">{{ orders.Status || '-' }}</span>
                  </div>
                </div>
              </div>

              <div class="p-4">
                <div class="row g-3 mb-3">
                  <div class="col-md-7">
                    <h6 class="text-uppercase text-muted small mb-2">Customer</h6>
                    <div class="border rounded-3 p-3">
                      <div class="fw-semibold">{{ orders.customer_contact?.Contact_Person_Name || '-' }}</div>
                      <div class="small text-muted">{{ orders.customer_contact?.title_name || orders.customer_contact?.Designation || '-' }}</div>
                      <div class="small text-muted">{{ orders.customer_contact?.Telephone || '-' }}</div>
                    </div>
                  </div>
                  <div class="col-md-5">
                    <h6 class="text-uppercase text-muted small mb-2">Pickup Location</h6>
                    <div class="border rounded-3 p-3">
                      <div class="fw-semibold">
                        {{ orders.location?.Location_Name || orders.location?.Location_Name_Ar || '-' }}
                      </div>
                      <div class="small text-muted">{{ orders.location?.Location_Code || 'Location code not recorded' }}</div>
                    </div>
                  </div>
                </div>

                <div class="table-responsive rounded-3 border">
                  <table class="table table-hover table-striped align-middle mb-0">
                    <thead class="table-light">
                      <tr class="text-muted text-uppercase small">
                        <th style="width:56px;">SL.</th>
                        <th>Items</th>
                        <th style="width:160px;">Owner</th>
                        <th class="text-center" style="width:90px;">Qty</th>
                        <th class="text-end" style="width:140px;">Unit Price</th>
                        <th class="text-end" style="width:140px;">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(order, index) in orders.orderlist" :key="order.id">
                        <td class="text-muted">{{ index + 1 }}</td>
                        <td class="fw-semibold">{{ order.product?.Product_Name || '-' }}</td>
                        <td>
                          <OrderLineOwnerBadge :line="order" @view="selectedVendor = $event" />
                        </td>
                        <td class="text-center">{{ order.Quantity }}</td>
                        <td class="text-end">{{ money(order.Price) }}</td>
                        <td class="text-end">{{ money(order.Subtotal) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="d-flex flex-wrap justify-content-between align-items-center mt-3">
                  <div class="small text-muted">Confirm only after the customer has collected the order.</div>
                  <div class="fs-6">
                    <span class="text-muted me-2">Total:</span>
                    <span class="fw-semibold">{{ money(grandTotal) }}</span>
                  </div>
                </div>
              </div>

              <div class="px-4 py-3 bg-light border-top small text-muted d-flex justify-content-between flex-wrap gap-2">
                <div>Pickup order record generated electronically.</div>
                <div>ISC</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Collector identity + completion -->
      <div class="card border-0 shadow-sm mt-3 no-print">
        <div class="card-header bg-white border-0 py-3">
          <h6 class="mb-0">Complete pickup</h6>
          <div class="small text-muted">
            Record who collected the order. A name, contact, and an ID photo/scan are required before the order can be marked as picked.
          </div>
        </div>

        <div class="card-body pt-0">
          <div v-if="alreadyPicked" class="alert alert-success mb-0">
            <div class="fw-semibold mb-1">Order already collected</div>
            <div class="small">
              Collected by <strong>{{ orders.Pickup_Person_Name }}</strong>
              ({{ orders.Pickup_Person_Contact || '-' }})
              <span v-if="orders.Picked_Up_At"> on {{ fmt(orders.Picked_Up_At) }}</span>.
            </div>
          </div>

          <template v-else>
            <div v-if="submitError" class="alert alert-danger py-2">{{ submitError }}</div>

            <div class="row g-3">
              <div class="col-md-4">
                <label class="form-label fw-semibold" for="pickup-person-name">Collector name <span class="text-danger">*</span></label>
                <input
                  id="pickup-person-name"
                  v-model="form.name"
                  type="text"
                  maxlength="255"
                  class="form-control"
                  :class="{ 'is-invalid': fieldError('pickup_person_name') }"
                  placeholder="Full name as on the ID"
                />
                <div v-if="fieldError('pickup_person_name')" class="invalid-feedback d-block">
                  {{ fieldError('pickup_person_name') }}
                </div>
              </div>

              <div class="col-md-4">
                <label class="form-label fw-semibold" for="pickup-person-contact">Collector contact <span class="text-danger">*</span></label>
                <input
                  id="pickup-person-contact"
                  v-model="form.contact"
                  type="text"
                  maxlength="100"
                  class="form-control"
                  :class="{ 'is-invalid': fieldError('pickup_person_contact') }"
                  placeholder="Phone or email"
                />
                <div v-if="fieldError('pickup_person_contact')" class="invalid-feedback d-block">
                  {{ fieldError('pickup_person_contact') }}
                </div>
              </div>

              <div class="col-md-4">
                <label class="form-label fw-semibold" for="pickup-id-file">ID photo / scan <span class="text-danger">*</span></label>
                <input
                  id="pickup-id-file"
                  type="file"
                  accept="image/*,.pdf"
                  class="form-control"
                  :class="{ 'is-invalid': idFileError || fieldError('id_image') }"
                  @change="onIdFileChange"
                />
                <div class="form-text">JPG, PNG, WEBP, or PDF - max 10 MB. Stored privately.</div>
                <div v-if="idFileError" class="invalid-feedback d-block">{{ idFileError }}</div>
                <div v-if="fieldError('id_image')" class="invalid-feedback d-block">{{ fieldError('id_image') }}</div>
              </div>
            </div>

            <div v-if="idPreview" class="mt-3">
              <div class="small text-muted mb-1">ID preview</div>
              <img :src="idPreview" alt="ID preview" class="id-preview border rounded-3" />
            </div>
            <div v-else-if="idFile" class="mt-3 small text-muted">
              <iconify-icon icon="solar:document-outline" class="me-1"></iconify-icon>
              {{ idFile.name }}
            </div>

            <div class="d-flex justify-content-end mt-3">
              <button
                type="button"
                class="btn btn-success"
                :disabled="!canSubmit || submitting"
                @click.prevent="completePickup"
              >
                <span v-if="submitting" class="spinner-border spinner-border-sm me-1"></span>
                Mark as picked
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Printable documents (hidden on screen; only one is rendered while printing) -->
    <div id="pickup-print-area" aria-hidden="true">
      <div v-if="printMode === 'invoice'" class="print-doc">
        <div class="print-header">
          <div>
            <div class="print-company">ISC</div>
            <div class="print-muted">International Supply Company</div>
          </div>
          <div class="print-doc-title">TAX INVOICE</div>
        </div>

        <table class="print-meta">
          <tbody>
            <tr>
              <td><strong>Invoice No:</strong> {{ invoiceNo }}</td>
              <td class="text-end"><strong>Order:</strong> {{ orders.Order_Code || '-' }}</td>
            </tr>
            <tr>
              <td><strong>Date:</strong> {{ orders.created_at || '-' }}</td>
              <td class="text-end"><strong>Fulfillment:</strong> Local pickup</td>
            </tr>
          </tbody>
        </table>

        <div class="print-block">
          <div class="print-block-title">Customer</div>
          <div>{{ orders.customer_contact?.Contact_Person_Name || '-' }}</div>
          <div class="print-muted">{{ orders.customer_contact?.title_name || orders.customer_contact?.Designation || '-' }}</div>
          <div class="print-muted">{{ orders.customer_contact?.Telephone || '-' }}</div>
          <div v-if="orders.customer_contact?.Email" class="print-muted">{{ orders.customer_contact?.Email }}</div>
        </div>

        <table class="print-table">
          <thead>
            <tr>
              <th style="width:30px;">#</th>
              <th>Item</th>
              <th class="text-center" style="width:50px;">Qty</th>
              <th class="text-end" style="width:90px;">Unit Price</th>
              <th class="text-end" style="width:80px;">VAT</th>
              <th class="text-end" style="width:95px;">Line Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(line, index) in orders.orderlist" :key="line.id">
              <td>{{ index + 1 }}</td>
              <td>{{ line.product?.Product_Name || '-' }}</td>
              <td class="text-center">{{ line.Quantity }}</td>
              <td class="text-end">{{ money(line.Price) }}</td>
              <td class="text-end">{{ money(line.Vat) }}</td>
              <td class="text-end">{{ money(line.Subtotal) }}</td>
            </tr>
          </tbody>
        </table>

        <table class="print-summary">
          <tbody>
            <tr>
              <td>Subtotal</td>
              <td class="text-end">{{ money(subtotal) }}</td>
            </tr>
            <tr>
              <td>Shipping</td>
              <td class="text-end">{{ money(shippingPrice) }}</td>
            </tr>
            <tr>
              <td>VAT</td>
              <td class="text-end">{{ money(vatAmount) }}</td>
            </tr>
            <tr class="print-summary-grand">
              <td>Grand Total</td>
              <td class="text-end">{{ money(grandTotal) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="print-footer">Generated electronically by ISC. Amounts in Omani Rial (OMR).</div>
      </div>

      <div v-else-if="printMode === 'delivery'" class="print-doc">
        <div class="print-header">
          <div>
            <div class="print-company">ISC</div>
            <div class="print-muted">International Supply Company</div>
          </div>
          <div class="print-doc-title">DELIVERY ORDER</div>
        </div>

        <table class="print-meta">
          <tbody>
            <tr>
              <td><strong>DO No:</strong> {{ (orders.Order_Code || '-') + '-DO' }}</td>
              <td class="text-end"><strong>Order:</strong> {{ orders.Order_Code || '-' }}</td>
            </tr>
            <tr>
              <td><strong>Date:</strong> {{ orders.created_at || '-' }}</td>
              <td class="text-end"><strong>Fulfillment:</strong> Local pickup</td>
            </tr>
          </tbody>
        </table>

        <table class="print-table">
          <thead>
            <tr>
              <th style="width:30px;">#</th>
              <th>Item</th>
              <th style="width:120px;">SKU</th>
              <th class="text-center" style="width:60px;">Qty</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(line, index) in orders.orderlist" :key="line.id">
              <td>{{ index + 1 }}</td>
              <td>{{ line.product?.Product_Name || '-' }}</td>
              <td>{{ lineSku(line) }}</td>
              <td class="text-center">{{ line.Quantity }}</td>
            </tr>
          </tbody>
        </table>

        <div class="print-block">
          <div class="print-block-title">Collected by</div>
          <div><strong>Name:</strong> {{ collectorName || '________________________________' }}</div>
          <div><strong>Contact:</strong> {{ collectorContact || '________________________________' }}</div>
        </div>

        <div class="print-block">
          <div>Received the above items in good condition.</div>
        </div>

        <div class="print-signatures">
          <div class="print-signature">
            <div class="print-signature-line"></div>
            <div>Collector signature</div>
            <div class="print-muted">Date: ______________</div>
          </div>
          <div class="print-signature">
            <div class="print-signature-line"></div>
            <div>Staff signature</div>
            <div class="print-muted">Date: ______________</div>
          </div>
        </div>

        <div class="print-footer">Generated electronically by ISC.</div>
      </div>
    </div>

    <VendorInfoModal v-if="selectedVendor" :vendor="selectedVendor" @close="selectedVendor = null" />
  </div>
</template>

<style scoped>
.id-preview {
  max-width: 260px;
  max-height: 180px;
  object-fit: contain;
  background: #f8fafc;
}

@media print {
  .no-print {
    display: none !important;
  }
}
</style>

<style>
/* -------- Pickup print docs (invoice / delivery order) -------- */
/* Hidden on screen; while printing, the body class (set only during
   printDoc on this page) hides everything except #pickup-print-area. */
#pickup-print-area {
  display: none;
}

@media print {
  /* Only while a doc print is in progress: remove the screen UI entirely
     (display:none, not just visibility, so it doesn't create blank pages).
     Without the body class — i.e. native Ctrl+P — the screen UI prints
     normally and #pickup-print-area stays display:none. */
  body.pickup-doc-printing .pickup-screen-ui {
    display: none !important;
  }

  body.pickup-doc-printing * {
    visibility: hidden;
  }

  body.pickup-doc-printing #pickup-print-area,
  body.pickup-doc-printing #pickup-print-area * {
    visibility: visible;
  }

  body.pickup-doc-printing #pickup-print-area {
    display: block;
    position: absolute;
    inset: 0;
    width: 100%;
  }
}

#pickup-print-area .print-doc {
  color: #000;
  font-size: 12px;
  line-height: 1.45;
}

#pickup-print-area .print-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  border-bottom: 2px solid #000;
  padding-bottom: 8px;
  margin-bottom: 10px;
}

#pickup-print-area .print-company {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 1px;
}

#pickup-print-area .print-doc-title {
  font-size: 16px;
  font-weight: 700;
  text-align: right;
  align-self: center;
}

#pickup-print-area .print-muted {
  color: #444;
}

#pickup-print-area .print-meta {
  width: 100%;
  margin-bottom: 10px;
}

#pickup-print-area .print-meta td {
  padding: 1px 0;
}

#pickup-print-area .print-block {
  margin-bottom: 10px;
}

#pickup-print-area .print-block-title {
  font-weight: 700;
  text-transform: uppercase;
  font-size: 11px;
  margin-bottom: 2px;
}

#pickup-print-area .print-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 10px;
}

#pickup-print-area .print-table th,
#pickup-print-area .print-table td {
  border: 1px solid #000;
  padding: 3px 6px;
  vertical-align: top;
}

#pickup-print-area .print-table th {
  text-align: left;
  background: #eee;
}

#pickup-print-area .print-summary {
  width: 55%;
  margin-left: auto;
  border-collapse: collapse;
  margin-bottom: 12px;
}

#pickup-print-area .print-summary td {
  padding: 2px 6px;
  border-bottom: 1px solid #ccc;
}

#pickup-print-area .print-summary-grand td {
  font-weight: 700;
  border-top: 2px solid #000;
  border-bottom: 2px solid #000;
}

#pickup-print-area .text-end {
  text-align: right;
}

#pickup-print-area .text-center {
  text-align: center;
}

#pickup-print-area .print-signatures {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-top: 28px;
}

#pickup-print-area .print-signature {
  flex: 1;
}

#pickup-print-area .print-signature-line {
  border-bottom: 1px solid #000;
  height: 28px;
  margin-bottom: 4px;
}

#pickup-print-area .print-footer {
  margin-top: 14px;
  padding-top: 6px;
  border-top: 1px solid #000;
  font-size: 10px;
  color: #444;
}
</style>
