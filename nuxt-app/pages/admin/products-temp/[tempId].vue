<script setup lang="ts">
import { definePageMeta, useNuxtApp } from "#imports"
import { ref, onMounted, computed } from "vue"
import { useRoute } from "vue-router"

definePageMeta({
  layout: "admin",
  middleware: ["permission"],
  permissions: "products_temp",
})

const { $axios, $r2Url } = useNuxtApp() as any
const route = useRoute()

const tempId = Number(route.params.tempId)


interface TempSpecDescription {
  id: number
  Product_Specification_Description_Name: string
}

interface TempSpecValue {
  id: number
  value: string
}

interface TempSpecRow {
  id: number
  Product_Temporary_Id: number
  Product_Specification_Description_Id: number
  product_specification_value_id: number
  description?: TempSpecDescription | null
  value?: TempSpecValue | null
}


interface TempImage {
  id: number
  Image_Path: string
  Is_Default: number
}


interface Department {
  id: number
  Product_Department_Name: string
  Product_Department_Name_Ar?: string
}
interface SubDepartment {
  id: number
  Sub_Department_Name: string
  Sub_Department_Name_Ar?: string
}
interface SubSubDepartment {
  id: number
  Product_Sub_Sub_Department_Name: string
  Product_Sub_Sub_Department_Name_Ar?: string
}
interface Brand {
  id: number
  Products_Brands_Name: string
  Products_Brands_Name_Ar?: string
}
interface Manufacture {
  id: number
  Products_Manufacture_Name: string
  Products_Manufacture_Name_Ar?: string
}
interface TypeRow {
  id: number
  Product_Types_Name: string
  Product_Types_Name_Ar?: string
}



interface TempProduct {
  id: number
  Vendor_Id: number
  Temp_Product_Code: string
  Product_Name: string
  Product_Name_Ar: string
  Description: string
  Description_Ar?: string

  Product_Department_Id: number
  Product_Sub_Department_Id: number
  Product_Sub_Sub_Department_Id: number
  Product_Type_Id: number
  Product_Brand_Id?: number | null
  Product_Manufacture_Id?: number | null

  department?: Department | null
subDepartment?: SubDepartment | null
subSubDepartment?: SubSubDepartment | null
brand?: Brand | null
manufacture?: Manufacture | null
type?: TypeRow | null

  Product_Price: number
  Product_Cost?: number | null
  Product_Stock: number

  Weight_Kg?: number | null
  Length_Cm?: number | null
  Width_Cm?: number | null
  Height_Cm?: number | null
  Volume_Cbm?: number | null

  Submission_Status: "pending" | "approved" | "rejected" | "needs_changes"
  Submitted_At?: string
  Reviewed_At?: string
  Rejection_Reason?: string | null

  images: TempImage[]
  defaultImage?: TempImage | null

  // ✅ NEW
  specs?: TempSpecRow[]
}


const loading = ref(false)
const error = ref<string | null>(null)
const product = ref<TempProduct | null>(null)


 

const showApprove = ref(false)
const showReject = ref(false)
const showReview = ref(false)

const rejectReason = ref('')
const reviewNote = ref('')

const busyAction = ref(false)
const actionError = ref<string | null>(null)
const actionSuccess = ref<string | null>(null)

function resetActionToasts() {
  actionError.value = null
  actionSuccess.value = null
}



function imageUrl(path?: string | null) {
  if (!path) return ""
  return `${$r2Url}/${path}`
}

const defaultImg = computed(() => {
  if (!product.value) return null
  return product.value.images?.find(i => i.Is_Default === 1) || product.value.defaultImage || product.value.images?.[0] || null
})

const fetchDetails = async () => {
  loading.value = true
  error.value = null

  try {
    const { data } = await $axios.get(`/api/admin/products-temp/${tempId}`)
    product.value = data.data
  } catch (e: any) {
    error.value = e?.response?.data?.message || "Failed to load temp product."
  } finally {
    loading.value = false
  }
}


