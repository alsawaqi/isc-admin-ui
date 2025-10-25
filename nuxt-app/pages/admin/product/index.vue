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

const { getProductType } = useProductType();
const { getProductBrands } = useProductsBrands();

const steps = ref(1);


const uploadedImages = ref<File[]>([])
const previewUrls = ref<string[]>([])

const barcodes = ref<string[]>([]);

const showBarcodeModal = ref(false);

const handleFileChange = (event: Event) => {
  const files = (event.target as HTMLInputElement).files
  if (!files) return

  for (const file of Array.from(files)) {
    uploadedImages.value.push(file)
    previewUrls.value.push(URL.createObjectURL(file))
  }
}

const removeImage = (index: number) => {
  uploadedImages.value.splice(index, 1)
  URL.revokeObjectURL(previewUrls.value[index])
  previewUrls.value.splice(index, 1)
}

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


const restart = async () => {

  steps.value = 1;

  form.value = {
    product_department_id: 0,
    product_sub_department_id: 0,
    product_sub_sub_department_id: 0,
    product_type_id: '',
    product_brand_id: '',
    product_manufacture_id: '',
    name: '',
    name_ar: '',
    description: '',
    inhouse_barcode: '',
    product_sku: '',
    price: 0,
    stock: 0,
    volume_type: '',
    Weight_Kg: 0,
    Length_Cm: 0,
    Width_Cm: 0,
    Height_Cm: 0

  };
  barcodes.value = [];
  uploadedImages.value = [];
  previewUrls.value.forEach(url => URL.revokeObjectURL(url));
  previewUrls.value = [];

  await getLatestProducts();
};


