<script setup lang="ts">
definePageMeta({
     layout: 'admin',
     middleware: ['permission'],
     permissions: 'departments'
     
    });
 
import { ref, onMounted ,defineEmits, defineProps, watch,nextTick } from 'vue'
const { $axios, $r2Url } = useNuxtApp();


const showSpecModal = ref(false)
let currentProductId: number | null = null

type SpecRow = {
  id?: number | null
  product_specification_description_id: number
  Product_Specification_Description_Name: string
  options: Array<{ id: string; value: string }>
  product_specification_value_id: string // <-- string, not number|null
}




interface Products{
    id: number;
    Product_Name: string;
    created_at: string;
    Product_Price: number;
}

interface ProductSpec {
  id?: number; 
  product_specification_description_id: number;
  Product_Specification_Description_Name: string;
  value: string;
}




const products = ref<Products[]>([]);


const saveResult = ref<null | {
  created: number
  updated: number
  unchanged: number
  enriched_rows: Array<{
    index: number
    action: 'created' | 'updated' | 'unchanged'
    product_name: string
    spec_name: string
    value_label?: string | null
    from_label?: string | null
    to_label?: string | null
  }>
}>(null)

const productSpecs = ref<SpecRow[]>([])

const showBarcodeModal = ref(false)
const productBarcodes = ref<string[]>([])
const currentBarcodeProductId = ref<number | null>(null)

const showImagesModal = ref(false)
const currentImageProductId = ref<number | null>(null)
const productImages = ref<{ id: number; path: string; is_default: boolean }[]>([])

const openImagesModal = async (productId: number) => {
  currentImageProductId.value = productId
  try {
    const res = await $axios.get(`/api/productmaster/${productId}/images`)
    productImages.value = res.data
    showImagesModal.value = true
  } catch (err) {
    console.error('Failed to fetch product images', err)
  }
}

const emit = defineEmits(['close', 'uploaded'])

const props = defineProps<{
  productId: number
  show: boolean
  existingImages: string[]
}>()

 

const files = ref<File[]>([])
const previews = ref<string[]>([])

watch(() => props.show, (val) => {
  if (!val) {
    files.value = []
    previews.value = []
  }
})

const handleFiles = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files) return

  files.value = Array.from(input.files)
  previews.value = files.value.map(file => URL.createObjectURL(file))
}

const submit = async () => {
  const formData = new FormData()
  files.value.forEach(file => formData.append('file[]', file))

  try {
    await $axios.post(`/api/product-images/${props.productId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    emit('uploaded')
    emit('close')
  } catch (err) {
    console.error('Upload failed:', err)
  }
}

const openBarcodeModal = async (productId: number) => {
  currentBarcodeProductId.value = productId
  try {
    const res = await $axios.get(`/api/productmaster/${productId}/barcodes`)
    productBarcodes.value = res.data.length ? res.data : ['']
    showBarcodeModal.value = true
  } catch (err) {
    console.error('Failed to fetch barcodes:', err)
    alert('Failed to load barcodes')
  }
}

const addBarcode = () => {
  productBarcodes.value.push('')
}

const removeBarcode = (index: number) => {
  productBarcodes.value.splice(index, 1)
}

const saveBarcodes = async () => {
  try {
    const formData = new FormData()
    formData.append('barcodes', JSON.stringify(productBarcodes.value.filter(b => b.trim() !== '')))

    await $axios.post(`/api/productmaster/${currentBarcodeProductId.value}/barcodes`, formData)

    alert('Barcodes saved successfully!')
    showBarcodeModal.value = false
  } catch (err: any) {
    // Handle 422 response from Laravel
    if (err?.response?.status === 422 && err?.response?.data?.message) {
      alert(err.response.data.message)
    } else {
      alert('An error occurred while saving barcodes.')
    }
    console.error('Barcode saving error:', err)
  }
}


const openSpecModal = async (productId: number) => {
  currentProductId = productId
  try {
    const res = await $axios.get(`/api/product-specifications/${productId}`)


    productSpecs.value = res.data.map((s: any) => {
  const options = (s.options || []).map((v: any) => ({
    id: String(v.id),
    value: v.value
  }))

  // If null, choose first option (or '' if none)
  let selected = s.product_specification_value_id != null
    ? String(s.product_specification_value_id)
    : (options[0]?.id ?? '')

  // (If the saved id isn’t in options, inject placeholder)
  if (selected && !options.some((o: { id: any; }) => o.id === selected)) {
    const label = s.selected_label ?? `(Saved) #${selected}`
    options.unshift({ id: selected, value: label })
  }

  return {
    id: s.id ?? null,
    product_specification_description_id: Number(s.product_specification_description_id),
    Product_Specification_Description_Name: s.Product_Specification_Description_Name,
    options,
    product_specification_value_id: selected
  }
})


    

    // Debug: confirm types/values
    console.table(productSpecs.value.map(x => ({
      descId: x.product_specification_description_id,
      selected: x.product_specification_value_id,
      selectedType: typeof x.product_specification_value_id,
      optionIds: x.options.map(o => o.id).join(','),
      optionIdTypes: Array.from(new Set(x.options.map(o => typeof o.id))).join(',')
    })))

    await nextTick()
    showSpecModal.value = true
  } catch (err) {
    console.error('Failed to fetch product specs', err)
  }
}

