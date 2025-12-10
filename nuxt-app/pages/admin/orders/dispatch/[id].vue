<script setup lang="ts">
import { definePageMeta, useRoute, navigateTo, useNuxtApp } from '#imports'
import { ref, onMounted, computed } from 'vue'
import SignaturePad from '~/components/SignaturePad.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'departments',
})

const { $axios } = useNuxtApp() as any
const route = useRoute()

// ---- State ----
const Orders_Id = computed(() => String(route.params.id || ''))

const orders = ref<any>({ orderlist: [] })

const showSignature = ref(false)
const submitting = ref(false)
const sigRef = ref<InstanceType<typeof SignaturePad> | null>(null)
const signNote = ref('')

// ---- Modal handlers ----
const openSignatureModal = () => {
  showSignature.value = true
}

const closeSignatureModal = () => {
  showSignature.value = false
  sigRef.value?.clear()
}

// ---- Load order ----
const getorders = async () => {
  try {
    const { data } = await $axios.get(`/api/orders-placed/${Orders_Id.value}`)
    orders.value = data
  } catch (error) {
    console.error('Failed to fetch order details:', error)
  }
}

// ---- Submit shipment (SignaturePad → data URL → JSON) ----
const submitShipment = async () => {
  if (!sigRef.value || sigRef.value.isEmpty()) {
    alert('Please add your signature first.')
    return
  }

  submitting.value = true
  try {
    const dataUrl = sigRef.value.toDataURL('image/png')


        const res = await fetch(dataUrl)
    const blob = await res.blob()


    // 3) Wrap into a File (Laravel will see this as an uploaded file)
    const file = new File([blob], `signature-${Orders_Id.value}.png`, {
      type: 'image/png',
    })

    // 4) Build FormData
    const fd = new FormData()
    fd.append('signature', file)
    if (signNote.value) {
      fd.append('note', signNote.value)
    }

    await $axios.post(`/api/orders-placed/${Orders_Id.value}/shipment`,  fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    closeSignatureModal()
    navigateTo('/admin/orders/ordersdispatch')
  } catch (e) {
    console.error('Shipment failed:', e)
    alert('Failed to confirm shipment.')
  } finally {
    submitting.value = false
  }
}

// ---- Print A5 ----
const printA5 = (orientation: 'portrait' | 'landscape' = 'portrait') => {
  const id = 'a5-orientation-style'
  let s = document.getElementById(id) as HTMLStyleElement | null
  const css = `@page{size:A5 ${orientation}; margin:8mm;}`

  if (s) {
    s.innerHTML = css
  } else {
    s = document.createElement('style')
    s.id = id
    s.media = 'print'
    s.innerHTML = css
    document.head.appendChild(s)
  }

  window.print()
}

onMounted(async () => {
  await getorders()
})
</script>



 <template>
  <div class="dashboard-main-body">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-6">
      <h6 class="font-semibold mb-0 dark:text-white">Invoice</h6>
    </div>

    <div class="card border-0 shadow-sm">
      <!-- Actions -->
      <div class="card-header bg-white border-0 py-3 no-print">
        <div class="d-flex flex-wrap align-items-center justify-content-end gap-2">
          <button
            type="button"
            class="btn btn-sm btn-danger d-inline-flex align-items-center gap-1"
            @click="printA5()"
          >
            <iconify-icon icon="basil:printer-outline" class="fs-5"></iconify-icon>
            Print
          </button>

          <button
            type="button"
            class="btn btn-sm btn-outline-success"
            @click.prevent="openSignatureModal"
          >
            Shipment
          </button>
        </div>
      </div>

      <div class="card-body py-3">
        <div id="invoice" class="mx-auto" style="max-width: 980px;">
          <div class="border rounded-3 overflow-hidden invoice">
            <!-- Brand / Meta -->
            <div class="p-4 border-bottom bg-light">
              <div class="d-flex justify-content-between align-items-start gap-3">
                <div>
                  <h3 class="h5 mb-1 fw-semibold">
                    Invoice
                    <span class="text-muted">
                      #{{ orders.Transaction_Number }}
                      <Qrcode :value="Orders_Id" variant="pixelated" :height="70" :scale="2" />
                    </span>
                  </h3>
                  <div class="small text-muted">
                    Date Issued: {{ new Date(orders.created_at).toLocaleString() }}
                  </div>
                </div>
                <div class="text-end">
                  <img
                    :src="'https://isc-depot.com/images/logonew1.jpg'"
                    alt="Logo"
                    class="img-fluid mb-1"
                    style="max-height:48px;"
                  >
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
                    <li>
                      <span class="text-muted">Name:</span>
                      {{ orders.customer_contact?.Contact_Person_Name || '-' }}
                    </li>
                    <li>
                      <span class="text-muted">Address:</span>
                      {{ orders.customer_contact?.Designation || '-' }}
                    </li>
                    <li>
                      <span class="text-muted">Phone:</span>
                      {{ orders.customer_contact?.Telephone || '-' }}
                    </li>
                  </ul>
                </div>

                <div class="col-md-6">
                  <h6 class="text-uppercase text-muted small mb-2">Invoice Info</h6>
                  <ul class="list-unstyled small mb-0">
                    <li>
                      <span class="text-muted">Order Code:</span>
                      {{ orders.Order_Code }}
                    </li>
                    <li>
                      <span class="text-muted">Issue Date:</span>
                      {{ new Date(orders.created_at).toLocaleDateString() }}
                    </li>
                    <li>
                      <span class="text-muted">Shipper:</span>
                      {{ orders.shipper?.Shippers_Name || '-' }}
                    </li>
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
                      <td class="text-end">
                        OMR {{ Number(line.Price || 0).toFixed(3) }}
                      </td>
                      <td class="text-end">
                        OMR {{ Number(line.Subtotal || 0).toFixed(3) }}
                      </td>
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
                      <tr class="table-light">
                        <th>Total</th>
                        <th class="text-end">
                          OMR {{ Number(orders.Total_Price || 0).toFixed(3) }}
                        </th>
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
      </div>
    </div>

    <!-- Signature overlay -->
    <div v-if="showSignature" class="sig-modal-backdrop">
      <div class="sig-modal" role="dialog" aria-modal="true" aria-label="Signature dialog">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h6 class="mb-0">Sign to confirm shipment</h6>
          <button
            type="button"
            class="btn btn-sm btn-light"
            @click="closeSignatureModal"
          >
            ×
          </button>
        </div>

        <SignaturePad
          ref="sigRef"
          :height="220"
          :lineWidth="2"
          penColor="#111"
          backgroundColor="#fff"
        />

        <div class="d-flex gap-2 mt-3">
          <input
            v-model="signNote"
            class="form-control form-control-sm"
            placeholder="Note (optional)"
          />
          <button type="button" class="btn btn-sm btn-light" @click="sigRef?.clear()">
            Clear
          </button>
          <button type="button" class="btn btn-sm btn-secondary" @click="closeSignatureModal">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-sm btn-success"
            :disabled="submitting"
            @click="submitShipment"
          >
            <span v-if="submitting" class="spinner-border spinner-border-sm me-1"></span>
            Confirm & Sign
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

