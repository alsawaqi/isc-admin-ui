<script setup lang="ts">
definePageMeta({
  layout: 'admin',

});

import { ref, onMounted,computed,watch } from 'vue'
import { useRoute } from 'vue-router'
 
import { useProductType } from '~/data/producttype'
import { useProductsBrands } from '~/data/ProductsBrands';
import { definePageMeta,useNuxtApp } from '#imports';


interface Product {
  Product_Department_Id: number;
  Product_Sub_Department_Id: number;
  Product_Sub_Sub_Department_Id: number;
  Product_Type_Id: any;
  Product_Brand_Id: any;
  Product_Manufacture_Id: any;
  Product_Name: string;
  Product_Name_ar: string;
  Product_Description: string;
  Inhouse_Barcode: string;
  Product_Sku: string;
  Product_Price: number;
  Product_Stock: number;
  volume_type: string;
   Weight_Kg: number;
    Length_Cm: number;
    Width_Cm: number;
    Height_Cm: number;

}
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


interface ProductManufacture {
  id: number;
  Products_Manufacture_Name: string;

}

interface ProductBrand {
  id: number;
  Products_Brands_Name: string;
}

const route = useRoute();
const id = computed(() => route.params.id);

const { getProductType } = useProductType();
const { getProductBrands } = useProductsBrands();

const { $axios } = (useNuxtApp() as any);


const productBrands = ref<ProductBrand[]>([]);


const form = ref<Product>({
  Product_Department_Id: 0,
  Product_Sub_Department_Id: 0,
  Product_Sub_Sub_Department_Id: 0,
  Product_Type_Id: '',
  Product_Brand_Id: '',
  Product_Manufacture_Id: '',
  Product_Name: '',
  Product_Name_ar: '',
  Product_Description: '',
  Inhouse_Barcode: '',
  Product_Sku: '',
  Product_Price: 0,
  Product_Stock: 0,
  volume_type: 'cm' as 'mm' | 'cm' | 'm' | 'in' | 'ft', // default
  Weight_Kg: 0,
  Length_Cm: 0,
  Width_Cm: 0,
  Height_Cm: 0
});


interface ProductType {
  id: number;
  Product_Types_Name: string;
}


const productTypes = ref<ProductType[]>([]);
const departments = ref<Department[]>([]);
const subDepartments = ref<SubDepartment[]>([]);
const subSubDepartments = ref<SubSubDepartment[]>([]);
const ProductManufactures = ref<ProductManufacture[]>([]);

const volumeUnitOptions = [
  { value: 'mm', label: 'Millimeter (mm)' },
  { value: 'cm', label: 'Centimeter (cm)' },
  { value: 'm', label: 'Meter (m)' },
  { value: 'in', label: 'Inch (in)' },
  { value: 'ft', label: 'Foot (ft)' },
]



const fetchDepartments = async () => {
  const res = await $axios.get('/api/productdepartment/all')
  departments.value = res.data
}

const fetchSubDepartments = async () => {
  if (!form.value.Product_Department_Id) return
  const res = await $axios.get(`/api/sub-departments/${form.value.Product_Department_Id}`)
  subDepartments.value = res.data.sub_departments
}

const fetchSubSubDepartments = async () => {
  if (!form.value.Product_Sub_Department_Id) return
  const res = await $axios.get(`/api/sub-sub-departments/${form.value.Product_Sub_Department_Id}`)
  subSubDepartments.value = res.data
}


const getManufactures = async () => {

  try {
    const response = await $axios.get('/api/productmanufacture/all');
    ProductManufactures.value = response.data;
  } catch (error) {
    console.error('Failed to fetch manufactures:', error);
    throw error;
  } finally {

  }

};


const getproducts = async (): Promise<void> => {
  try {
    const response = await $axios.get(`/api/productmaster/${id.value}`);
    form.value = response.data;
    console.log('Fetched product:', response.data);
  } catch (error) {
    console.error('Failed to fetch product:', error);
    throw error;
  } finally {

  }
};