const showSummaryModal = ref(false)

const saveSpecifications = async () => {
  if (!currentProductId) return

  const specsPayload = productSpecs.value
    // only rows with a non-empty selection
    .filter(s => typeof s.product_specification_value_id === 'string' && s.product_specification_value_id.trim() !== '')
    // map and coerce to numbers
    .map(s => ({
      product_specification_description_id: Number(s.product_specification_description_id),
      product_specification_value_id: Number(s.product_specification_value_id)
    }))

  if (specsPayload.length === 0) {
    alert('Please select at least one specification value.')
    return
  }

  // DEBUG: sanity check
  console.table(specsPayload)

  try {
   const { data } =  await $axios.post('/api/product-specifications-update', {
      product_id: currentProductId,
      specifications: specsPayload
    })

       // pull summary for UI
    saveResult.value = {
      created: data?.summary?.created ?? 0,
      updated: data?.summary?.updated ?? 0,
      unchanged: data?.summary?.unchanged ?? 0,
      enriched_rows: data?.summary?.enriched_rows ?? []
    }



    showSpecModal.value = false
     showSummaryModal.value = true
  } catch (err) {
    console.error('Failed to save specs', err)
  }
}


const fetchProducts = async () => {
    try {
        const response = await $axios.get('/api/productmaster');
        products.value = response.data;
        console.log('Products fetched successfully:', response.data);
    } catch (error) {
        console.error('Error fetching products:', error);
    }
};


const deleteProduct = async (id: number) => {
  alert('Are you sure you want to delete this product?');
    if (!confirm('Are you sure you want to delete this product?')) {
        return; // Exit if the user cancels the deletion
    }
    try {
         await $axios.delete(`/api/productmaster/${id}`);
         await fetchProducts(); // Refresh the product list after deletion
    } catch (error) {
        console.error('Error deleting product:', error);
    }
};


onMounted(async() => {
    await fetchProducts();
});

