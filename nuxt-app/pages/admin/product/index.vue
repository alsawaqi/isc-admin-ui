<script setup lang="ts">
definePageMeta({
    layout: 'admin',
    middleware: ['permission'],
    permissions: 'manage products'
});

import { type Product } from '@/data/Product'
import { useProductType } from '~/data/producttype'
import { useProductsBrands } from '~/data/ProductsBrands';



import { ref, onMounted, watch } from 'vue'
const { $axios } = useNuxtApp()

const {getProductType} = useProductType();
const { getProductBrands } = useProductsBrands();

const steps = ref(1);

const barcodes = ref<string[]>([]);

const addBarcode = () => {
   barcodes.value.push('');
};

const nextStep = () => {
  if (steps.value < 3) {
    steps.value++;
  }
};
const prevStep = () => {
  if (steps.value > 1) {
    steps.value--;
  }
};

interface Department {
  id: number
  Product_Department_Name: string
}

 
interface SelectOption {
  id: number;
  name: string;
}

 
const form = ref<Product>({
  product_department_id: 0,
  product_sub_department_id: 0,
  product_sub_sub_department_id: 0,
  product_type_id: 0,
  product_brand_id: 0,
  product_manufacture_id: 0,
  name: '',
  name_ar: '',
  description: '',
  inhouse_barcode: '',
  price: 0,
  stock: 0   
})

const productTypes = ref<SelectOption[]>([]);
const productBrands = ref<SelectOption[]>([]);
const ProductManufactures = ref<SelectOption[]>([]);
const departments = ref<Department[]>([])
const subDepartments = ref<SelectOption[]>([])
const subSubDepartments = ref<SelectOption[]>([])

  
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


const getManufactures = async () => {
 
       try {
      const response = await $axios.get('/api/productmanufacture');
        ProductManufactures.value = response.data;
       } catch (error) {
      console.error('Failed to fetch manufactures:', error);
      throw error;
    }finally {
   
    }

};

 
// Watchers for cascading
watch(() => form.value.product_department_id, fetchSubDepartments)
watch(() => form.value.product_sub_department_id, fetchSubSubDepartments)

  
const submitForm = async () => {
    try {

        const payload = {
              ...form.value,
              barcodes: barcodes.value
            };


        const response = await $axios.post('/api/productmaster', payload);
        console.log('Product created successfully:', response.data);
        // Optionally, reset the form or redirect
        form.value = {
            product_department_id: 0,
            product_sub_department_id: 0,
            product_sub_sub_department_id: 0,
            product_type_id: 0,
            product_brand_id: 0,
            product_manufacture_id: 0,
            name: '',
            name_ar: '',
            description: '',
            inhouse_barcode: '',
            price: 0,
            stock: 0   
        };

          barcodes.value = [];
     console.log('Product created:', response.data);
  } catch (error) {
    console.error('Submission failed:', error);
  }
}

onMounted(async () => {
      

            try {
                productTypes.value = await getProductType();
                productBrands.value = await getProductBrands();
                await getManufactures();
            } catch (error) {
                console.error('Failed to load product types:', error);
            }
             await  fetchDepartments()
     }
)


</script>

<template>

      <div class="dashboard-main-body">

            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
                <h6 class="fw-semibold mb-0" style="color: #8b5676">Create Products</h6>
                <ul class="d-flex align-items-center gap-2">
                    <li class="fw-medium">
                        <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
                            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
                            Dashboard
                        </NuxtLink>
                    </li>
                    <li>-</li>
                    <li class="fw-medium">Create Products</li>
                </ul>
            </div>

            <div class="row gy-4">
                <div class="col-lg-12">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Create Products</h5>
                        </div>

                        
                        <div class="card-body" v-show="steps === 1">

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
                                              <option v-for="sub in subDepartments" :key="sub.id" :value="sub.id">{{ sub.name }}</option>
                                            </select>
                                          </div>

                                          <div class="col-md-12">
                                            <label class="form-label">Sub Sub Category</label>
                                            <select class="form-select" v-model="form.product_sub_sub_department_id" required>
                                              <option disabled value="">Select Sub Sub Category</option>
                                              <option v-for="subsub in subSubDepartments" :key="subsub.id" :value="subsub.id">{{ subsub.name }}</option>
                                            </select>
                                          </div>

                                            <div class="col-md-12">
                                              <label class="form-label">Types</label>
                                              
                                              <select class="form-select" v-model="form.product_type_id" required>
                                                <option disabled value="">Select Product Type</option>
                                                <option v-for="type in productTypes" :key="type.id" :value="type.id">{{ type.name }}</option>

                                              </select>
                                            </div>

                                            <div class="col-md-12">
                                              <label class="form-label">Brands</label>
                                            
                                              <select class="form-select" v-model="form.product_brand_id" required>
                                                <option disabled value="">Select Product Brand</option>
                                                <option v-for="brand in productBrands" :key="brand.id" :value="brand.id">{{ brand.name }}</option>
                                                </select>
                                            </div>

                                            <div class="col-md-12">
                                              <label class="form-label">Manufacturers</label>
                                            
                                              <select class="form-select" v-model="form.product_manufacture_id" required>
                                                <option disabled value="">Select Product Manufacturer</option>
                                                <option v-for="manufacture in ProductManufactures" :key="manufacture.id" :value="manufacture.id">{{ manufacture.name }}</option>
                                              </select>
                                            </div>

                                            <div class="col-md-12">
                                              <label class="form-label">In House Barcode</label>
                                            
                                                  <input type="text" v-model="form.inhouse_barcode" class="form-control" placeholder="Enter In house Barcode" required>
                                          
                                            </div>

                                            <div class="col-md-12">
                                              <label class="form-label">Product Name</label>
                                              <input type="text" v-model="form.name" class="form-control" placeholder="Enter Name" required>
                                            </div>


                                            

                                            <div class="col-md-12">
                                              <label class="form-label">Product Name (Arabic)</label>
                                              <input type="text" v-model="form.name_ar" class="form-control" placeholder="Enter Arabic Name" required>
                                            </div>

                                            <div class="col-md-12">
                                              <label class="form-label">Description</label>
                                              <input type="text" v-model="form.description" class="form-control" required>
                                            </div>

                                            <div class="col-md-12">
                                              <label class="form-label">Price</label>
                                              <input type="number" v-model="form.price" class="form-control" required>
                                            </div>

                                            <div class="col-md-12">
                                              <label class="form-label">Stock</label>
                                              <input type="number" v-model="form.stock" class="form-control" required>
                                            </div>

                                           


                                   
                            
                           
                        </div>


                        <div class="card-body" v-show="steps === 2">

                           



                            <div v-for="(barcode, index) in barcodes" :key="index" class="mb-3">
                                <input type="text" v-model="barcodes[index]" class="form-control" placeholder="Enter Barcode" required>
                                <button type="button" class="btn btn-danger mt-2" @click="barcodes.splice(index, 1)">Remove</button>
                                </div>

                            <button type="button" class="btn btn-success" @click="addBarcode">Add Barcode</button>

                        </div>


                        <div class="card-footer d-flex justify-content-between">
                            <button class="btn btn-secondary" @click="prevStep" :disabled="steps === 1" v-if="steps === 2">Previous</button>
                            
                            <button class="btn btn-primary" @click="nextStep"  v-if="steps === 1">Next</button>

                            <button class="btn btn-primary" @click.prevent="submitForm()" v-if="steps === 2">Submit</button>
                        </div>
                       
                    </div>
                </div>
            </div>

            

        </div>

    
</template>