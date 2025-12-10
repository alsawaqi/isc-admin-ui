<script setup lang="ts">
import { definePageMeta, useNuxtApp } from '#imports'
import { ref, onMounted, reactive, watch } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'departments'
})

 


const { $axios, $r2Url } = (useNuxtApp() as any)

interface ProductBrand {
  id: number
  Products_Brands_Name: string
  Products_Brands_Name_Ar: string
  Brands_Image_Path: string
  created_at: string
  updated_at: string
}

/* =========================
   CREATE FORM STATE
========================= */
const name = ref<string>('')
const nameAr = ref<string>('')

const uploadedImage = ref<File | null>(null)
const previewUrl = ref<string | null>(null)

const isSubmit = ref<boolean>(false)
const isLoading = ref<boolean>(false)
const isEditOpen = ref<boolean>(false)
const editId = ref<number>(0);
const editName = ref<string>('');
const editNameAr = ref<string>('');
const editImageFile = ref<File | null>(null);
const editRemoveCurrentImage = ref<boolean>(false);
const editPreviewUrl = ref<string | null>(null);


/* list */
const productBrands = ref<ProductBrand[]>([])

const table = reactive({
  page: 1,
  perPage: 10,
  search: '',
  sortBy: 'id',
  sortDir: 'desc',
})

// paginator info from backend
const pagination = ref({
  total: 0,
  from: 0,
  to: 0,
  last_page: 1,
})



const getProductBrands = async () => {
  try {
    const { data } = await $axios.get('/api/productbrands', {
      params: {
        page: table.page,
        per_page: table.perPage,
        search: table.search,
        sort_by: table.sortBy,
        sort_dir: table.sortDir,
      },
    })


    productBrands.value = data.data;
    pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }


  } catch (error: any) {
    alert(
      'Failed to fetch product types: ' +
      (error?.response?.data?.message || error?.message || 'Unknown error')
    )
  }
};


watch(
  () => [table.page, table.perPage, table.search, table.sortBy, table.sortDir],
  async () => {
    await getProductBrands()
  }
)

/* handle create image select */
const handleFileChange = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  // cleanup previous blob
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }

  uploadedImage.value = file
  previewUrl.value = URL.createObjectURL(file)
}

const removeImage = () => {
  uploadedImage.value = null
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = null
}





/* create submit */
const submit = async (e: Event) => {
  e.preventDefault()

  if (!name.value) {
    alert('Please enter a brand name.')
    return
  }

  isSubmit.value = true
  try {
    const form = new FormData()
    form.append('name', name.value)
    form.append('name_ar', nameAr.value)
    if (uploadedImage.value) {
      form.append('image', uploadedImage.value) // <- use "image" (or "file" if your backend uses file)
    }

    await $axios.post('/api/productbrands', form, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    alert('Product Brand created successfully')

    // reset create form
    name.value = ''
    nameAr.value = ''
    removeImage()
    await getProductBrands()
  } catch (error: any) {
    alert(
      'Failed to create product brand: ' +
      (error?.response?.data?.message || error?.message || 'Unknown error')
    )
  } finally {
    isSubmit.value = false
  }
}



/* open modal */
const openEditModal = (brand: ProductBrand) => {
  isEditOpen.value = true

  editId.value = brand.id
  editName.value = brand.Products_Brands_Name
  editNameAr.value = brand.Products_Brands_Name_Ar

  // show current brand image in preview
  editImageFile.value = null
  editPreviewUrl.value = brand.Brands_Image_Path
    ? `${$r2Url}/` + brand.Brands_Image_Path
    : null

  editRemoveCurrentImage.value = false
}

/* close modal */
const closeEditModal = () => {
  isEditOpen.value = false
}

/* user selects a new image in modal */
const handleEditImageChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  // revoke old blob if any
  if (editPreviewUrl.value && editPreviewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(editPreviewUrl.value)
  }

  editImageFile.value = file
  editPreviewUrl.value = URL.createObjectURL(file)

  // since user chose new one, we're not removing
  editRemoveCurrentImage.value = false
}

/* user clicks × on image in modal */
const removeEditImage = () => {
  if (editPreviewUrl.value && editPreviewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(editPreviewUrl.value)
  }

  editImageFile.value = null
  editPreviewUrl.value = null

  // tell backend to remove existing image if we submit like this
  editRemoveCurrentImage.value = true
}