</script>
<template>

    <div class="dashboard-main-body">


          <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
              <h6 class="fw-semibold mb-0" style="color: #ef4444">View Products</h6>
              <ul class="d-flex align-items-center gap-2">
                  <li class="fw-medium">
                      <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
                          <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
                          Dashboard
                      </a>
                  </li>
                  <li>-</li>
                  <li class="fw-medium">View Products</li>
              </ul>
          </div>


 

          <div class="card h-100 p-0 radius-12 overflow-hidden">
              <div class="card">
                  <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
                      <div class="d-flex flex-wrap align-items-center gap-3">
                          <div class="d-flex align-items-center gap-2">
                              <span>Show</span>
                              <select class="form-select form-select-sm w-auto">
                                  <option>10</option>
                                  <option>15</option>
                                  <option>20</option>
                              </select>

                              <select class="form-select form-select-sm w-auto">
                                  <option>Status</option>
                                  <option>Paid</option>
                                  <option>Pending</option>
                              </select>
                          </div>
                          <div class="icon-field">
                              <input type="text" name="#0" class="form-control form-control-sm w-auto" placeholder="Search">
                              <span class="icon">
                                  <iconify-icon icon="ion:search-outline"></iconify-icon>
                              </span>
                          </div>
                      </div>
                    
                  </div>
                  <div class="card-body">

                    <table class="table w-full text-sm text-left text-gray-700 dark:text-gray-300 table-bordered shadow-sm border mb-0">
                        <thead class="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white">
                          <tr>
                            <th scope="col" class="p-3">
                              <div class="form-check style-check flex items-center">
                                <input class="form-check-input" id="serial" type="checkbox">
                                <label class="ms-2 form-check-label" for="serial">S.L</label>
                              </div>
                            </th>
                            <th scope="col" class="p-3">
                              <div class="flex items-center gap-1">Name
                                
                              </div>
                            </th>
                            <th scope="col" class="p-3">
                              <div class="flex items-center gap-1">Created Date
                                
                              </div>
                            </th>
                            <th scope="col" class="p-3">
                              <div class="flex items-center gap-1">Amount
                                
                              </div>
                            </th>
                            <th scope="col" class="p-3 text-center">Edit Specifications</th>
                            <th scope="col" class="p-3 text-center">Edit Barcodes</th>
                            <th scope="col" class="p-3 text-center">Edit Image</th>
                            <th scope="col" class="p-3 text-center">Action</th>
                          </tr>
                        </thead>

                          <tbody>
                            <tr v-for="(product, index) in products" :key="product.id" class="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td class="p-3">
                                <div class="form-check style-check flex items-center">
                                  <input class="form-check-input" type="checkbox">
                                  <label class="ms-2 form-check-label">{{ index + 1 }}</label>
                                </div>
                              </td>
                              <td class="p-3">
                                <div class="flex items-center">
                                  <img src="/public/isc-assets/images/user-list/user-list1.png" alt="" class="w-8 h-8 rounded-lg me-3 object-cover">
                                  {{ product.Product_Name }}
                                </div>
                              </td>
                              <td class="p-3">{{ product.created_at }}</td>
                              <td class="p-3">OMR {{ product.Product_Price }}</td>
                              <td class="p-3 text-center">
                                <a @click.prevent="openSpecModal(product.id)" class="w-8 h-8 bg-yellow-100 text-yellow-600 rounded-full inline-flex items-center justify-center">
                                  <iconify-icon icon="mdi:format-list-bulleted-type"></iconify-icon>
                                </a>
                              </td>
                              <td class="p-3 text-center">
                                <a @click.prevent="openBarcodeModal(product.id)" class="w-8 h-8 bg-blue-100 text-blue-600 rounded-full inline-flex items-center justify-center">
                                  <iconify-icon icon="mdi:barcode-scan"></iconify-icon>
                                </a>
                              </td>
                              <td class="p-3 text-center">
                                <button class="btn btn-sm btn-outline-primary" @click="openImagesModal(product.id)">View Images</button>
                              </td>
                              <td class="p-3 text-center flex gap-1 justify-center">
                                <a href="javascript:void(0)" class="w-8 h-8 bg-primary-100 text-primary-600 rounded-full inline-flex items-center justify-center">
                                  <iconify-icon icon="iconamoon:eye-light"></iconify-icon>
                                </a>
                                <a href="javascript:void(0)" class="w-8 h-8 bg-green-100 text-green-600 rounded-full inline-flex items-center justify-center">
                                  <iconify-icon icon="lucide:edit"></iconify-icon>
                                </a>
                                <a @click.prevent="deleteProduct(product.id)" class="w-8 h-8 bg-red-100 text-red-600 rounded-full inline-flex items-center justify-center">
                                  <iconify-icon icon="mingcute:delete-2-line"></iconify-icon>
                                </a>
                              </td>
                            </tr>
                          </tbody>
                    </table>

                    

                      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-24">
                          <span>Showing 1 to 10 of 12 entries</span>
                          <ul class="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
                              <li class="page-item">
                                  <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base" href="javascript:void(0)">
                                      <iconify-icon icon="ep:d-arrow-left" class="text-xl"></iconify-icon>
                                  </a>
                              </li>
                              <li class="page-item">
                                  <a class="page-link bg-primary-600 text-white fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px" href="javascript:void(0)">1</a>
                              </li>
                              <li class="page-item">
                                  <a class="page-link bg-primary-50 text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px" href="javascript:void(0)">2</a>
                              </li>
                              <li class="page-item">
                                  <a class="page-link bg-primary-50 text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px" href="javascript:void(0)">3</a>
                              </li>
                              <li class="page-item">
                                  <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base" href="javascript:void(0)">
                                      <iconify-icon icon="ep:d-arrow-right" class="text-xl"></iconify-icon>
                                  </a>
                              </li>
                          </ul>
                      </div>
                  </div>
              </div>
          </div>


   </div>


 <teleport to="body">
    <div v-if="showSpecModal">
      <div class="modal-backdrop fade show"></div>
      <div class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.3)">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Edit Specifications</h5>
              <button type="button" class="btn-close" @click="showSpecModal = false"></button>
            </div>

            <div class="modal-body">
              <div v-for="(spec, index) in productSpecs" :key="spec.product_specification_description_id" class="row mb-3 align-items-center">
                <label class="form-label mb-0 col-3">{{ spec.Product_Specification_Description_Name }}</label>
                <div class="col-9">
                 


              <select
                    class="form-select"
                    :key="`${spec.product_specification_description_id}:${spec.product_specification_value_id}`"
                    v-model="spec.product_specification_value_id" 
                    :disabled="spec.options.length === 0"
                  >
                    <option value="" disabled>Select a value</option> <!-- empty string -->
                    <option v-for="opt in spec.options" :key="opt.id" :value="opt.id">
                      {{ opt.value }}
                    </option>
                  </select>

                  <small v-if="spec.options.length === 0" class="text-muted">No values available for this spec.</small>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-secondary" @click="showSpecModal = false">Close</button>
              <button class="btn btn-primary" @click="saveSpecifications">Save</button>
            </div>
          </div>
        </div>
      </div>
    </div>