async function approveTemp() {
  resetActionToasts()
  busyAction.value = true
  try {
    await $axios.post(`/api/admin/products-temp/${tempId}/approve`)
    actionSuccess.value = 'Approved successfully ✅'
    showApprove.value = false
    await fetchDetails() // your existing fetch
  } catch (e: any) {
    actionError.value = e?.response?.data?.message || e?.message || 'Approve failed'
  } finally {
    busyAction.value = false
  }
}

async function rejectTemp() {
  resetActionToasts()
  if (rejectReason.value.trim().length < 3) {
    actionError.value = 'Reason must be at least 3 characters.'
    return
  }
  busyAction.value = true
  try {
    await $axios.post(`/api/admin/products-temp/${tempId}/reject`, { reason: rejectReason.value })
    actionSuccess.value = 'Rejected successfully ✅'
    showReject.value = false
    rejectReason.value = ''
    await fetchDetails()
  } catch (e: any) {
    actionError.value = e?.response?.data?.message || e?.message || 'Reject failed'
  } finally {
    busyAction.value = false
  }
}

async function reviewTemp() {
  resetActionToasts()
  if (reviewNote.value.trim().length < 3) {
    actionError.value = 'Note must be at least 3 characters.'
    return
  }
  busyAction.value = true
  try {
    await $axios.post(`/api/admin/products-temp/${tempId}/review`, { note: reviewNote.value })
    actionSuccess.value = 'Review saved (Needs changes) ✅'
    showReview.value = false
    reviewNote.value = ''
    await fetchDetails()
  } catch (e: any) {
    actionError.value = e?.response?.data?.message || e?.message || 'Review failed'
  } finally {
    busyAction.value = false
  }
}

onMounted(fetchDetails)
</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color:#ef4444">
        Temp Product #{{ tempId }}
      </h6>

      <div class="d-flex gap-2">
        <NuxtLink
          v-if="product"
          :to="`/admin/products-temp/vendors/${product.Vendor_Id}`"
          class="btn btn-sm btn-outline-secondary"
        >
          ← Back to Vendor Products
        </NuxtLink>
        <NuxtLink to="/admin/products-temp" class="btn btn-sm btn-outline-secondary">
          ← Back to Vendors
        </NuxtLink>
      </div>


      <!-- Buttons near page title -->
<div class="d-flex gap-2 flex-wrap">
  <button class="btn btn-success" @click="showApprove = true">Approve</button>
  <button class="btn btn-warning" @click="showReview = true">Review</button>
  <button class="btn btn-danger"  @click="showReject = true">Reject</button>
</div>

<!-- Toasts -->
<div v-if="actionError" class="alert alert-danger mt-3">{{ actionError }}</div>
<div v-if="actionSuccess" class="alert alert-success mt-3">{{ actionSuccess }}</div>

<!-- Simple overlay modal -->
<div v-if="showApprove" class="modal-backdropx">
  <div class="modal-cardx">
    <h6 class="mb-2">Approve Product</h6>
    <p class="text-muted small mb-3">This will approve and (if enabled) move it to master tables.</p>

    <div class="d-flex justify-content-end gap-2">
      <button class="btn btn-light" @click="showApprove = false" :disabled="busyAction">Cancel</button>
      <button class="btn btn-success" @click="approveTemp" :disabled="busyAction">
        {{ busyAction ? 'Approving...' : 'Approve' }}
      </button>
    </div>
  </div>
</div>

<div v-if="showReview" class="modal-backdropx">
  <div class="modal-cardx">
    <h6 class="mb-2">Review / Request Changes</h6>
    <textarea v-model="reviewNote" class="form-control" rows="4" placeholder="Write notes for the vendor..."></textarea>

    <div class="d-flex justify-content-end gap-2 mt-3">
      <button class="btn btn-light" @click="showReview = false" :disabled="busyAction">Cancel</button>
      <button class="btn btn-warning" @click="reviewTemp" :disabled="busyAction">
        {{ busyAction ? 'Saving...' : 'Save Review' }}
      </button>
    </div>
  </div>
