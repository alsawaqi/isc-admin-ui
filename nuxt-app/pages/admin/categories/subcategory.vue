<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { definePageMeta,useNuxtApp } from '#imports';
import { useFlashStore } from '~/stores/flashs'

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'departments'
})

const { $axios, $r2Url } = (useNuxtApp() as any)

const flash = useFlashStore()


interface Department {
  id: number;
  Product_Department_Code: string;
  Product_Department_Name: string;
}

interface SubDepartment {
  id: number;
  Products_Department_Code: string;
  Products_Departments_Id: number;
  Sub_Department_Name: string;
  Sub_Department_Name_Ar: string;
  Image_path: string;
  created_at: string;
}

interface DepartmentWithSubs extends Department {
  sub_departments: SubDepartment[];
}

/* -----------------
   CREATE form state
------------------*/
const departments = ref<DepartmentWithSubs[]>([])
const selectedDepartmentId = ref<string>('')
const name = ref<string>('')
const namear = ref<string>('')

const uploadedImage = ref<File | null>(null)
const previewUrl = ref<string | null>(null)

const isSubmit = ref<boolean>(false)
const isLoading = ref<boolean>(false)

/* expand/collapse tree */
const expandedDepartments = ref<{ [key: number]: boolean }>({})
const toggleDepartment = (id: number) => {
  expandedDepartments.value[id] = !expandedDepartments.value[id]
}

/* -----------------
   EDIT modal state
------------------*/
const isEditOpen = ref<boolean>(false);

const editSubDeptId = ref<number | null>(null);
const editParentDeptId = ref<number | null>(null);
const editName = ref<string>('');
const editNamear = ref<string>('');

const updateImageFile = ref<File | null>(null)          // new file user picked (if any)
const updatePreview = ref<string | null>(null)          // what we display in the modal
const removeCurrentImage = ref<boolean>(false)          // did user hit "×" to remove?

/* -----------------
   CREATE handlers
------------------*/
const handleFileChange = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  // cleanup old blob if present
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

/* -----------------
   EDIT handlers
------------------*/

// open modal with data from row
const openEditModal = (subDept: SubDepartment) => {
  isEditOpen.value = true

  editSubDeptId.value = subDept.id
  editParentDeptId.value = subDept.Products_Departments_Id
  editName.value = subDept.Sub_Department_Name
  editNamear.value = subDept.Sub_Department_Name_Ar

  // show existing server image initially
  updateImageFile.value = null
  updatePreview.value = subDept.Image_path ? `${$r2Url}/` + subDept.Image_path : null

  // user has NOT removed it yet
  removeCurrentImage.value = false
}

// close modal & cleanup
const closeEditModal = () => {
  isEditOpen.value = false

  // optional: cleanup blob previews to avoid leaks
  if (updatePreview.value && updatePreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(updatePreview.value)
  }
  updatePreview.value = null
  updateImageFile.value = null
  editSubDeptId.value = null
  editParentDeptId.value = null
  editName.value =  ''
  editNamear.value =  ''
  removeCurrentImage.value = false
}

// when user selects new image in EDIT modal
const handleUpdateImageChange = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  // revoke old blob preview if any
  if (updatePreview.value && updatePreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(updatePreview.value)
  }

  updateImageFile.value = file
  updatePreview.value = URL.createObjectURL(file)

  // once they pick a new file, it's obviously not "removed"
  removeCurrentImage.value = false
}

// user clicked × in EDIT modal (meaning "remove current/preview image")
const removeUpdateImage = () => {
  // revoke blob if any
  if (updatePreview.value && updatePreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(updatePreview.value)
  }

  updatePreview.value = null
  updateImageFile.value = null

  // if this was just hiding server image and no new file, mark remove request
  removeCurrentImage.value = true
}

/* -----------------
   API calls
------------------*/