</teleport>

<teleport to="body">
  <div v-if="showBarcodeModal">
    <div class="modal-backdrop fade show"></div>
    <div class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.3)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Manage Barcodes</h5>
            <button type="button" class="btn-close" @click="showBarcodeModal = false"></button>
          </div>
          <div class="modal-body">
            <div v-for="(barcode, index) in productBarcodes" :key="index" class="d-flex align-items-center gap-2 mb-2">
              <input v-model="productBarcodes[index]" type="text" class="form-control" placeholder="Enter Barcode" />
              <button class="btn btn-sm btn-danger" @click="removeBarcode(index)">×</button>
            </div>
            <button class="btn btn-outline-primary" @click="addBarcode">Add Barcode</button>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showBarcodeModal = false">Close</button>
            <button class="btn btn-primary" @click="saveBarcodes">Save</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</teleport>


<teleport to="body">
    <div v-if="show" class="modal-backdrop fade show"></div>
    <div v-if="show" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.3)">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Upload Product Images</h5>
            <button type="button" class="btn-close" @click="emit('close')"></button>
          </div>
          <div class="modal-body">
            <input type="file" multiple @change="handleFiles" class="form-control" />

            <div class="d-flex flex-wrap mt-3 gap-3">
              <div
                v-for="(image, index) in existingImages"
                :key="'existing-' + index"
                class="border p-2"
              >
                <img :src="`${$r2Url}/` + image" class="img-thumbnail" width="100" height="100" />
              </div>

              <div
                v-for="(preview, index) in previews"
                :key="'preview-' + index"
                class="border p-2"
              >
                <img :src="preview" class="img-thumbnail" width="100" height="100" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="emit('close')">Cancel</button>
            <button class="btn btn-primary" @click="submit">Upload</button>
          </div>
        </div>
      </div>
    </div>
  </teleport>


  <teleport to="body">
  <div v-if="showSummaryModal">
    <div class="modal-backdrop fade show"></div>
    <div class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.3)">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              Specification Update Summary
              <small class="ms-2 text-muted" v-if="saveResult">
                (created: {{ saveResult.created }}, updated: {{ saveResult.updated }}, unchanged: {{ saveResult.unchanged }})
              </small>
            </h5>
            <button type="button" class="btn-close" @click="showSummaryModal = false"></button>
          </div>
          <div class="modal-body">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Specification</th>
                  <th>Action</th>
                  <th class="text-nowrap">Old Value</th>
                  <th class="text-nowrap">New/Value</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in saveResult?.enriched_rows || []" :key="i">
                  <td>{{ r.index + 1 }}</td>
                  <td>{{ r.product_name }}</td>
                  <td>{{ r.spec_name }}</td>
                  <td class="text-capitalize">{{ r.action }}</td>

                  <!-- For updated: show from -> to; for others: show value -->
                  <td>
                    <template v-if="r.action === 'updated'">
                      {{ r.from_label ?? '—' }}
                    </template>
                    <template v-else>—</template>
                  </td>
                  <td>
                    <template v-if="r.action === 'updated'">
                      {{ r.to_label ?? '—' }}
                    </template>
                    <template v-else>
                      {{ r.value_label ?? '—' }}
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary" @click="showSummaryModal = false">OK</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</teleport>




</template>