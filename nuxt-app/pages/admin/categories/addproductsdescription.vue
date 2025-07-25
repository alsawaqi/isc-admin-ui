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
const headers = ref<string[]>([''])

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
  headers.value.push('')
}


const removeSpecHeader = (index: number) => {
  headers.value.splice(index, 1)
}


watch(() => form.value.product_department_id, fetchSubDepartments)
watch(() => form.value.product_sub_department_id, fetchSubSubDepartments)


const isSubmitDisabled = computed(() => {
  return (
    form.value.product_sub_sub_department_id === 0 ||
    headers.value.length === 0 ||
    headers.value.every(header => header.trim() === '')
  )
})


const submitSpecs = async () => {
  try {
    await $axios.post('/api/product-specifications', {
       specifications: headers.value, // this is your array of strings
       sub_sub_category_id: form.value.product_sub_sub_department_id
    });
  
    alert('Specifications submitted successfully')
    headers.value = [];
    form.value.product_department_id = 0;
    form.value.product_sub_department_id = 0;
    form.value.product_sub_sub_department_id = 0;

  } catch (error) {
    console.error('Submission error:', error)
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

     <div class="row mb-24 gy-3 align-items-center" v-for="(header, index) in headers" :key="index">
                <h5 class="col-sm-12 mb-3">Feature Description {{ index + 1 }}</h5>
                    <div class="form-label mb-0 col-sm-6">
                                           <input type="text" class="form-control" v-model="headers[index]" :placeholder="`Feature Description ${index + 1}`" style="margin-bottom: 10px;"/>
                        </div>
                     <div class="col-sm-6">
                          <div class="icon-field">
                              <button class="btn btn-danger" @click="removeSpecHeader(index)">Remove</button>
                           </div>
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