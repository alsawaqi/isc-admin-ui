<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import {definePageMeta, useNuxtApp} from '#imports'
definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'departments'
})

const { $axios } = (useNuxtApp() as any)

/** Types **/
interface Department {
  id: number
  Product_Department_Name: string
}
interface SubDepartment {
  id: number
  Sub_Department_Name: string
}
interface SubSubDepartment {
  id: number
  Product_Sub_Sub_Department_Name: string
}
interface Categories {
  product_department_id: number
  product_sub_department_id: number
  product_sub_sub_department_id: number
}
type InputType = 'text' | 'number' | 'select' | 'multiselect' | 'boolean'

interface SpecValueVM {
  id?: number
  value: string
}
interface SpecHeaderVM {
  id?: number
  name: string
  input_type: InputType
  is_required: boolean
  is_active: boolean
  sort_order: number
  values: SpecValueVM[]
  _newVal?: string
}

interface SpecValueVM {
  id?: number
  value: string
  _prev?: string   // last value before editing (for revert)
}


const onValueFocus = (specIndex: number, valueIndex: number) => {
  const v = headers.value[specIndex].values[valueIndex]
  v._prev = v.value
}

const commitValueEdit = (specIndex: number, valueIndex: number) => {
  const spec = headers.value[specIndex]
  const v = spec.values[valueIndex]
  const newVal = (v.value || '').trim()

  // Empty? remove it (and track deletion if it existed)
  if (!newVal) {
    if (v.id) removedValueIds.value.push(v.id)
    spec.values.splice(valueIndex, 1)
    return
  }

  // Prevent duplicates (case-insensitive) inside the same spec
  const dupIndex = spec.values.findIndex(
    (x, i) => i !== valueIndex && x.value.trim().toLowerCase() === newVal.toLowerCase()
  )
  if (dupIndex !== -1) {
    // Revert to previous if duplicate
    v.value = v._prev || v.value
    alert('This value already exists for this specification.')
    return
  }

  v.value = newVal
  v._prev = undefined
}

const onValueKeydown = (e: KeyboardEvent, specIndex: number, valueIndex: number) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    commitValueEdit(specIndex, valueIndex)
  } else if (e.key === 'Escape') {
    // Revert
    const v = headers.value[specIndex].values[valueIndex]
    if (v._prev != null) v.value = v._prev
    v._prev = undefined
    ;(e.target as HTMLInputElement)?.blur()
  }
}

/** Form & state **/
const form = ref<Categories>({
  product_department_id: 0,
  product_sub_department_id: 0,
  product_sub_sub_department_id: 0
})

const departments = ref<Department[]>([])
const subDepartments = ref<SubDepartment[]>([])
const subSubDepartments = ref<SubSubDepartment[]>([])

const headers = ref<SpecHeaderVM[]>([
 
])

// Track deletes (existing DB rows only)
const removedDescIds = ref<number[]>([])
const removedValueIds = ref<number[]>([])

/** Fetch masters **/
const fetchDepartments = async () => {
  const res = await $axios.get('/api/productdepartment/all')
  departments.value = res.data
}

const fetchSubDepartments = async () => {
  if (!form.value.product_department_id) return
  const res = await $axios.get(`/api/sub-departments/${form.value.product_department_id}`)
  subDepartments.value = res.data.sub_departments
}

const fetchSubSubDepartments = async () => {
  if (!form.value.product_sub_department_id) return
  const res = await $axios.get(`/api/sub-sub-departments/${form.value.product_sub_department_id}`)
  subSubDepartments.value = res.data
} 



 