/* submit edit */
const updateBrand = async (e: Event) => {
  e.preventDefault()
  if (!editId.value) {
    alert('No brand selected')
    return
  }

  isSubmit.value = true
  try {
    const form = new FormData()
    form.append('name', editName.value ?? '')
    form.append('name_ar', editNameAr.value ?? '')

    // if a new file is chosen, send it
    if (editImageFile.value instanceof File) {
      form.append('image', editImageFile.value)
    }

    // if user removed existing image and didn't upload new one
    if (editRemoveCurrentImage.value && !editImageFile.value) {
      form.append('remove_image', '1')
    }

    // send update request
    await $axios.post(`/api/productbrands/${editId.value}`, form, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    // refresh list
    await getProductBrands()

    // close modal
    isEditOpen.value = false
  } catch (error: any) {
    alert(
      'Failed to update product brand: ' +
      (error?.response?.data?.message || error?.message || 'Unknown error')
    )
  } finally {
    isSubmit.value = false
  }
}

/* delete handler (optional) */
const deleteBrand = async (id: number) => {
  if (!confirm('Are you sure you want to delete this brand?')) return

  try {
    await $axios.delete(`/api/productbrands/${id}`)
    await getProductBrands()
  } catch (error: any) {
    alert(
      'Failed to delete product brand: ' +
      (error?.response?.data?.message || error?.message || 'Unknown error')
    )
  }
}

/* initial load */
onMounted(async () => {
  await getProductBrands();
})
</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #eab308">Create Brands</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">Create Brands</li>
      </ul>
    </div>

    <div class="card h-100 p-0 radius-12 overflow-hidden">
      <div class="card-body p-40">
        <form @submit.prevent="submit" class="row g-4">
          <div class="row">
            <div class="col-sm-12">
              <div class="mb-20">
                <label for="brand-name" class="form-label fw-semibold text-primary-light text-sm mb-8">
                  Name <span class="text-danger-600">*</span>
                </label>
                <input id="brand-name" type="text" class="form-control radius-8" v-model="name"
                  placeholder="Enter Brand Name" required />
              </div>


              <div class="mb-20">
                <label for="brand-name" class="form-label fw-semibold text-primary-light text-sm mb-8">
                  Name (Arabic)<span class="text-danger-600">*</span>
                </label>
                <input id="brand-name" type="text" class="form-control radius-8" v-model="nameAr"
                  placeholder="Enter Brand Name in Arabic" required />
              </div>

              <div class="mb-20">
                <div class="card h-100 p-0">
                  <div class="card-header border-bottom bg-base py-16 px-24">
                    <h6 class="text-lg fw-semibold mb-0">Upload With image preview</h6>
                  </div>

                  <div class="card-body p-24">
                    <div class="upload-image-wrapper d-flex align-items-center gap-3 flex-wrap">
                      <!-- Preview -->
                      <div v-if="previewUrl" class="position-relative" style="width: 100px; height: 100px;">
                        <img :src="previewUrl" class="img-fluid radius-8 w-100 h-100 object-fit-cover" />
                        <button class="btn btn-sm btn-danger position-absolute top-0 end-0" @click="removeImage"
                          type="button" style="transform: translate(50%, -50%);">
                          ×
                        </button>
                      </div>

                      <!-- Upload button -->
                      <label v-else
                        class="upload-file-multiple h-120-px w-120-px border input-form-light radius-8 overflow-hidden border-dashed bg-neutral-50 bg-hover-neutral-200 d-flex align-items-center flex-column justify-content-center gap-1">
                        <iconify-icon icon="solar:camera-outline" class="text-xl text-secondary-light"></iconify-icon>
                        <span class="fw-semibold text-secondary-light">Upload</span>
                        <input type="file" hidden accept="image/*" @change="handleFileChange" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
              <button type="reset"
                class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8"
                @click="
                  name = '';
                removeImage();
                ">
                Reset
              </button>

              <button type="submit" class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"
                :disabled="isSubmit">
                <span v-if="isSubmit" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span v-else>+</span>
                Save Change
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- LIST -->
  <div class="dashboard-main-body">
    <div class="col-lg-12">
      <div class="card">
        <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div class="d-flex flex-wrap align-items-center gap-3">
            <div class="d-flex align-items-center gap-2">
              <span>Show</span>
              <select v-model.number="table.perPage" class="form-select form-select-sm w-auto">
                <option :value="10">10</option>
                <option :value="15">15</option>
                <option :value="20">20</option>
              </select>


            </div>

            <div class="icon-field">
              <input type="text" class="form-control form-control-sm w-auto" placeholder="Search"
                v-model="table.search" />
              <span class="icon">
                <iconify-icon icon="ion:search-outline"></iconify-icon>
              </span>
            </div>
          </div>
        </div>

        <div class="card-body">
          <table class="table bordered-table mb-0">
            <thead>
              <tr>
                <th scope="col">
                  <div class="form-check style-check d-flex align-items-center">
                  
                    <label class="form-check-label" for="checkAll">
                      S.L
                    </label>
                  </div>
                </th>

                <th scope="col">Name</th>

                <th scope="col">Action</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="(productBrand, index) in productBrands" :key="productBrand.id">
                <td>
                  <div class="form-check style-check d-flex align-items-center">
                  
                    <label class="form-check-label" :for="'check-' + productBrand.id">
                      {{ index + 1 }}
                    </label>
                  </div>
                </td>

                <td>
                  <div class="d-flex align-items-center">
                    <img :src="`${$r2Url}/` + productBrand.Brands_Image_Path" alt=""
                      class="flex-shrink-0 me-12 radius-8" style="width: 50px; height: 50px; object-fit: cover;" />
                    <h6 class="text-md mb-0 fw-medium flex-grow-1">
                      {{ productBrand.Products_Brands_Name }}
                    </h6>
                  </div>
                </td>

                <td>
                  <!-- EDIT -->
                  <a href="javascript:void(0)"
                    class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center"
                    @click.prevent="openEditModal(productBrand)">
                    <iconify-icon icon="lucide:edit"></iconify-icon>
                  </a>

                  <!-- DELETE -->
                  <a href="javascript:void(0)"
                    class="w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center"
                    @click.prevent="deleteBrand(productBrand.id)">
                    <iconify-icon icon="mingcute:delete-2-line"></iconify-icon>
                  </a>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-24">
            <span>
              Showing {{ pagination.from || 0 }} to {{ pagination.to || 0 }} of {{ pagination.total || 0
              }} entries
            </span>
            <ul class="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
              <!-- Prev -->
              <li class="page-item" :class="{ disabled: table.page === 1 }">
                <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                  href="javascript:void(0)" @click="table.page > 1 && (table.page -= 1)">
                  <iconify-icon icon="ep:d-arrow-left" class="text-xl"></iconify-icon>
                </a>
              </li>

              <!-- Page numbers -->
              <li v-for="p in pagination.last_page" :key="p" class="page-item">
                <a href="javascript:void(0)" @click="table.page = p" :class="[
                  'page-link fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px',
                  p === table.page
                    ? 'bg-primary-600 text-white'
                    : 'bg-primary-50 text-secondary-light'
                ]">
                  {{ p }}
                </a>
              </li>

              <!-- Next -->
              <li class="page-item" :class="{ disabled: table.page === pagination.last_page }">
                <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                  href="javascript:void(0)" @click="table.page < pagination.last_page && (table.page += 1)">
                  <iconify-icon icon="ep:d-arrow-right" class="text-xl"></iconify-icon>
                </a>
              </li>
            </ul>

          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- EDIT MODAL -->
  <transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0"
    enter-to-class="opacity-100" leave-active-class="transition-opacity duration-150" leave-from-class="opacity-100"
    leave-to-class="opacity-0">
    <div v-if="isEditOpen" class="modal-backdrop" @click.self="closeEditModal">
      <div class="modal-card" role="dialog" aria-modal="true">
        <!-- Header -->
        <div class="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
          <h6 class="fw-semibold mb-0">Edit Brand</h6>
          <button type="button" class="btn btn-sm btn-outline-secondary" @click="closeEditModal">
            ✕
          </button>
        </div>

        <!-- Body -->
        <form @submit.prevent="updateBrand">
          <!-- Name -->
          <div class="mb-3">
            <label class="form-label fw-semibold text-sm">
              Name <span class="text-danger">*</span>
            </label>
            <input type="text" class="form-control radius-8" placeholder="Enter brand name" v-model="editName"
              required />
          </div>


          <div class="mb-3">
            <label class="form-label fw-semibold text-sm">
              Name (Arabic)<span class="text-danger">*</span>
            </label>
            <input type="text" class="form-control radius-8" placeholder="Enter brand name in Arabic"
              v-model="editNameAr" required />
          </div>

          <!-- Image -->
          <div class="mb-3">
            <div class="mb-2 fw-semibold text-sm">Logo / Image</div>

            <!-- Current / New Preview -->
            <div v-if="editPreviewUrl" class="position-relative mb-2" style="width: 120px; height: 120px;">
              <img :src="editPreviewUrl" class="img-fluid radius-8 w-100 h-100 object-fit-cover" />
              <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0"
                style="transform: translate(50%, -50%);" @click="removeEditImage">
                ×
              </button>
            </div>

            <!-- Upload box if no preview -->
            <label v-else
              class="upload-file-multiple h-120-px w-120-px border input-form-light radius-8 overflow-hidden border-dashed bg-neutral-50 bg-hover-neutral-200 d-inline-flex align-items-center flex-column justify-content-center gap-1 cursor-pointer">
              <iconify-icon icon="solar:camera-outline" class="text-xl text-secondary-light"></iconify-icon>
              <span class="fw-semibold text-secondary-light">Upload</span>
              <input type="file" hidden accept="image/*" @change="handleEditImageChange" />
            </label>
          </div>

          <!-- Actions -->
          <div class="d-flex align-items-center justify-content-end gap-2">
            <button type="button" class="btn btn-outline-secondary" @click="closeEditModal">
              Cancel
            </button>

            <button type="submit" class="btn btn-primary" :disabled="isSubmit">
              <span v-if="isSubmit" class="spinner-border spinner-border-sm me-1" role="status"
                aria-hidden="true"></span>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.5);
  display: grid;
  place-items: center;
  z-index: 1050;
}

.modal-card {
  width: min(480px, 92vw);
  max-height: 90vh;
  overflow: auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, .18);
  padding: 20px;
}
</style>
