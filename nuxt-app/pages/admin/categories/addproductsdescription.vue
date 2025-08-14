<script setup lang="ts">
import { on } from 'events'
import { ref, onMounted, watch   } from 'vue'

definePageMeta({
     layout: 'admin',
     middleware: ['permission'],
     permissions: 'departments'
     
    })
const { $axios } = useNuxtApp()

    interface Department {
                        id: number
                        Product_Department_Name: string
                       }

 
   interface SubDepartment {
        id: number;
        Sub_Department_Name: string;
        }
        interface SubSubDepartment {
            id: number;
            Product_Sub_Sub_Department_Name: string;
        }

   interface Categories{
            product_department_id : number;
            product_sub_department_id : number;
            product_sub_sub_department_id : number;

        }


const form = ref<Categories>({
  product_department_id: 0,
  product_sub_department_id: 0,
  product_sub_sub_department_id: 0,
 
})


const departments = ref<Department[]>([])
const subDepartments = ref<SubDepartment[]>([])
const subSubDepartments = ref<SubSubDepartment[]>([])
const headers = ref<Array<{
  name: string
  input_type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean'
  is_required: boolean
  is_active: boolean
  sort_order: number
  values: string[]
  _newVal?: string // <-- add this optional property
}>>([
  { name: '', input_type: 'text', is_required: false, is_active: false, sort_order: 0, values: [], _newVal: '' }
])


const fetchDepartments = async () => {
  const res = await $axios.get('/api/productdepartment')
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


const addHeaderField = () => {
  headers.value.push({ name: '', input_type: 'text', is_required: false, is_active: false, sort_order: 0, values: [] })
}


const removeSpecHeader = (index: number) => {
  headers.value.splice(index, 1)
}


watch(() => form.value.product_department_id, fetchSubDepartments)
watch(() => form.value.product_sub_department_id, fetchSubSubDepartments)


const isSubmitDisabled = computed(() => {
  if (!form.value.product_sub_sub_department_id) return true
  if (headers.value.length === 0) return true
  // Must have at least one non-empty header name
  if (headers.value.every(h => h.name.trim() === '')) return true
  // For select/multiselect, at least one value
  if (headers.value.some(h => (h.input_type === 'select' || h.input_type === 'multiselect') && h.values.length === 0)) {
    return true
  }
  return false
})


const submitSpecs = async () => {
  try {
    await $axios.post('/api/product-specifications/bulk', {
      sub_sub_category_id: form.value.product_sub_sub_department_id,
      specs: headers.value.map(h => ({
        name: h.name.trim(),
        input_type: h.input_type,
        is_required: h.is_required,
        is_active: h.is_active,
        sort_order: h.sort_order || 0,
        values: (h.input_type === 'select' || h.input_type === 'multiselect') ? [...new Set(h.values.map(v => v.trim()).filter(Boolean))] : []
      }))
    })
    alert('Specifications submitted successfully')
    headers.value = [{ name: '', input_type: 'text', is_required: false, is_active: false, sort_order: 0, values: [] }]
    form.value.product_department_id = 0
    form.value.product_sub_department_id = 0
    form.value.product_sub_sub_department_id = 0
  } catch (e) {
    console.error('Submission error:', e)
    alert('Failed to submit specifications')
  }
}

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

    <div class="card h-100 p-0 radius-12 overflow-hidden">
        <div class="card-body p-40">

            <p v-if="isSubmitDisabled" class="text-danger mt-2">
                Please select a sub sub category and enter at least one feature name.
                </p>

            <div class="col-lg-12">
                     <div class="card-header">
                            <h5 class="card-title mb-0">Create Products Descriptions</h5>
                     </div>


             <div class="card-body">

                <div class="col-md-12">
                                            <label class="form-label">Category</label>
                                            <select class="form-select" v-model="form.product_department_id" required>
                                              <option disabled value="">Select Category</option>
                                              <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.Product_Department_Name }}</option>
                                            </select>
           </div>


           <div class="col-md-12">
                                            <label class="form-label">Sub Category</label>
                                            <select class="form-select" v-model="form.product_sub_department_id" required>
                                              <option disabled value="">Select Sub Category</option>
                                              <option v-for="sub in subDepartments" :key="sub.id" :value="sub.id">{{ sub.Sub_Department_Name }}</option>
                                            </select>
                                          </div>

                                          <div class="col-md-12">
                                            <label class="form-label">Sub Sub Category</label>
                                            <select class="form-select" v-model="form.product_sub_sub_department_id" required>
                                              <option disabled value="">Select Sub Sub Category</option>
                                              <option v-for="subsub in subSubDepartments" :key="subsub.id" :value="subsub.id">{{ subsub.Product_Sub_Sub_Department_Name }}</option>
                                            </select>
                                          </div>


                
             </div>        


            </div>
            
        </div>
    </div>






    </div>


    <div class="dashboard-main-body">

        <div class="card h-100 p-0 radius-12 overflow-hidden">
            <div class="card-body">

             <div class="row mb-24 gy-3 align-items-center" v-for="(h, index) in headers" :key="index">
  <h5 class="col-sm-12 mb-3">Feature Description {{ index + 1 }}</h5>

  <div class="col-sm-4">
    <input class="form-control" v-model="h.name" :placeholder="`Feature Description ${index + 1}`" />
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
      <input class="form-check-input" type="checkbox" v-model="h.is_required" id="req-{{index}}">
      <label class="form-check-label" :for="`req-${index}`">Required</label>
    </div>
  </div>

  <div class="col-sm-2">
    <div class="form-check">
      <input class="form-check-input" type="checkbox" v-model="h.is_active" id="active-{{index}}">
      <label class="form-check-label" :for="`active-${index}`">Active</label>
    </div>
  </div>

  <div class="col-sm-2">
    <input class="form-control" type="number" v-model.number="h.sort_order" placeholder="Sort order" />
  </div>

  <!-- Values tag editor for select/multiselect -->
  <div class="col-sm-12">
    <label class="form-label">Allowed values</label>
    <div class="d-flex gap-2 flex-wrap mb-2">
      <span v-for="(val, vi) in h.values" :key="vi" class="badge bg-secondary">
        {{ val }}
        <button type="button" class="btn btn-sm btn-link text-white" @click="h.values.splice(vi,1)">×</button>
      </span>
    </div>
    <div class="input-group">
      <input class="form-control" :id="`val-input-${index}`" :placeholder="`Type a value and press Add`" v-model="h._newVal" @keyup.enter="
        (h._newVal = (h._newVal || '').trim()),
        h._newVal && !h.values.includes(h._newVal) && h.values.push(h._newVal),
        h._newVal = ''
      ">
      <button class="btn btn-outline-primary" @click="
        h._newVal = (h._newVal || '').trim();
        if (h._newVal && !h.values.includes(h._newVal)) h.values.push(h._newVal);
        h._newVal = '';
      ">Add</button>
    </div>
    <small class="text-muted">Examples: Green, Yellow, 220V…</small>
  </div>

  <div class="col-sm-12">
    <button class="btn btn-danger" @click="removeSpecHeader(index)">Remove</button>
  </div>
</div>

             </div>
             <div class="card-footer">
                  <button class="btn btn-primary" @click="addHeaderField">Add Feature Description +</button>

           

                    
 

                    <div class="form-group text-end">
                                                <button type="button" class="btn btn-primary" :disabled="isSubmitDisabled" @click="submitSpecs">Submit</button>
                                            </div>
                  
              </div>

        </div>

    </div>
    
</template>