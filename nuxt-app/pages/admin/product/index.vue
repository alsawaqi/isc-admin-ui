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
        const response = await $axios.post('/api/productmaster', form.value);
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
            price: 0,
            stock: 0   
        };
    } catch (error) {
        console.error('Error creating product:', error);
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
                <h6 class="fw-semibold mb-0">Create Products</h6>
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
                        <div class="card-body">

                             <form class="row gy-3 needs-validation" @submit.prevent="submitForm">
    <div class="col-md-6">
      <label class="form-label">Product Name</label>
      <input type="text" v-model="form.name" class="form-control" placeholder="Enter Name" required>
    </div>

    <div class="col-md-6">
      <label class="form-label">Product Name (Arabic)</label>
      <input type="text" v-model="form.name_ar" class="form-control" placeholder="Enter Arabic Name" required>
    </div>

    <div class="col-md-6">
      <label class="form-label">Description</label>
      <input type="text" v-model="form.description" class="form-control" required>
    </div>

    <div class="col-md-6">
      <label class="form-label">Price</label>
      <input type="number" v-model="form.price" class="form-control" required>
    </div>

    <div class="col-md-6">
      <label class="form-label">Stock</label>
      <input type="number" v-model="form.stock" class="form-control" required>
    </div>

    <!-- You can replace these with dropdowns in future -->
    <div class="col-md-6">
    <label class="form-label">Category</label>
    <select class="form-select" v-model="form.product_department_id" required>
      <option disabled value="">Select Category</option>
      <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.Product_Department_Name }}</option>
    </select>
  </div>

  <div class="col-md-6">
    <label class="form-label">Sub Category</label>
    <select class="form-select" v-model="form.product_sub_department_id" required>
      <option disabled value="">Select Sub Category</option>
      <option v-for="sub in subDepartments" :key="sub.id" :value="sub.id">{{ sub.name }}</option>
    </select>
  </div>

  <div class="col-md-6">
    <label class="form-label">Sub Sub Category</label>
    <select class="form-select" v-model="form.product_sub_sub_department_id" required>
      <option disabled value="">Select Sub Sub Category</option>
      <option v-for="subsub in subSubDepartments" :key="subsub.id" :value="subsub.id">{{ subsub.name }}</option>
    </select>
  </div>

    <div class="col-md-6">
      <label class="form-label">Type ID</label>
      
      <select class="form-select" v-model="form.product_type_id" required>
        <option disabled value="">Select Product Type</option>
        <option v-for="type in productTypes" :key="type.id" :value="type.id">{{ type.name }}</option>

      </select>
    </div>

    <div class="col-md-6">
      <label class="form-label">Brand ID</label>
     
      <select class="form-select" v-model="form.product_brand_id" required>
        <option disabled value="">Select Product Brand</option>
        <option v-for="brand in productBrands" :key="brand.id" :value="brand.id">{{ brand.name }}</option>
        </select>
    </div>

    <div class="col-md-6">
      <label class="form-label">Manufacturer ID</label>
    
      <select class="form-select" v-model="form.product_manufacture_id" required>
        <option disabled value="">Select Product Manufacturer</option>
        <option v-for="manufacture in ProductManufactures" :key="manufacture.id" :value="manufacture.id">{{ manufacture.name }}</option>
      </select>
    </div>

    <div class="col-12">
      <button type="submit" class="btn btn-primary">Submit Product</button>
    </div>
  </form>
                           
                        </div>
                    </div>
                </div>
                 
            </div>

        </div>

    
</template>