/** Fetch existing specs + values for selected sub-sub-dept **/
const fetchSpecs = async () => {
  const subSubId = form.value.product_sub_sub_department_id
  if (!subSubId) return
  const res = await $axios.get('/api/product-specification', {
    params: { sub_sub_category_id: subSubId }
  })
   //Expect [{id,name,input_type,is_required,is_active,sort_order,values:[{id,value}]}]
  headers.value = (res.data || []).map((d: any): SpecHeaderVM => ({
    id: d.id,
    name: d.name,
    input_type: d.input_type,
    is_required: !!d.is_required,
    is_active: !!d.is_active,
    sort_order: Number(d.sort_order ?? 0),
    values: (d.values || []).map((v: any) => ({ id: v.id, value: v.value })),
    _newVal: ''
  }))
  removedDescIds.value = []
  removedValueIds.value = []
}



const submitSpecs = async () => {
  try {
    await $axios.put('/api/product-specifications/bulk', {
      sub_sub_category_id: form.value.product_sub_sub_department_id,
      specs: headers.value.map(h => ({
        id: h.id ?? null,
        name: h.name.trim(),
        input_type: h.input_type,
        is_required: h.is_required,
        is_active: h.is_active,
        sort_order: h.sort_order || 0,
        values: h.values
          .map(v => ({ id: v.id ?? null, value: (v.value || '').trim() }))
          .filter(v => v.value !== '')
      })),
      remove_description_ids: removedDescIds.value,
      remove_value_ids: removedValueIds.value
    })
    alert('Saved')
    await fetchSpecs()
  } catch (e) {
    console.error('Save error:', e)
    alert('Failed to save')
  }
}
 

const removeSpecHeader = (index: number) => {
  const h = headers.value[index]
  if (h?.id) removedDescIds.value.push(h.id)
  headers.value.splice(index, 1)
}

const removeSpecValue = (specIndex: number, valueIndex: number) => {
  const val = headers.value[specIndex].values[valueIndex]
  if (val?.id) removedValueIds.value.push(val.id)
  headers.value[specIndex].values.splice(valueIndex, 1)
}

/** Disable rules **/
const isSubmitDisabled = computed(() => {
  if (!form.value.product_sub_sub_department_id) return true
  if (headers.value.length === 0) return true
  if (headers.value.every(h => h.name.trim() === '')) return true
  // Allowed values are optional for any input_type as per your latest requirement
  return false
})

 

/** Watchers **/
watch(() => form.value.product_department_id, async () => {
 await fetchSubDepartments()
  // Reset downstream
  form.value.product_sub_department_id = 0
  form.value.product_sub_sub_department_id = 0
  
})

watch(() => form.value.product_sub_department_id, async () => {
  await fetchSubSubDepartments()
  // Reset downstream
 
})

watch(() => form.value.product_sub_sub_department_id, async () => {
  await fetchSpecs()
})