interface Product_id {
  id: number;
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

interface ProductType {
  id: number;
  Product_Types_Name: string;
}

interface ProductBrand {
  id: number;
  Products_Brands_Name: string;
}

interface ProductManufacture {
  id: number;
  Products_Manufacture_Name: string;

}

interface ProductSpecificationDescription {
  id: number;
  Product_Specification_Description_Name: string;
  product_sub_sub_department_id: number;
  created_at: string;
  updated_at: string;
}

interface SpecOption { id: number; value: string }

interface ProductSpecificationProductVM {
  product_specification_description_id: number
  Product_Specification_Description_Name: string
  options: SpecOption[]          // <-- dropdown options from Product_Specification_Value_T
  product_specification_value_id?: number | null // <-- the chosen value id
}


const form = ref<Product>({
  product_department_id: 0,
  product_sub_department_id: 0,
  product_sub_sub_department_id: 0,
  product_type_id: '',
  product_brand_id: '',
  product_manufacture_id: '',
  name: '',
  name_ar: '',
  description: '',
  inhouse_barcode: '',
  product_sku: '',
  price: 0,
  stock: 0,
  volume_type: 'cm' as 'mm' | 'cm' | 'm' | 'in' | 'ft', // default
  Weight_Kg: 0,
  Length_Cm: 0,
  Width_Cm: 0,
  Height_Cm: 0
});



const volumeUnitOptions = [
  { value: 'mm', label: 'Millimeter (mm)' },
  { value: 'cm', label: 'Centimeter (cm)' },
  { value: 'm', label: 'Meter (m)' },
  { value: 'in', label: 'Inch (in)' },
  { value: 'ft', label: 'Foot (ft)' },
]

const product_id = ref<Number>(0);
const productTypes = ref<ProductType[]>([]);
const productBrands = ref<ProductBrand[]>([]);
const ProductManufactures = ref<ProductManufacture[]>([]);
const departments = ref<Department[]>([]);
const subDepartments = ref<SubDepartment[]>([]);
const subSubDepartments = ref<SubSubDepartment[]>([]);
const productSpecificationProducts = ref<ProductSpecificationProductVM[]>([]);
const loading = ref<boolean>(false);
const loadingProducts = ref<boolean>(false);
const randomDigits = ref<Number>(0);


const isStep1Valid = computed(() => {
  return (
    form.value.product_department_id &&
    form.value.product_sub_department_id &&
    form.value.product_sub_sub_department_id &&
    form.value.product_type_id &&
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

const getproductspecifications = async (subSubDeptId: number) => {
  try {
    const response = await $axios.get('/api/product-specifications', {
      params: { product_sub_sub_department_id: subSubDeptId }
    })

    // Expecting each item like:
    // { id, Product_Specification_Description_Name, values: [{id, value}, ...] }
    productSpecificationProducts.value = response.data.map((spec: any) => ({
      Product_Specification_Description_Name: spec.Product_Specification_Description_Name,
      product_specification_description_id: spec.id,
      options: (spec.values || []).map((v: any) => ({ id: v.id, value: v.value })),
      product_specification_value_id: null
    }))
  } catch (error) {
    console.error('Failed to fetch product specifications:', error)
    throw error
  }
}

const getManufactures = async () => {

  try {
    const response = await $axios.get('/api/productmanufacture');
    ProductManufactures.value = response.data;
  } catch (error) {
    console.error('Failed to fetch manufactures:', error);
    throw error;
  } finally {

  }

};


// Watchers for cascading
watch(() => form.value.product_department_id, fetchSubDepartments)
watch(() => form.value.product_sub_department_id, fetchSubSubDepartments)



const getLatestProducts = async () => {
  loadingProducts.value = true
  try {
    const response = await $axios.get('/api/latest-products')

    product_id.value = Number(response.data) > 0 ? Number(response.data) + 1 : 1;



    // Generate inhouse barcode with random 5 digits
    randomDigits.value = Math.floor(10000 + Math.random() * 90000)
    form.value.inhouse_barcode = `${product_id.value}-${randomDigits.value}`

  } catch (error) {
    console.error('Failed to fetch latest products:', error)
    throw error
  } finally {
    loadingProducts.value = false
  }
}


// watch(() => form.value.product_sub_sub_department_id, async () => {
//   try {
//     const specifications = await getproductspecifications(form.value.product_sub_sub_department_id);
//     console.log('Product specifications:', specifications);
//   } catch (error) {
//     console.error('Error fetching product specifications:', error);
//   }
// });


const submitForm = async () => {
  loading.value = true

  try {
    const formData = new FormData()

    // Append regular fields
    formData.append('product_department_id', form.value.product_department_id.toString())
    formData.append('product_sub_department_id', form.value.product_sub_department_id.toString())
    formData.append('product_sub_sub_department_id', form.value.product_sub_sub_department_id.toString())
    formData.append('product_type_id', form.value.product_type_id.toString())
    if (form.value.product_brand_id !== 0) {
      formData.append('product_brand_id', form.value.product_brand_id.toString())
    }

    formData.append('product_manufacture_id', form.value.product_manufacture_id.toString())
    formData.append('name', form.value.name)
    formData.append('name_ar', form.value.name_ar)
    formData.append('description', form.value.description)
    formData.append('inhouse_barcode', randomDigits.value.toString())
    formData.append('price', form.value.price.toString())
    formData.append('stock', form.value.stock.toString())
    formData.append('Weight_Kg', form.value.Weight_Kg.toString())
    formData.append('Length_Cm', form.value.Length_Cm.toString())
    formData.append('Width_Cm', form.value.Width_Cm.toString())
    formData.append('Height_Cm', form.value.Height_Cm.toString())
    formData.append('volume_type', form.value.volume_type)
    formData.append('product_sku', form.value.product_sku)

    // Append barcodes as JSON string
    formData.append('barcodes', JSON.stringify(barcodes.value))



    // Append multiple images
    uploadedImages.value.forEach((file, index) => {
      formData.append(`file[]`, file)
    })


    const currentSubSubId = form.value.product_sub_sub_department_id;

    const response = await $axios.post('/api/productmaster', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    await getproductspecifications(currentSubSubId);

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
      product_sku: '',

      price: 0,
      stock: 0,
      volume_type: '',
      Weight_Kg: 0,
      Length_Cm: 0,
      Width_Cm: 0,
      Height_Cm: 0
    }


    barcodes.value = []
    uploadedImages.value = []
    previewUrls.value.forEach(url => URL.revokeObjectURL(url))
    previewUrls.value = []


    product_id.value = response.data.data.id;
    steps.value = 3




  } catch (error) {
    if (typeof error === 'object' && error !== null && 'response' in error && error.response && typeof error.response === 'object' && 'data' in error.response) {

      console.error('Submission failed:', error.response.data)
    } else if (error instanceof Error) {
      console.error('Submission failed:', error.message)
    } else {
      console.error('Submission failed:', error)
    }
  } finally {
    loading.value = false
  }
}





const submitSpecs = async () => {
  // only send rows where the user actually chose a value
  const chosen = productSpecificationProducts.value
    .filter(s => s.product_specification_value_id != null)
    .map(s => ({
      product_specification_description_id: s.product_specification_description_id,
      product_specification_value_id: s.product_specification_value_id
    }))

  if (chosen.length === 0) {
    alert('Please select at least one specification value.')
    return
  }

  try {
    await $axios.post('/api/product-specification-products', {
      product_id: Number(product_id.value),
      specifications: chosen
    }) // axios sends JSON by default

    await getLatestProducts()
    steps.value = 1
    productSpecificationProducts.value = []
  } catch (error) {
    console.error('Failed to save product specs:', error)
    alert('Failed to save product specs')
  }
}







watch(() => barcodes.value[0], (newVal) => {
  if (newVal === '') {
    barcodes.value.splice(0, 1);
  }
});


onMounted(async () => {

  if (barcodes.value.length === 0) {
    barcodes.value.push('');
  }

  await getLatestProducts()


  try {
    productTypes.value = await getProductType();
    productBrands.value = await getProductBrands();
    await getManufactures();
  } catch (error) {
    console.error('Failed to load product types:', error);
  }
  await fetchDepartments()
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
        <li class="fw-medium">Creating Products</li>
      </ul>
    </div>

    <div class="row gy-4">
      <div class="col-lg-12">
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">Create a product for id number <span v-if="loadingProducts">loading...</span>
              <span v-else>{{ product_id }}</span></h5>
          </div>


          <div class="card" v-show="steps === 1">
            <div class="card-header">
              <h6>Product Details</h6>
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
                    <select class="form-select" v-model="form.product_department_id" required>
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
                    <select class="form-select" v-model="form.product_sub_department_id" required>
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
                    <select class="form-select" v-model="form.product_sub_sub_department_id" required>
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
                    <select class="form-select" v-model="form.product_type_id" required>
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
                    <select class="form-select" v-model="form.product_brand_id" required>
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
                    <select class="form-select" v-model="form.product_manufacture_id" required>
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
                    <input type="text" v-model="form.product_sku" class="form-control"
                      placeholder="Enter Product Sku" />
                  </div>
                </div>

                <!-- In House Barcode -->
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">In House Barcode</label>
                  <div class="icon-field">
                    <span class="icon">
                      <iconify-icon icon="mdi:barcode"></iconify-icon>
                    </span>
                    <input type="text" v-model="form.inhouse_barcode" class="form-control"
                      placeholder="Enter In house Barcode" disabled readonly />
                  </div>
                </div>

                <!-- Manufacturer Barcodes -->
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold d-flex justify-content-between align-items-center">
                    <span>Manufacturer Barcodes</span>
                    <small class="text-muted">({{ barcodes.length }} total)</small>
                  </label>
                  <div class="d-flex align-items-center gap-3">
                    <input type="text" v-model="barcodes[0]" class="form-control" placeholder="Enter Barcode" />
                    <button type="button" class="btn btn-outline-primary" @click="showBarcodeModal = true">
                      Manage
                    </button>
                  </div>
                </div>

                <!-- Product Name -->
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Product Name</label>
                  <div class="icon-field">
                    <span class="icon">
                      <iconify-icon icon="mdi:tag-outline"></iconify-icon>
                    </span>
                    <input type="text" v-model="form.name" class="form-control" placeholder="Enter Product Name"
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
                    <input type="text" v-model="form.name_ar" class="form-control" placeholder="Enter Arabic Name"
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
                    <input type="text" v-model="form.description" class="form-control" placeholder="Enter Description"
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
                    <input type="number" v-model="form.price" class="form-control" placeholder="Enter Price" required />
                  </div>
                </div>

                <!-- Stock -->
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Stock</label>
                  <div class="icon-field">
                    <span class="icon">
                      <iconify-icon icon="mdi:warehouse"></iconify-icon>
                    </span>
                    <input type="number" v-model="form.stock" class="form-control" placeholder="Enter Stock" required />
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


          <div class="card-body" v-show="steps === 2">
            <h5 class="mb-3">Upload Image for {{ form.name }}</h5>


            <div class="upload-image-wrapper d-flex align-items-center gap-3 flex-wrap">

              <!-- Multiple previews with remove buttons -->
              <div v-for="(url, index) in previewUrls" :key="index" class="position-relative"
                style="width: 100px; height: 100px;">
                <img :src="url" class="img-fluid radius-8 w-100 h-100 object-fit-cover" />
                <button class="btn btn-sm btn-danger position-absolute top-0 end-0" @click="removeImage(index)"
                  style="transform: translate(50%, -50%);">
                  ×
                </button>
              </div>

              <!-- Upload Button (always visible to add more) -->
              <label
                class="upload-file-multiple h-120-px w-120-px border input-form-light radius-8 overflow-hidden border-dashed bg-neutral-50 bg-hover-neutral-200 d-flex align-items-center flex-column justify-content-center gap-1"
                for="upload-file">
                <iconify-icon icon="solar:camera-outline" class="text-xl text-secondary-light"></iconify-icon>
                <span class="fw-semibold text-secondary-light">Upload</span>
                <input id="upload-file" type="file" hidden multiple accept="image/*" @change="handleFileChange" />
              </label>
            </div>





          </div>







          <div class="card" v-show="steps === 3">


            <div class="card-header">
              <h6>Enter Product Feature Values</h6>

            </div>
            <div class="card-body">


              <div class="row mb-24 gy-3 align-items-center" v-for="(spec, index) in productSpecificationProducts"
                :key="spec.product_specification_description_id">
                <label class="form-label mb-0 col-sm-2">{{ spec.Product_Specification_Description_Name }}</label>
                <div class="col-sm-10">
                  <div class="icon-field">


                    <select class="form-select" v-model.number="spec.product_specification_value_id"
                      :disabled="spec.options.length === 0">
                      <option :value="null" disabled>Select a value</option>
                      <option v-for="opt in spec.options" :key="opt.id" :value="opt.id">
                        {{ opt.value }}
                      </option>
                    </select>

                    <small v-if="spec.options.length === 0" class="text-muted">
                      No values configured for this spec yet.
                    </small>
                  </div>
                </div>
              </div>









            </div>





          </div>




          <div class="card-footer d-flex justify-content-between">
            <button class="btn btn-secondary border border-primary-600 text-md px-24 py-12 radius-8" @click="prevStep()"
              :disabled="steps === 1" v-if="steps !== 3">Previous</button>

            <button class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8" @click="nextStep()"
              v-if="steps !== 2 && steps !== 3" :disabled="!isStep1Valid"> Next</button>

            <button class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"
              @click.prevent="submitForm()" v-if="steps === 2" :disabled="loading">
              <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"
                aria-hidden="true"></span>
              Submit
            </button>


            <button class="btn btn-secondary border border-primary-600 text-md px-24 py-12 radius-8" @click="restart()"
              v-if="steps === 3">Reset</button>
            <button class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"
              @click.prevent="submitSpecs()" v-if="steps === 3">
              <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"
                aria-hidden="true"></span>
              Submit Specifications
            </button>



          </div>

        </div>
      </div>
    </div>



  </div>


  <!-- Barcode Modal -->
  <teleport to="body">
    <div v-if="showBarcodeModal">
      <div class="modal-backdrop fade show"></div>
      <div class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.3)">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Manage Additional Barcodes ({{ barcodes.length }})</h5>
              <button type="button" class="btn-close" @click="showBarcodeModal = false"></button>
            </div>
            <div class="modal-body">
              <div v-for="(barcode, index) in barcodes" :key="index" class="d-flex align-items-center gap-2 mb-2">

                <input type="text" v-model="barcodes[index]" class="form-control" placeholder="Enter Barcode" required>
                <button type="button" class="btn btn-danger mt-2" @click="barcodes.splice(index, 1)">Remove</button>
              </div>
              <button type="button" class="btn btn-success" @click="addBarcode">Add Barcode</button>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="showBarcodeModal = false">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </teleport>




</template>