</div>

<div v-if="showReject" class="modal-backdropx">
  <div class="modal-cardx">
    <h6 class="mb-2">Reject Product</h6>
    <textarea v-model="rejectReason" class="form-control" rows="4" placeholder="Rejection reason..."></textarea>

    <div class="d-flex justify-content-end gap-2 mt-3">
      <button class="btn btn-light" @click="showReject = false" :disabled="busyAction">Cancel</button>
      <button class="btn btn-danger" @click="rejectTemp" :disabled="busyAction">
        {{ busyAction ? 'Rejecting...' : 'Reject' }}
      </button>
    </div>
  </div>
</div>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="loading" class="alert alert-info">Loading...</div>

    <div v-if="product" class="row g-3">
      <!-- Images -->
      <div class="col-12 col-lg-5">
        <div class="card radius-12 overflow-hidden h-100">
          <div class="card-header d-flex align-items-center justify-content-between">
            <div class="fw-semibold">Images</div>
            <span class="badge rounded-pill"
            :class="{
                  'bg-warning text-dark': product.Submission_Status === 'pending',
                  'bg-success': product.Submission_Status === 'approved',
                  'bg-danger': product.Submission_Status === 'rejected',
                  'bg-info text-dark': product.Submission_Status === 'needs_changes'
                }"
                >
              {{ product.Submission_Status }}
            </span>
          </div>

          <div class="card-body">
            <div v-if="defaultImg" class="mb-3">
              <img
                :src="imageUrl(defaultImg.Image_Path)"
                class="w-100 rounded-3 border"
                style="height: 320px; object-fit: cover;"
              />
            </div>

            <div v-if="product.images?.length" class="row g-2">
              <div class="col-4" v-for="img in product.images" :key="img.id">
                <div class="position-relative">
                  <img
                    :src="imageUrl(img.Image_Path)"
                    class="w-100 rounded-3 border"
                    style="height: 90px; object-fit: cover;"
                  />
                  <span v-if="img.Is_Default === 1"
                        class="badge bg-primary position-absolute top-0 start-0 m-1">
                    Default
                  </span>
                </div>
              </div>
            </div>

            <div v-else class="text-muted small">No images uploaded.</div>
          </div>
        </div>
      </div>

      <!-- Details -->
      <div class="col-12 col-lg-7">
        <div class="card radius-12 overflow-hidden h-100">
          <div class="card-header">
            <div class="fw-semibold">Product Details</div>
            <div class="text-muted small font-monospace">
              {{ product.Temp_Product_Code || "-" }}
            </div>
          </div>

          <div class="card-body">
            <div class="row g-3">
              <div class="col-12">
                <div class="fw-semibold">Name</div>
                <div>{{ product.Product_Name }}</div>
              </div>

              <div class="col-12">
                <div class="fw-semibold">Arabic Name</div>
                <div>{{ product.Product_Name_Ar }}</div>
              </div>

              <div class="col-12">
                <div class="fw-semibold">Description</div>
                <div class="text-muted">{{ product.Description }}</div>
              </div>

              <div class="col-12" v-if="product.Description_Ar">
                <div class="fw-semibold">Arabic Description</div>
                <div class="text-muted">{{ product.Description_Ar }}</div>
              </div>

              <div class="col-6">
                <div class="fw-semibold">Price</div>
                <div>{{ Number(product.Product_Price || 0).toFixed(3) }}</div>
              </div>

              <div class="col-6">
                <div class="fw-semibold">Stock</div>
                <div>{{ product.Product_Stock }}</div>
              </div>

              <div class="col-12">
                   <hr />
              </div>

              <!-- Category / Type / Brand -->
<div class="col-12">
  <hr />
</div>

<div class="col-6">
  <div class="fw-semibold">Department</div>
  <div>{{ product.department?.Product_Department_Name ?? ("#" + product.Product_Department_Id) }}</div>