const createSubDepartment = async (e: Event) => {
  isSubmit.value = true
  e.preventDefault()

  if (!selectedDepartmentId.value || !name.value) {
    alert('Please select a department and enter a name.')
    isSubmit.value = false
    return
  }

  const formData = new FormData()
  formData.append('product_department_id', selectedDepartmentId.value)
  formData.append('name', name.value);
  formData.append('namear', namear.value);

  if (uploadedImage.value) {
    // NOTE: backend currently expects "file" according to your code
    formData.append('file', uploadedImage.value)
  }

  try {
    await $axios.post('/api/productsubdepartment', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    name.value = ''
    namear.value = ''
    selectedDepartmentId.value = ''
    if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl.value)
    }
    uploadedImage.value = null
    previewUrl.value = null

    flash.success('Sub department created successfully')

  } catch (error: any) {
    flash.error('Failed to create sub department: ' + error.message)
  } finally {
    await getsubDepartments()
    isSubmit.value = false
  }
}

// UPDATE sub department
const updateSubDepartment = async (e: Event) => {
  e.preventDefault()
  if (!editSubDeptId.value) return
  isSubmit.value = true

  try {
    const formData = new FormData()

    // backend fields you'll likely need:
    formData.append('name', editName.value ?? '')
    formData.append('namear', editNamear.value ?? '')
    formData.append('product_department_id', String(editParentDeptId.value ?? ''))

    // If user picked a NEW file
    if (updateImageFile.value instanceof File) {
      // IMPORTANT: match backend param name.
      // Your department update endpoint expected 'image' (after you fixed it).
      // Let's assume subdepartment update does the same (adjust if needed).
      formData.append('image', updateImageFile.value)
    }

    // If they explicitly removed the existing image and did NOT upload new one
    if (removeCurrentImage.value && !updateImageFile.value) {
      formData.append('remove_image', '1')
    }

   
    const res = await $axios.post(
      `/api/productsubdepartment/${editSubDeptId.value}`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    )

    
    flash.success('Sub department updated successfully')
    await getsubDepartments()
    closeEditModal()

  } catch (err: any) {
    flash.error('Failed to update sub department: ' + err.message)
  } finally {
    isSubmit.value = false
  }
}

/* -----------------
   Fetch data
------------------*/

const getDepartments = async () => {
  try {
    const res = await $axios.get('/api/productdepartment/all')
    departments.value = res.data
  } catch (error) {
    console.error('Failed to load departments:', error)
  }
}

const getsubDepartments = async () => {
  isLoading.value = true
  try {
    const res = await $axios.get('/api/product-departments-with-sub')
    departments.value = res.data
  } catch (error) {
    console.error('Failed to load sub departments:', error)
  } finally {
    isLoading.value = false
  }
}

const deleteSubDepartment = async (id: number) => {
  const ok = await flash.confirm({
    title: 'Delete department?',
    message: `Are you sure you want to delete "${name}"? This cannot be undone.`,
    confirmText: 'Yes, delete',
    cancelText: 'No, cancel',
  })
  if (!ok) return;

  try {
  const success =  await $axios.delete(`/api/productsubdepartment/${id}`)
    if (success) {
      flash.success('Sub department deleted successfully')
    }  
    await getsubDepartments()
  } catch (error: any) {
      flash.error('Failed to delete sub department: ' + error.message)
    
  }
}

onMounted(async () => {
  await getDepartments()
  await getsubDepartments()
})
</script>