/** Init **/
onMounted(async () => {
  await fetchDepartments()
})
</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #4345e3">Products Features Description</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">Products Features Description</li>
      </ul>
    </div>

    <!-- Category selection -->
    <div class="card h-100 p-0 radius-12 overflow-hidden">
      <div class="card-body p-40">
        <p v-if="isSubmitDisabled" class="text-danger mt-2">
          Please select a sub sub category and enter at least one feature name.
        </p>

        <div class="col-lg-12">
          <div class="card-header">
            <h5 class="card-title mb-0">Create / Edit Products Descriptions</h5>
          </div>

          <div class="card-body">
            <div class="col-md-12">
              <label class="form-label">Category</label>
              <select class="form-select" v-model="form.product_department_id" required>
                <option disabled value="0">Select Category</option>
                <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                  {{ dept.Product_Department_Name }}
                </option>
              </select>
            </div>

            <div class="col-md-12">
              <label class="form-label">Sub Category</label>
              <select class="form-select" v-model="form.product_sub_department_id" required>
                <option disabled value="0">Select Sub Category</option>
                <option v-for="sub in subDepartments" :key="sub.id" :value="sub.id">
                  {{ sub.Sub_Department_Name }}
                </option>
              </select>
            </div>

            <div class="col-md-12">
              <label class="form-label">Sub Sub Category</label>
              <select class="form-select" v-model="form.product_sub_sub_department_id" required>
                <option disabled value="0">Select Sub Sub Category</option>
                <option v-for="subsub in subSubDepartments" :key="subsub.id" :value="subsub.id">
                  {{ subsub.Product_Sub_Sub_Department_Name }}
                </option>
              </select>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Headers + values editor -->
    <div class="dashboard-main-body">
      <div class="card h-100 p-0 radius-12 overflow-hidden">
        <div class="card-body">
          <div
            class="row mb-24 gy-3 align-items-center border-bottom pb-3"
            v-for="(h, index) in headers"
            :key="h.id ?? index"
          >
            <h5 class="col-sm-12 mb-3">Feature Description {{ index + 1 }}</h5>

            <div class="col-sm-4">
              <input
                class="form-control"
                v-model="h.name"
                :placeholder="`Feature Description ${index + 1}`"
              />
            </div>

            <div class="col-sm-3">
              <select class="form-select" v-model="h.input_type">
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="select">Select</option>
                <option value="multiselect">Multi-select</option>
                <option value="boolean">Boolean</option>
              </select>
            </div>

            <div class="col-sm-2">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" v-model="h.is_required" :id="`req-${index}`">
                <label class="form-check-label" :for="`req-${index}`">Required</label>
              </div>
            </div>

            <div class="col-sm-2">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" v-model="h.is_active" :id="`active-${index}`">
                <label class="form-check-label" :for="`active-${index}`">Active</label>
              </div>
            </div>

            <div class="col-sm-2">
              <input class="form-control" type="number" v-model.number="h.sort_order" placeholder="Sort order" />
            </div>

            <!-- Allowed values (always visible) -->
            <div class="col-sm-12">
              <label class="form-label">Allowed values</label>

              <div class="d-flex gap-2 flex-wrap mb-2">
  <div
    v-for="(val, vi) in h.values"
    :key="val.id ?? `${index}-${vi}`"
    class="input-group input-group-sm"
    style="width:auto; max-width: 260px;"
  >
    <input
      type="text"
      class="form-control form-control-sm"
      v-model="val.value"
      @focus="onValueFocus(index, vi)"
      @blur="commitValueEdit(index, vi)"
      @keydown="onValueKeydown($event, index, vi)"
      :placeholder="`Value ${vi + 1}`"
      style="min-width: 120px;"
    />
    <button
      class="btn btn-outline-secondary btn-sm"
      type="button"
      title="Apply"
      @click="commitValueEdit(index, vi)"
    >✓</button>
    <button
      class="btn btn-outline-danger btn-sm"
      type="button"
      title="Remove"
      @click="removeSpecValue(index, vi)"
    >×</button>
  </div>
</div>


               

              <div class="input-group">
                <input
                  class="form-control"
                  :id="`val-input-${index}`"
                  :placeholder="`Type a value and press Add`"
                  v-model="h._newVal"
                  @keyup.enter="
                    h._newVal = (h._newVal || '').trim();
                    if (h._newVal && !h.values.some(x => x.value === h._newVal)) h.values.push({ value: h._newVal });
                    h._newVal = '';
                  "
                >
                <button
                  class="btn btn-outline-primary"
                  @click="
                    h._newVal = (h._newVal || '').trim();
                    if (h._newVal && !h.values.some(x => x.value === h._newVal)) h.values.push({ value: h._newVal });
                    h._newVal = '';
                  "
                >Add</button>
              </div>
              <small class="text-muted">Examples: Green, Yellow, 220V…</small>
            </div>

            <div class="col-sm-12">
              <button class="btn btn-danger" @click="removeSpecHeader(index)">Remove</button>
            </div>
          </div>
        </div>

         <div class="card-footer d-flex justify-content-between">
         

          <div class="form-group text-end">
            <button type="button" class="btn btn-primary" :disabled="isSubmitDisabled" @click="submitSpecs">
              Save
            </button>
          </div>
        </div>

         
      </div>
    </div>

  </div>
</template>
