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
  if (steps.value < 5) {
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

interface ProductSpecificationDescription {
  id: number;
  name: string;
  product_sub_sub_department_id: number;
  created_at: string;
  updated_at: string;
}


interface ProductSpecificationProduct{
  product_specification_description_id: number;
  value: string;
  
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
});

const productSpecificationProduct = ref<ProductSpecificationProduct>({
  product_specification_description_id: 0,
  value: ''
});

const productTypes = ref<SelectOption[]>([]);
const productBrands = ref<SelectOption[]>([]);
const ProductManufactures = ref<SelectOption[]>([]);
const departments = ref<Department[]>([]);
const subDepartments = ref<SelectOption[]>([]);
const subSubDepartments = ref<SelectOption[]>([]);
const productSpecificationProducts = ref<ProductSpecificationProduct[]>([]);
const loading = ref<boolean>(false);



const isStep1Valid = computed(() => {
  return (
    form.value.product_department_id &&
    form.value.product_sub_department_id &&
    form.value.product_sub_sub_department_id &&
    form.value.product_type_id &&
    form.value.product_brand_id &&
    form.value.product_manufacture_id &&
    form.value.inhouse_barcode.trim() !== '' &&
    form.value.name.trim() !== '' &&
    form.value.name_ar.trim() !== '' &&
    form.value.description.trim() !== '' &&
    form.value.price > 0 &&
    form.value.stock >= 0
  );
});

  
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

const getproductspecifications = async () => {
  try {
    const response = await $axios.get('/api/product-specifications', {
      params: {
       product_sub_sub_department_id: form.value.product_sub_sub_department_id
      }
    });


 

     productSpecificationProducts.value = response.data.map((spec: ProductSpecificationDescription) => ({
            name : spec.name,
            product_specification_description_id: spec.id,
            value: ''
          }));

    

   } catch (error) {
    console.error('Failed to fetch product specifications:', error);
    throw error;
  }
};

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