</div>

<div class="col-6">
  <div class="fw-semibold">Sub Department</div>
  <div>{{ product.subDepartment?.Sub_Department_Name ?? ("#" + product.Product_Sub_Department_Id) }}</div>
</div>

<div class="col-6">
  <div class="fw-semibold">Sub-Sub Department</div>
  <div>{{ product.subSubDepartment?.Product_Sub_Sub_Department_Name ?? ("#" + product.Product_Sub_Sub_Department_Id) }}</div>
</div>

<div class="col-6">
  <div class="fw-semibold">Type</div>
  <div>{{ product.type?.Product_Types_Name ?? ("#" + product.Product_Type_Id) }}</div>
</div>

<div class="col-6">
  <div class="fw-semibold">Brand</div>
  <div>{{ product.brand?.Products_Brands_Name ?? (product.Product_Brand_Id ? ("#" + product.Product_Brand_Id) : "-") }}</div>
</div>

<div class="col-6">
  <div class="fw-semibold">Manufacture</div>
  <div>{{ product.manufacture?.Products_Manufacture_Name ?? (product.Product_Manufacture_Id ? ("#" + product.Product_Manufacture_Id) : "-") }}</div>
</div>


              <div class="col-12">
                <hr />
              </div>

              <div class="col-6">
                <div class="fw-semibold">Vendor ID</div>
                <div class="font-monospace">{{ product.Vendor_Id }}</div>
              </div>

              <div class="col-6">
                <div class="fw-semibold">Submitted At</div>
                <div>{{ product.Submitted_At ? new Date(product.Submitted_At).toLocaleString() : "-" }}</div>
              </div>

              <div class="col-12" v-if="product.Submission_Status === 'rejected'">
                <div class="fw-semibold text-danger">Rejection Reason</div>
                <div class="text-danger">{{ product.Rejection_Reason || "-" }}</div>
              </div>

              <div class="col-12">
                <hr />
              </div>

              <div class="col-4">
                <div class="fw-semibold">Weight (Kg)</div>
                <div>{{ product.Weight_Kg ?? "-" }}</div>
              </div>

              <div class="col-4">
                <div class="fw-semibold">Volume (CBM)</div>
                <div>{{ product.Volume_Cbm ?? "-" }}</div>
              </div>

              <div class="col-4">
                <div class="fw-semibold">Dimensions</div>
                <div class="text-muted small">
                  {{ product.Length_Cm ?? 0 }} × {{ product.Width_Cm ?? 0 }} × {{ product.Height_Cm ?? 0 }}
                </div>
              </div>

              <div class="col-12">
                <div class="text-muted small">
                  (Next step) we’ll add Approve / Reject / Review actions here.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>



      <div class="col-12" v-if="product?.specs?.length">
  <div class="card radius-12 overflow-hidden">
    <div class="card-header d-flex align-items-center justify-content-between">
      <div class="fw-semibold">Specifications</div>
      <span class="text-muted small">{{ product.specs.length }} item(s)</span>
    </div>

    <div class="card-body">
      <div class="row g-2">
        <div
          v-for="s in product.specs"
          :key="s.id"
          class="col-12 col-md-6"
        >
          <div class="border rounded-3 p-3 h-100">
            <div class="small text-muted">
              {{ s.description?.Product_Specification_Description_Name || ('Desc #' + s.Product_Specification_Description_Id) }}
            </div>
            <div class="fw-semibold">
              {{ s.value?.value || ('Value #' + s.product_specification_value_id) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Optional: show a nice empty state if no specs -->
<div class="col-12" v-else>
  <div class="card radius-12 overflow-hidden">
    <div class="card-header">
      <div class="fw-semibold">Specifications</div>
    </div>
    <div class="card-body">
      <div class="text-muted small">No specifications submitted for this product.</div>
    </div>
  </div>
</div>



    </div>
  </div>
</template>