<template>
  <!-- CREATE FORM -->
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #73da1b">Sub Department</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">Sub Department</li>
      </ul>
    </div>

    <div class="card h-100 p-0 radius-12 overflow-hidden">
      <div class="card-body p-40">
        <form @submit.prevent="createSubDepartment" class="row g-4">
          <div class="row">
            <div class="col-sm-12">

              <!-- Parent Department -->
                <div class="mb-20">
                <label class="form-label">Product Department </label>
                <select class="form-control rounded-lg form-select" v-model="selectedDepartmentId">
                  <option value="">Select Product Department</option>
                  <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                    {{ dept.Product_Department_Name }}
                  </option>
                </select>
              </div>

      
              <div class="mb-20">
                <label for="address" class="form-label fw-semibold text-primary-light text-sm mb-8">
                  Name <span class="text-danger-600">*</span>
                </label>
                <input type="text" class="form-control radius-8" id="address" v-model="name"
                  placeholder="Enter Your Name" />
              </div>


               <div class="mb-20">
                <label for="address" class="form-label fw-semibold text-primary-light text-sm mb-8">
                  Name  (Arabic)<span class="text-danger-600">*</span>
                </label>
                <input type="text" class="form-control radius-8" id="address" v-model="namear"
                  placeholder="Enter Your Name" />
              </div>

              <!-- Image Upload (CREATE) -->
              <div class="mb-20">
                <div class="card h-100 p-0">
                  <div class="card-header border-bottom bg-base py-16 px-24">
                    <h6 class="text-lg fw-semibold mb-0">Upload With image preview</h6>
                  </div>
                  <div class="card-body p-24">
                    <div class="upload-image-wrapper d-flex align-items-center gap-3 flex-wrap">

                      <!-- If preview exists -->
                      <div v-if="previewUrl" class="position-relative" style="width: 100px; height: 100px;">
                        <img :src="previewUrl" class="img-fluid radius-8 w-100 h-100 object-fit-cover" />
                        <button class="btn btn-sm btn-danger position-absolute top-0 end-0" type="button"
                          @click="removeImage" style="transform: translate(50%, -50%);">
                          ×
                        </button>
                      </div>

                      <!-- Otherwise show upload box -->
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
                class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8">
                Reset
              </button>
              <button type="submit" class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"
                :disabled="isSubmit">
                <span v-if="isSubmit" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                Save Change
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- LIST / TREE -->
  <div class="dashboard-main-body">
    <div class="col-lg-12">
      <div class="card">
        <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div class="d-flex flex-wrap align-items-center gap-3">
            <div class="d-flex align-items-center gap-2">
              <span>Show</span>
              <select class="form-select form-select-sm w-auto">
                <option>10</option>
                <option>15</option>
                <option>20</option>
              </select>

              <select class="form-select form-select-sm w-auto">
                <option>status</option>
                <option>Paid</option>
                <option>Pending</option>
              </select>
            </div>
            <div class="icon-field">
              <input type="text" name="#0" class="form-control form-control-sm w-auto" placeholder="Search" />
              <span class="icon">
                <iconify-icon icon="ion:search-outline"></iconify-icon>
              </span>
            </div>
          </div>
        </div>

        <div class="card-body">
          <div class="ml-4">
            <p class="font-bold text-gray-700">View Categories</p>

            <div class="spinner-border" role="status" v-if="isLoading">
              <span class="sr-only">Loading...</span>
            </div>

            <ul class="category-tree ml-4" v-else>
              <li v-for="dept in departments" :key="dept.id" :class="{
                'has-child': Array.isArray(dept.sub_departments) && dept.sub_departments.length > 0,
                open: expandedDepartments[dept.id]
              }">
                <p class="cursor-pointer text-cyan-600 hover:underline" @click="toggleDepartment(dept.id)">
                  {{ dept.Product_Department_Name }}
                </p>

                <ul>
                  <li>
                    <table class="table bordered-table mb-0 ml-4">
                      <thead>
                        <tr>
                          <th>S.L</th>
                          <th>Name</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        <tr v-for="(subDept, index) in dept.sub_departments" :key="subDept.id">
                          <td>{{ index + 1 }}</td>

                          <td>
                            <div class="d-flex align-items-center">
                              <img :src="`${$r2Url}/` + subDept.Image_path" alt="" class="flex-shrink-0 me-12 radius-8"
                                style="width: 50px; height: 50px; object-fit: cover" />
                              <h6 class="text-md mb-0 fw-medium flex-grow-1">
                                {{ subDept.Sub_Department_Name }}
                              </h6>
                            </div>
                          </td>

                          <td>
                            <a href="javascript:void(0)"
                              class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center"
                              @click.prevent="openEditModal(subDept)">
                              <iconify-icon icon="lucide:edit"></iconify-icon>
                            </a>

                            <a @click.prevent="deleteSubDepartment(subDept.id)"
                              class="w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center">
                              <iconify-icon icon="mingcute:delete-2-line"></iconify-icon>
                            </a>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </li>
                </ul>
              </li>
            </ul>
          </div>

          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-24">
            <span>Showing 1 to 10 of 12 entries</span>
            <ul class="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
              <li class="page-item">
                <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                  href="javascript:void(0)">
                  <iconify-icon icon="ep:d-arrow-left" class="text-xl"></iconify-icon>
                </a>
              </li>
              <li class="page-item">
                <a class="page-link bg-primary-600 text-white fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px"
                  href="javascript:void(0)">1</a>
              </li>
              <li class="page-item">
                <a class="page-link bg-primary-50 text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px"
                  href="javascript:void(0)">2</a>
              </li>
              <li class="page-item">
                <a class="page-link bg-primary-50 text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px"
                  href="javascript:void(0)">3</a>
              </li>
              <li class="page-item">
                <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                  href="javascript:void(0)">
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
          <h6 class="fw-semibold mb-0">Edit Sub Department</h6>
          <button type="button" class="btn btn-sm btn-outline-secondary" @click="closeEditModal">
            ✕
          </button>
        </div>

        <!-- Body -->
        <form @submit.prevent="updateSubDepartment">
          <!-- Parent Dept -->
          <div class="mb-3">
            <label class="form-label fw-semibold text-sm">Product Department <span class="text-danger">*</span></label>
            <select class="form-control rounded-lg form-select" v-model="editParentDeptId" required>
              <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                {{ dept.Product_Department_Name }}
              </option>
            </select>
          </div>

          <!-- Name -->
          <div class="mb-3">
            <label class="form-label fw-semibold text-sm">Name <span class="text-danger">*</span></label>
            <input type="text" class="form-control radius-8" placeholder="Enter sub department name" v-model="editName"
              required />
          </div>


          <div class="mb-3">
            <label class="form-label fw-semibold text-sm">Name  (Arabic)<span class="text-danger">*</span></label>
            <input type="text" class="form-control radius-8" placeholder="Enter sub department name" v-model="editNamear"
              required />
          </div>
          <!-- Image -->
          <div class="mb-3">
            <div class="mb-2 fw-semibold text-sm">Logo / Image</div>

            <!-- Preview (either server image or new blob) -->
            <div v-if="updatePreview" class="position-relative mb-2" style="width: 120px; height: 120px;">
              <img :src="updatePreview" class="img-fluid radius-8 w-100 h-100 object-fit-cover" />
              <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0"
                @click="removeUpdateImage" style="transform: translate(50%, -50%);">
                ×
              </button>
            </div>

            <!-- Upload box if NO preview -->
            <label v-else
              class="upload-file-multiple h-120-px w-120-px border input-form-light radius-8 overflow-hidden border-dashed bg-neutral-50 bg-hover-neutral-200 d-inline-flex align-items-center flex-column justify-content-center gap-1 cursor-pointer">
              <iconify-icon icon="solar:camera-outline" class="text-xl text-secondary-light"></iconify-icon>
              <span class="fw-semibold text-secondary-light">Upload</span>
              <input type="file" hidden accept="image/*" @change="handleUpdateImageChange" />
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
.category-tree,
.category-tree ul {
  list-style: none;
  margin: 0;
  padding-left: 1.2rem;
}

.category-tree li {
  position: relative;
  padding-left: 0.8rem;
}

.category-tree a,
.category-tree p {
  text-decoration: none;
  font: 14px/1.4 "Inter", sans-serif;
  display: inline-block;
}

.category-tree li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 1px;
  background: #d0d0d0;
}

.category-tree li::after {
  content: "";
  position: absolute;
  left: 0;
  top: 0.9em;
  width: 0.8rem;
  height: 1px;
  background: #d0d0d0;
}

.category-tree li:last-child::before {
  height: 0.9em;
}

.category-tree li.has-child>p::before {
  content: "▸";
  margin-right: 4px;
  transition: 0.2s transform;
}

.category-tree li.open>p::before {
  transform: rotate(90deg);
}

.category-tree ul {
  display: none;
}

.category-tree li.open>ul {
  display: block;
}

/* modal styles reused */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.5);
  display: grid;
  place-items: center;
  z-index: 1050;
}

.modal-card {
  width: min(640px, 92vw);
  max-height: 90vh;
  overflow: auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, .18);
  padding: 20px;
}
</style>
