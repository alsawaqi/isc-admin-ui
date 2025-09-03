<script setup lang="ts">
definePageMeta({
     layout: 'admin',
     middleware: ['permission'],
     permissions: 'departments'
     
    });

    import {ref , onMounted , computed} from 'vue';


    import SignaturePad from '@/components/SignaturePad.vue'

    const { $axios } = useNuxtApp();

    const Orders_Id = useParam('id');

    const orders = ref<any>([]);

    /** Photos keyed by order detail id */
const linePhotos = ref<Record<number, File[]>>({})
const uploading = ref(false)
const showSignature = ref(false)
const submitting = ref(false)
const signNote = ref('')
const sigRef = ref<InstanceType<typeof SignaturePad> | null>(null)

 

    type OrderLine = {
            id: number
            Quantity: number
            product: {
              Product_Name: string
              Length_cm?:   number | null
              Width_cm?:    number | null
              Height_cm?:   number | null
              Volume_Cbm?:  number | null
              Weight_Kg?:   number | null
        
            }
      }


type BoxSize = {
  id: number
  Shippers_Box_Code: string
  Shippers_Box_Label: string
  Shippers_Box_Length_Cm: number | null
  Shippers_Box_Width_Cm: number | null
  Shippers_Box_Height_Cm: number | null
  Shippers_Box_Max_Weight_Kg: number | null
  Shippers_Box_Volume_Cbm?: number | null // may be null from API; we’ll compute if missing
}


const props = defineProps<{
  items: OrderLine[]
  boxes: BoxSize[]
}>()



const items = computed<OrderLine[]>(() => (orders.value?.orderlist ?? []))


/** when a file input changes */
function onPhotoChange(detailId: number, e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files) return
  linePhotos.value[detailId] = Array.from(files)
}

/** every row must have at least 1 photo */
const allRowsHavePhotos = computed(() =>
  items.value.length > 0 &&
  items.value.every(r => (linePhotos.value[r.id]?.length || 0) > 0)
)

/** upload all photos first (returns array of uploaded records/ids) */
async function uploadAllPackingPhotos() {
  uploading.value = true
  try {
    // Adjust endpoint to your backend. This example uploads each file with order + detail id.
    const uploads: Array<Promise<any>> = []
    for (const row of items.value) {
      const files = linePhotos.value[row.id] || []
      for (const f of files) {
        const fd = new FormData()
        fd.append('file', f)
        fd.append('orders_placed_id', String(Orders_Id))
        fd.append('orders_placed_detail_id', String(row.id))
        uploads.push($axios.post(`/api/orders-placed/${Orders_Id}/packing/photos`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }))
      }
    }
    const results = await Promise.all(uploads)
    // Return whatever your API returns (ids/urls). Flatten simple cases:
    return results.map(r => r.data)
  } finally {
    uploading.value = false
  }
}

/** open signature overlay (after photos ok) */
async function startDispatch() {
  if (!allRowsHavePhotos.value) {
    alert('Please upload at least one photo for every item before dispatch.')
    return
  }
  // Upload first, then open signature
  try {
    await uploadAllPackingPhotos()
    showSignature.value = true
  } catch (e) {
    console.error('Photo upload failed:', e)
    alert('Uploading photos failed. Please try again.')
  }
}

 
// boxes for the selected shipper
const boxes = ref<BoxSize[]>([])

const loadBoxesForShipper = async () => {
  const sid = orders.value?.shipper?.id || orders.value?.Shippers_Id
  if (!sid) return
  // adjust endpoint to your API
  const { data } = await $axios.get(`/api/v1/shipping/shippers/${sid}/boxes`)
  boxes.value = data
}



/* Helpers */
const volFromDimsCbm = (L?: number|null, W?: number|null, H?: number|null) => {
  const l = Number(L||0), w = Number(W||0), h = Number(H||0)
  if (!l || !w || !h) return null
  return (l*w*h) / 1_000_000 // cm³ → m³
}

const normBoxes = computed(() =>
  (boxes.value || []).map(b => {
    const vol = b.Shippers_Box_Volume_Cbm ??
      volFromDimsCbm(b.Shippers_Box_Length_Cm, b.Shippers_Box_Width_Cm, b.Shippers_Box_Height_Cm)
    return {
      ...b,
      _volCbm: Number(vol || 0),
      _maxKg: Number(b.Shippers_Box_Max_Weight_Kg || 0),
      _L: Number(b.Shippers_Box_Length_Cm || 0),
      _W: Number(b.Shippers_Box_Width_Cm || 0),
      _H: Number(b.Shippers_Box_Height_Cm || 0),
    }
  }).filter(b => b._volCbm > 0)
)

/** checks if ONE unit of the product can fit inside by dimensions (if provided). 
 * If product dims are missing, we fall back to volume+weight only.
 */