watch(() => form.value.product_sub_sub_department_id, async () => {
  try {
    const specifications = await getproductspecifications();
    console.log('Product specifications:', specifications);
  } catch (error) {
    console.error('Error fetching product specifications:', error);
  }
});

  
const submitForm = async () => {
  loading.value = true;
    try {

        const payload = {
              ...form.value,
              barcodes: barcodes.value,
              specifications: productSpecificationProducts.value.filter(p => p.value.trim() !== '')
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
          productSpecificationProducts.value = [];
          steps.value = 1;
            
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'response' in error && error.response && typeof error.response === 'object' && 'data' in error.response) {
      // @ts-ignore
      console.error('Submission failed:', error.response.data);
    } else if (error instanceof Error) {
      console.error('Submission failed:', error.message);
    } else {
      console.error('Submission failed:', error);
    }
  }finally {
    loading.value = false;
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

                        
                        <div class="card" v-show="steps === 1">

                          <div class="card-header">
                            <h6>Product Details</h6>

                          </div>

                            <div class="card-body">

                    
                                          <!-- Category -->
                                        <div class="row mb-24 gy-3 align-items-center">
                                          <label class="form-label mb-0 col-sm-2">Category</label>
                                          <div class="col-sm-10">
                                            <div class="icon-field">
                                              <span class="icon">
                                                <iconify-icon icon="carbon:category"></iconify-icon>
                                              </span>
                                              <select class="form-select" v-model="form.product_department_id" required>
                                                <option disabled value="">Select Category</option>
                                                <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.Product_Department_Name }}</option>
                                              </select>
                                            </div>
                                          </div>
                                        </div>

                                          <!-- Sub Category -->
                                          <div class="row mb-24 gy-3 align-items-center">
                                            <label class="form-label mb-0 col-sm-2">Sub Category</label>
                                            <div class="col-sm-10">
                                              <div class="icon-field">
                                                <span class="icon">
                                                  <iconify-icon icon="carbon:subcategory"></iconify-icon>
                                                </span>
                                                <select class="form-select" v-model="form.product_sub_department_id" required>
                                                  <option disabled value="">Select Sub Category</option>
                                                  <option v-for="sub in subDepartments" :key="sub.id" :value="sub.id">{{ sub.name }}</option>
                                                </select>
                                              </div>
                                            </div>
                                          </div>

                                          <!-- Sub Sub Category -->
                                          <div class="row mb-24 gy-3 align-items-center">
                                            <label class="form-label mb-0 col-sm-2">Sub Sub Category</label>
                                            <div class="col-sm-10">
                                              <div class="icon-field">
                                                <span class="icon">
                                                  <iconify-icon icon="mdi:subdirectory-arrow-right"></iconify-icon>
                                                </span>
                                                <select class="form-select" v-model="form.product_sub_sub_department_id" required>
                                                  <option disabled value="">Select Sub Sub Category</option>
                                                  <option v-for="subsub in subSubDepartments" :key="subsub.id" :value="subsub.id">{{ subsub.name }}</option>
                                                </select>
                                              </div>
                                            </div>
                                          </div>

                                          <!-- Types -->
                                          <div class="row mb-24 gy-3 align-items-center">
                                            <label class="form-label mb-0 col-sm-2">Types</label>
                                            <div class="col-sm-10">
                                              <div class="icon-field">
                                                <span class="icon">
                                                  <iconify-icon icon="mdi:shape-outline"></iconify-icon>
                                                </span>
                                                <select class="form-select" v-model="form.product_type_id" required>
                                                  <option disabled value="">Select Product Type</option>
                                                  <option v-for="type in productTypes" :key="type.id" :value="type.id">{{ type.name }}</option>
                                                </select>
                                              </div>
                                            </div>
                                          </div>

                                          <!-- Brands -->
                                          <div class="row mb-24 gy-3 align-items-center">
                                            <label class="form-label mb-0 col-sm-2">Brands</label>
                                            <div class="col-sm-10">
                                              <div class="icon-field">
                                                <span class="icon">
                                                  <iconify-icon icon="mdi:tag-multiple-outline"></iconify-icon>
                                                </span>
                                                <select class="form-select" v-model="form.product_brand_id" required>
                                                  <option disabled value="">Select Product Brand</option>
                                                  <option v-for="brand in productBrands" :key="brand.id" :value="brand.id">{{ brand.name }}</option>
                                                </select>
                                              </div>
                                            </div>
                                          </div>

                                          <!-- Manufacturers -->
                                          <div class="row mb-24 gy-3 align-items-center">
                                            <label class="form-label mb-0 col-sm-2">Manufacturers</label>
                                            <div class="col-sm-10">
                                              <div class="icon-field">
                                                <span class="icon">
                                                  <iconify-icon icon="mdi:factory"></iconify-icon>
                                                </span>
                                                <select class="form-select" v-model="form.product_manufacture_id" required>
                                                  <option disabled value="">Select Product Manufacturer</option>
                                                  <option v-for="manufacture in ProductManufactures" :key="manufacture.id" :value="manufacture.id">{{ manufacture.name }}</option>
                                                </select>
                                              </div>
                                            </div>
                                          </div>

                                          <!-- In House Barcode -->
                                          <div class="row mb-24 gy-3 align-items-center">
                                            <label class="form-label mb-0 col-sm-2">In House Barcode</label>
                                            <div class="col-sm-10">
                                              <div class="icon-field">
                                                <span class="icon">
                                                  <iconify-icon icon="mdi:barcode"></iconify-icon>
                                                </span>
                                                <input type="text" v-model="form.inhouse_barcode" class="form-control" placeholder="Enter In house Barcode" required>
                                              </div>
                                            </div>
                                          </div>

                                          <!-- Product Name -->
                                          <div class="row mb-24 gy-3 align-items-center">
                                            <label class="form-label mb-0 col-sm-2">Product Name</label>
                                            <div class="col-sm-10">
                                              <div class="icon-field">
                                                <span class="icon">
                                                  <iconify-icon icon="mdi:tag-outline"></iconify-icon>
                                                </span>
                                                <input type="text" v-model="form.name" class="form-control" placeholder="Enter Product Name" required>
                                              </div>
                                            </div>
                                          </div>

                                          <!-- Product Name Arabic -->
                                          <div class="row mb-24 gy-3 align-items-center">
                                            <label class="form-label mb-0 col-sm-2">Product Name (Arabic)</label>
                                            <div class="col-sm-10">
                                              <div class="icon-field">
                                                <span class="icon">
                                                  <iconify-icon icon="mdi:translate"></iconify-icon>
                                                </span>
                                                <input type="text" v-model="form.name_ar" class="form-control" placeholder="Enter Arabic Name" required>
                                              </div>
                                            </div>
                                          </div>

                                          <!-- Description -->
                                          <div class="row mb-24 gy-3 align-items-center">
                                            <label class="form-label mb-0 col-sm-2">Description</label>
                                            <div class="col-sm-10">
                                              <div class="icon-field">
                                                <span class="icon">
                                                  <iconify-icon icon="mdi:text-box-outline"></iconify-icon>
                                                </span>
                                                <input type="text" v-model="form.description" class="form-control" placeholder="Enter Description" required>
                                              </div>
                                            </div>
                                          </div>

                                          <!-- Price -->
                                          <div class="row mb-24 gy-3 align-items-center">
                                            <label class="form-label mb-0 col-sm-2">Price</label>
                                            <div class="col-sm-10">
                                              <div class="icon-field">
                                                <span class="icon">
                                                  <iconify-icon icon="mdi:currency-usd"></iconify-icon>
                                                </span>
                                                <input type="number" v-model="form.price" class="form-control" placeholder="Enter Price" required>
                                              </div>
                                            </div>
                                          </div>

                                          <!-- Stock -->
                                          <div class="row mb-24 gy-3 align-items-center">
                                            <label class="form-label mb-0 col-sm-2">Stock</label>
                                            <div class="col-sm-10">
                                              <div class="icon-field">
                                                <span class="icon">
                                                  <iconify-icon icon="mdi:warehouse"></iconify-icon>
                                                </span>
                                                <input type="number" v-model="form.stock" class="form-control" placeholder="Enter Stock" required>
                                              </div>
                                            </div>
                                          </div>


                                                          


                            </div>                  
                            
                           
                        </div>


                        <div class="card" v-show="steps === 2">

                           <div class="card-header">
                            <h6>Barcode Manufacturer </h6>
                           </div>

                          <div class="card-body">

                                                      <div v-for="(barcode, index) in barcodes" :key="index" class="mb-3">
                                                          <input type="text" v-model="barcodes[index]" class="form-control" placeholder="Enter Barcode" required>
                                                          <button type="button" class="btn btn-danger mt-2" @click="barcodes.splice(index, 1)">Remove</button>
                                                          </div>

                                                      <button type="button" class="btn btn-success" @click="addBarcode">Add Barcode</button>
                          </div>
                          
                        </div>



                        <div class="card" v-show="steps === 3">


                            <div class="card-header">
                            <h6>Enter Product Feature Values</h6>

                          </div>
                             <div class="card-body">

                    
                                       

                                          <!-- Description -->
                                          <div class="row mb-24 gy-3 align-items-center" v-for="(spec, index) in productSpecificationProducts" :key="index">

                                           
                                            <label class="form-label mb-0 col-sm-2">{{ spec.name }}</label>
                                            <div class="col-sm-10">
                                              <div class="icon-field">
                                                <span class="icon">
                                                  <iconify-icon icon="mdi:text-box-outline"></iconify-icon>
                                                </span>

                                                 <input type="text" v-model="productSpecificationProducts[index].value" class="form-control" placeholder="Enter Value">
      
                                              </div>
                                            </div>
                                          </div>

                                       

                                        

                                                          


                            </div>

                           



                        </div>


                        <div class="card-body" v-show="steps === 4">
                            <h5 class="mb-3">Review Your Product</h5>
 
                            <p><strong>In House Barcode:</strong> {{ form.inhouse_barcode }}</p>
                            <p><strong>Name:</strong> {{ form.name }}</p>
                            <p><strong>Name (Arabic):</strong> {{ form.name_ar }}</p>
                            <p><strong>Description:</strong> {{ form.description }}</p>
                            <p><strong>Price:</strong> {{ form.price }}</p>
                            <p><strong>Stock:</strong> {{ form.stock }}</p>


                        </div>


                        <div class="card-footer d-flex justify-content-between">
                            <button class="btn btn-secondary border border-primary-600 text-md px-24 py-12 radius-8" @click="prevStep()" :disabled="steps === 1" v-if="steps !== 1">Previous</button>
                            
                            <button class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8" @click="nextStep()"   v-if="steps !== 4" :disabled="!isStep1Valid" > Next</button>

                            <button class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8" @click.prevent="submitForm()" v-if="steps === 4" :disabled="loading">
                            <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                               Submit
                            </button>
                        </div>
                       
                    </div>
                </div>
            </div>

            

        </div>

    
</template>