watch(() => form.value.Product_Department_Id, fetchSubDepartments)
watch(() => form.value.Product_Sub_Department_Id, fetchSubSubDepartments)


const updateproducts = async (): Promise<void> => {
  
  try {
   let response = await $axios.put(`/api/productmaster/${id.value}`, form.value);
     console.log('Product updated:', response.data); 
   alert('Product updated successfully!');
    await getproducts();
  } catch (error) {
    console.error('Failed to update product:', error);
    alert('Failed to update product. Please try again.');
    throw error;
  } finally {

  }
   
 
};



onMounted(async () => {
  await fetchDepartments();

  await getproducts();

  await getManufactures();
 productTypes.value = await getProductType();
 productBrands.value = await getProductBrands();

});

</script>
<template>


  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #8b5676">Editing Products</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">Editing Products</li>
      </ul>
    </div>


    <div class="row gy-4">
      <div class="col-lg-12">
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">Edit Product</h5>
          </div>


          <div class="card">
            <div class="card-header">
              <h6>Edit Product Details</h6>
            </div>

            <div class="card-body">
              <div class="row g-4"><!-- g-4 = gap between boxes -->

                <!-- Category -->
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Category</label>
                  <div class="icon-field">
                    <span class="icon">
                      <iconify-icon icon="carbon:category"></iconify-icon>
                    </span>
                    <select class="form-select" v-model="form.Product_Department_Id" required>
                      <option disabled value="">Select Category</option>
                      <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                        {{ dept.Product_Department_Name }}
                      </option>
                    </select>
                  </div>
                </div>

                <!-- Sub Category -->
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Sub Category</label>
                  <div class="icon-field">
                    <span class="icon">
                      <iconify-icon icon="carbon:subcategory"></iconify-icon>
                    </span>
                    <select class="form-select" v-model="form.Product_Sub_Department_Id" required>
                      <option disabled value="">Select Sub Category</option>
                      <option v-for="sub in subDepartments" :key="sub.id" :value="sub.id">
                        {{ sub.Sub_Department_Name }}
                      </option>
                    </select>
                  </div>
                </div>

                <!-- Sub Sub Category -->
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Sub Sub Category</label>
                  <div class="icon-field">
                    <span class="icon">
                      <iconify-icon icon="mdi:subdirectory-arrow-right"></iconify-icon>
                    </span>
                    <select class="form-select" v-model="form.Product_Sub_Sub_Department_Id" required>
                      <option disabled value="">Select Sub Sub Category</option>
                      <option v-for="subsub in subSubDepartments" :key="subsub.id" :value="subsub.id">
                        {{ subsub.Product_Sub_Sub_Department_Name }}
                      </option>
                    </select>
                  </div>
                </div>

                <!-- Types -->
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Types</label>
                  <div class="icon-field">
                    <span class="icon">
                      <iconify-icon icon="mdi:shape-outline"></iconify-icon>
                    </span>
                    <select class="form-select" v-model="form.Product_Type_Id" required>
                      <option disabled value="">Select Product Type</option>
                      <option v-for="type in productTypes" :key="type.id" :value="type.id">
                        {{ type.Product_Types_Name }}
                      </option>
                    </select>
                  </div>
                </div>

                <!-- Brands -->
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Brands</label>
                  <div class="icon-field">
                    <span class="icon">
                      <iconify-icon icon="mdi:tag-multiple-outline"></iconify-icon>
                    </span>
                    <select class="form-select" v-model="form.Product_Brand_Id" required>
                      <option disabled value="">Select Product Brand</option>
                      <option v-for="brand in productBrands" :key="brand.id" :value="brand.id">
                        {{ brand.Products_Brands_Name }}
                      </option>
                    </select>
                  </div>
                </div>

                <!-- Manufacturers -->
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Manufacturers</label>
                  <div class="icon-field">
                    <span class="icon">
                      <iconify-icon icon="mdi:factory"></iconify-icon>
                    </span>
                    <select class="form-select" v-model="form.Product_Manufacture_Id" required>
                      <option disabled value="">Select Product Manufacturer</option>
                      <option v-for="manufacture in ProductManufactures" :key="manufacture.id" :value="manufacture.id">
                        {{ manufacture.Products_Manufacture_Name }}
                      </option>
                    </select>
                  </div>
                </div>

                <!-- Product SKU -->
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Product SKU</label>
                  <div class="icon-field">
                    <span class="icon">
                      <iconify-icon icon="mdi:barcode"></iconify-icon>
                    </span>
                    <input type="text" v-model="form.Product_Sku" class="form-control"
                      placeholder="Enter Product Sku" />
                  </div>
                </div>

                <!-- In House Barcode -->
              



                <!-- Product Name -->
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Product Name</label>
                  <div class="icon-field">
                    <span class="icon">
                      <iconify-icon icon="mdi:tag-outline"></iconify-icon>
                    </span>
                    <input type="text" v-model="form.Product_Name" class="form-control" placeholder="Enter Product Name"
                      required />
                  </div>
                </div>

                <!-- Product Name Arabic -->
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Product Name (Arabic)</label>
                  <div class="icon-field">
                    <span class="icon">
                      <iconify-icon icon="mdi:translate"></iconify-icon>
                    </span>
                    <input type="text" v-model="form.Product_Name_ar" class="form-control" placeholder="Enter Arabic Name"
                      required />
                  </div>
                </div>

                <!-- Description -->
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Description</label>
                  <div class="icon-field">
                    <span class="icon">
                      <iconify-icon icon="mdi:text-box-outline"></iconify-icon>
                    </span>
                    <input type="text" v-model="form.Product_Description" class="form-control" placeholder="Enter Description"
                      required />
                  </div>
                </div>

                <!-- Price -->
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Price</label>
                  <div class="icon-field">
                    <span class="icon">
                      <iconify-icon icon="mdi:currency-usd"></iconify-icon>
                    </span>
                    <input type="number" v-model="form.Product_Price" class="form-control" placeholder="Enter Price" required />
                  </div>
                </div>

                <!-- Stock -->
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Stock</label>
                  <div class="icon-field">
                    <span class="icon">
                      <iconify-icon icon="mdi:warehouse"></iconify-icon>
                    </span>
                    <input type="number" v-model="form.Product_Stock" class="form-control" placeholder="Enter Stock" required />
                  </div>
                </div>

                <!-- Weight -->
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Weight (Kg)</label>
                  <div class="icon-field">
                    <span class="icon">
                      <!-- you can add a weight icon here -->
                    </span>
                    <input type="number" v-model="form.Weight_Kg" class="form-control" placeholder="Enter Weight (Kg)"
                      required />
                  </div>
                </div>

                <!-- Measurement Type -->
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Measurement Type</label>
                  <div class="icon-field">
                    <span class="icon">
                      <!-- unit icon -->
                    </span>
                    <select class="form-select" v-model="form.volume_type">
                      <option v-for="u in volumeUnitOptions" :key="u.value" :value="u.value">
                        {{ u.label }}
                      </option>
                    </select>
                  </div>
                </div>

                <!-- Length -->
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Length (cm)</label>
                  <div class="icon-field">
                    <span class="icon"></span>
                    <input type="number" v-model="form.Length_Cm" class="form-control" placeholder="Enter Length (Cm)"
                      required />
                  </div>
                </div>

                <!-- Width -->
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Width (cm)</label>
                  <div class="icon-field">
                    <span class="icon"></span>
                    <input type="number" v-model="form.Width_Cm" class="form-control" placeholder="Enter Width (Cm)"
                      required />
                  </div>
                </div>

                <!-- Height -->
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Height (cm)</label>
                  <div class="icon-field">
                    <span class="icon"></span>
                    <input type="number" v-model="form.Height_Cm" class="form-control" placeholder="Enter Height (Cm)"
                      required />
                  </div>
                </div>

              </div><!-- /.row -->
            </div><!-- /.card-body -->
          </div><!-- /.card -->


            <div class="card-footer d-flex justify-content-between">

      <button class="btn btn-secondary" @click="updateproducts()">Update Product</button>
    </div>


        </div>

        
      </div>
    </div>



  


  </div>



</template>