function fitsOneByDims(prod: OrderLine['product'], box: any) {
  const pL = Number(prod.Length_cm || 0)
  const pW = Number(prod.Width_cm || 0)
  const pH = Number(prod.Height_cm || 0)
  if (!pL || !pW || !pH) return true // no dims → skip dimension gate
  // naive orientation (no rotation optimizer): require all <=
  return pL <= box._L && pW <= box._W && pH <= box._H
}

function bestForItem(item: OrderLine) {
  const volPerUnit = Number(item.product.Volume_Cbm ?? volFromDimsCbm(
    item.product.Length_cm, item.product.Width_cm, item.product.Height_cm
  ) ?? 0)
  const kgPerUnit = Number(item.product.Weight_Kg || 0)

  // Filter boxes that can fit ONE unit by dims+capacity
  const candidates = normBoxes.value
    .filter(b =>
      fitsOneByDims(item.product, b) &&
      (kgPerUnit <= b._maxKg || b._maxKg === 0 || kgPerUnit === 0) && // allow 0 meaning “not set”
      (volPerUnit <= b._volCbm || b._volCbm === 0 || volPerUnit === 0)
    )
    .sort((a,b) => a._volCbm - b._volCbm) // prefer the smallest usable box by volume

  if (!candidates.length) return null

  const chosen = candidates[0]

  // Required boxes by volume/weight (per product, respecting Quantity)
  const totalVol = volPerUnit * Number(item.Quantity || 0)
  const totalKg  = kgPerUnit  * Number(item.Quantity || 0)

  const byVol = chosen._volCbm > 0 ? Math.ceil(totalVol / chosen._volCbm) : 0
  const byKg  = chosen._maxKg  > 0 ? Math.ceil(totalKg  / chosen._maxKg)  : 0

  const boxesNeeded = Math.max(byVol || 0, byKg || 0, item.Quantity > 0 ? 1 : 0)

  // fill % for ONE box (useful for the progress bars preview)
  const fillVolPct = volPerUnit > 0 && chosen._volCbm > 0 ? Math.min(100, (volPerUnit/ chosen._volCbm)*100) : 0
  const fillKgPct  = kgPerUnit  > 0 && chosen._maxKg  > 0 ? Math.min(100, (kgPerUnit / chosen._maxKg )*100) : 0

  return {
    chosen,
    candidates,
    boxesNeeded,
    perBox: { fillVolPct, fillKgPct }
  }
}



const sOf = (it: OrderLine) => bestForItem(it)


    const getorders = async () => {
      try {
      
        const response = await $axios.get(`/api/orders-placed/${Orders_Id}`);
        orders.value = response.data;
        console.log('Orders fetched successfully:', orders.value);
      } catch (error) {
        console.error('Failed to fetch order details:', error);
        return null;
      }
    };


 async function confirmDispatch() {
          if (!sigRef.value || sigRef.value.isEmpty()) {
            alert('Please sign before confirming.')
            return
          }
          submitting.value = true
          try {
            const fd = new FormData()
            // append photos
            for (const row of items.value) {
              const files = linePhotos.value[row.id] || []
              for (const f of files) {
                fd.append(`files[${row.id}][]`, f)
              }
            }
            // signature as data URL
            fd.append('signature', sigRef.value.toDataURL('image/png'))
            if (signNote.value) fd.append('note', signNote.value)

            await $axios.post(`/api/orders-placed/${Orders_Id}/dispatch`, fd, {
              headers: { 'Content-Type': 'multipart/form-data' }
            })

            showSignature.value = false
            navigateTo('/admin/orders/ordersdispatch')
          } catch (e) {
            console.error(e)
            alert('Failed to dispatch order.')
          } finally {
            submitting.value = false
          }
}


    onMounted(async()=>{
       await getorders();
     });
</script>
<template>
  <div class="dashboard-main-body">


    
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
      <h6 class="fw-semibold mb-0">Invoice</h6>
      <ul class="d-flex align-items-center gap-2 small mb-0">
        <li class="fw-medium">
          <NuxtLink to="/admin" class="d-flex align-items-center gap-1">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon fs-5"></iconify-icon>
            Dashboard
          </NuxtLink>
        </li>
        <li>•</li>
        <li class="fw-medium text-muted">Invoice</li>
      </ul>
    </div>


      
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white">
        <div class="d-flex flex-wrap align-items-center justify-content-end gap-2">
         <button
  type="button"
  class="btn btn-sm btn-outline-success"
  :disabled="!allRowsHavePhotos || submitting || uploading"
  @click.prevent="showSignature = true"   
>
  Dispatch
</button>

        </div>
      </div>

      <div class="card-body py-4">
        <div id="invoice" class="mx-auto" style="max-width: 980px;">
          <div class="border rounded-3 overflow-hidden">
            <div class="p-4 border-bottom bg-light d-flex flex-wrap justify-content-between gap-3">
              <div>
                <h3 class="h5 mb-1">Invoice #{{ orders.Transaction_Number }}</h3>
                <div class="small text-muted">Date Issued: {{ orders.created_at }}</div>
              </div>
              <div class="text-end">
                <!-- optional logo -->
                <!-- <img src="/your-logo.png" alt="Logo" class="img-fluid mb-1" style="max-height:48px;"> -->
              </div>
            </div>

            <div class="p-4">
              <div class="row g-4 mb-3">
                <div class="col-md-6">
                  <h6 class="text-uppercase text-muted small mb-2">Issued For</h6>
                  <ul class="list-unstyled small mb-0">
                    <li><span class="text-muted">Name:</span> {{ orders.customer_contact?.Contact_Person_Name || '-' }}</li>
                    <li><span class="text-muted">Address:</span> {{ orders.customer_contact?.Designation || '-' }}</li>
                    <li><span class="text-muted">Phone:</span> {{ orders.customer_contact?.Telephone || '-' }}</li>
                  </ul>
                </div>
                <div class="col-md-6">
                  <h6 class="text-uppercase text-muted small mb-2">Totals</h6>
                  <ul class="list-unstyled small mb-0">
                    <li><span class="text-muted">Total Weight:</span> {{ orders.Shipping_Weight_Kg }} kg</li>
                  </ul>
                </div>
              </div>

              <div class="table-responsive">
                <table class="table table-sm align-middle mb-0">
                  <thead class="table-light">
                    <tr class="text-muted">
                      <th>SL.</th>
                      <th>Items</th>
                      <th class="text-center">Qty</th>
                      <th class="text-end">Unit Price</th>
                      <th class="text-end">Price</th>
                      <th>Shipping Volume (CBM)</th>
                      <th>Shipping Weight (KG)</th>
                      <th>Upload Image</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, index) in orders.orderlist" :key="row.id">
                      <td class="text-muted">{{ index + 1 }}</td>
                      <td>{{ row.product?.Product_Name || '-' }}</td>
                      <td class="text-center">{{ row.Quantity }}</td>
                      <td class="text-end">OMR {{ Number(row.Price || 0).toFixed(3) }}</td>
                      <td class="text-end">OMR {{ Number(row.Subtotal || 0).toFixed(3) }}</td>
                      <td>{{ row.product?.Volume_Cbm ?? '—' }} CBM</td>
                      <td>{{ row.product?.Weight_Kg ?? '—' }} KG</td>
                       <td>
                        <label class="btn btn-outline-secondary btn-sm mb-0">
                          <iconify-icon icon="ion:camera-outline" class="me-1"></iconify-icon>
                          Upload
                          <input type="file" class="d-none" accept="image/*" multiple
                            :id="`file-${index}`"
                            @change="onPhotoChange(row.id, $event)" />
                        </label>
                        <div class="small text-muted mt-1">
                          {{ (linePhotos[row.id]?.length || 0) }} file(s) selected
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

             
            </div>

            <div class="px-4 py-3 bg-light border-top small text-muted d-flex justify-content-between flex-wrap gap-2">
              <div>Invoice created electronically and valid without a signature or seal.</div>
              <div>Kasr Althqt LTljart EST</div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>


  <!-- Signature overlay -->
<div
  v-if="showSignature"
  class="position-fixed top-0 start-0 w-100 h-100"
  style="z-index: 1050; background: rgba(0,0,0,.5);"
>
  <div class="position-absolute top-50 start-50 translate-middle bg-white rounded-3 shadow p-3"
       style="width: min(680px, 95vw);">
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="mb-0">Confirm Dispatch – Signature</h6>
      <button type="button" class="btn-close" aria-label="Close"
              :disabled="submitting" @click="showSignature=false"></button>
    </div>

    <SignaturePad ref="sigRef" :height="220" :width="null" pen-color="#111" background-color="#fff" />

    <div class="mt-2">
      <label class="form-label small mb-1">Note (optional)</label>
      <textarea v-model="signNote" rows="2" class="form-control" placeholder="Add a note…"></textarea>
    </div>

    <div class="d-flex justify-content-end gap-2 mt-3">
      <button type="button" class="btn btn-light" :disabled="submitting" @click="showSignature=false">Cancel</button>
      <button type="button" class="btn btn-success" :disabled="submitting" @click="confirmDispatch">
        {{ submitting ? 'Submitting…' : 'Sign & Dispatch' }}
      </button>
    </div>
  </div>
</div>

</template>
<style scoped>
.box-card.recommended .box-iso {
  animation: float 2.4s ease-in-out infinite;
  will-change: transform;
}
@keyframes float {
  0%,100% { transform: translateY(0) }
  50%     { transform: translateY(-4px) }
}
</style>
