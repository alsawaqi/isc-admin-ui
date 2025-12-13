<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { definePageMeta, useNuxtApp } from '#imports';
import { useFlashStore } from '~/stores/flashs'
const flash = useFlashStore()
definePageMeta({
  layout: 'admin',
  middleware: ['permission']
});

const { $axios, $r2Url } = (useNuxtApp() as any);


interface SubSubDepartment {
  id: number
  Product_Sub_Sub_Department_Name: string
  Product_Sub_Sub_Department_Name_Ar?: string
  Product_Sub_Sub_Department_Description?: string
  View_Options: boolean
  Image_Path: string

}

interface SubDepartment {
  id: number
  Sub_Department_Name: string
  Sub_Department_Name_Ar?: string
  sub_sub_departments: SubSubDepartment[]
}

interface Department {
  id: number
  Product_Department_Code: string
  Product_Department_Name: string
  sub_departments: SubDepartment[]
}


const departments = ref<Department[]>([])
const expandedDepartments = ref<{ [key: number]: boolean }>({})
const expandedSubDepartments = ref<{ [key: number]: boolean }>({})


const selectedDepartmentId = ref<number | null>(null);
const selectedSubDepartmentId = ref<number | null>(null);
const uploadedImage = ref<File | null>(null);
const previewUrl = ref<string | null>(null);

const subDepartments = ref<SubDepartment[]>([]);

const isSubmit = ref<boolean>(false);
const isLoading = ref<boolean>(false);


const name = ref<string>('');
const namear = ref<string>('');
const description = ref<string>('');
const View_Options = ref<boolean>(false);


// EDIT MODAL STATE
const isEditOpen = ref<boolean>(false)

const editId = ref<number | null>(null)
const editName = ref<string>('')
const editNameAr = ref<string>('')
const editDescription = ref<string>('')
const editViewOptions = ref<boolean | number | string>(false)

// We'll allow moving the sub-sub dept to a different sub-department
const editParentDeptId = ref<number | null>(null)           // parent Department id
const editSubDeptId = ref<number | null>(null)              // parent SubDepartment id
const editSubDeptOptions = ref<SubDepartment[]>([])         // list of sub-departments for selected department

// image
const editImageFile = ref<File | null>(null)                // new file chosen in modal
const editPreviewUrl = ref<string | null>(null)             // preview in modal
const editRemoveCurrentImage = ref<boolean>(false)          // if user removed the old one




const handleFileChange = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  uploadedImage.value = file;
  previewUrl.value = URL.createObjectURL(file);
};

const removeImage = () => {
  uploadedImage.value = null;
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = null;
};




const handleEditImageChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  // revoke old blob if any
  if (editPreviewUrl.value && editPreviewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(editPreviewUrl.value)
  }

  editImageFile.value = file
  editPreviewUrl.value = URL.createObjectURL(file)

  // since user picked a new image, don't ask backend to delete (we'll replace instead)
  editRemoveCurrentImage.value = false
}

const removeEditImage = () => {
  // User clicks × on the current image in modal
  if (editPreviewUrl.value && editPreviewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(editPreviewUrl.value)
  }

  editImageFile.value = null
  editPreviewUrl.value = null

  // tell backend to remove existing image if we submit like this
  editRemoveCurrentImage.value = true
}



const getDepartments = async () => {
  isLoading.value = true;
  try {
    const res = await $axios.get('/api/productdepartment');
    departments.value = res.data;
    console.log('Departments:', res.data);
  } catch (error) {
    console.error('Failed to load departments:', error);
  } finally {
    isLoading.value = false;
  }



};


const fetchSubDepartments = async () => {
  if (!selectedDepartmentId.value) return;

  try {
    const response = await $axios.get(`/api/sub-departments/${selectedDepartmentId.value}`);
    subDepartments.value = response.data.sub_departments;
  } catch (error) {
    console.error('Error fetching sub-departments:', error);
  }
};



const fetchFullTree = async () => {
  try {
    const res = await $axios.get('/api/full-product-department-tree')
    departments.value = res.data
    console.log('Full tree:', res.data)
  } catch (err) {
    console.error('Failed to fetch department tree:', err)
  }
}

const onEditDeptChange = async () => {
  if (!editParentDeptId.value) {
    editSubDeptOptions.value = []
    editSubDeptId.value = null
    return
  }
  await loadEditSubDeptOptions(editParentDeptId.value)
  // force user to pick again
  editSubDeptId.value = null
}

const loadEditSubDeptOptions = async (deptId: number) => {
  // this is very similar to fetchSubDepartments but we don't want to overwrite create form data.
  try {
    const res = await $axios.get(`/api/sub-departments/${deptId}`)
    // backend returns { sub_departments: [...] } based on your fetchSubDepartments()
    editSubDeptOptions.value = res.data.sub_departments || []
  } catch (err) {
    console.error('Failed to load sub-depts for edit modal:', err)
    editSubDeptOptions.value = []
  }
}


const openEditModal = async (
  subsub: SubSubDepartment,
  parentSub: SubDepartment,
  parentDept: Department
) => {
 
   
  isEditOpen.value = true

  // basic fields
  editId.value = subsub.id
  editName.value = subsub.Product_Sub_Sub_Department_Name
  editNameAr.value = subsub.Product_Sub_Sub_Department_Name_Ar ?? '' // No field in SubSubDepartment for Arabic name
  editDescription.value = subsub.Product_Sub_Sub_Department_Description ?? ''


  editViewOptions.value = subsub.View_Options ?? false;

  // parent selects
  editParentDeptId.value = parentDept.id

  await loadEditSubDeptOptions(parentDept.id)
  editSubDeptId.value = parentSub.id

  // image preview (existing from server)
  editImageFile.value = null
  editPreviewUrl.value = subsub.Image_Path
    ? `${$r2Url}/` + subsub.Image_Path
    : null

  editRemoveCurrentImage.value = false
}

const closeEditModal = () => {
  isEditOpen.value = false
}



const updateSubSubDepartment = async (e: Event) => {
  e.preventDefault()
  if (!editId.value) return

  isSubmit.value = true

  try {
    const form = new FormData()

    form.append('Product_Sub_Sub_Department_Name', editName.value ?? '')
    form.append('Product_Sub_Sub_Department_Name_Ar', editNameAr.value ?? '')
    form.append('description', editDescription.value ?? '')
    form.append('View_Options', String(editViewOptions.value))

    if (editSubDeptId.value) {
      form.append('Product_Sub_Department_Id', String(editSubDeptId.value))
    }

    // send new file if chosen
    if (editImageFile.value instanceof File) {
      form.append('image', editImageFile.value)
    }

    // if user clicked remove and didn't upload a new one
    if (editRemoveCurrentImage.value && !editImageFile.value) {
      form.append('remove_image', '1')
    }

    const res = await $axios.post(
      `/api/sub-sub-departments/${editId.value}`,
      form,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    )

    flash.success('Sub-sub department updated successfully')

    // refresh tree so UI updates
    await fetchFullTree()

    // close modal
    isEditOpen.value = false
  } catch (err) {
    flash.error('Failed to update sub-sub department: ' + (err as any).message)
  } finally {
    isSubmit.value = false
  }
}


const toggleDepartment = (id: number) => {
  expandedDepartments.value[id] = !expandedDepartments.value[id]
}

const toggleSubDepartment = (id: number) => {
  expandedSubDepartments.value[id] = !expandedSubDepartments.value[id]
}


const handleSubmit = async () => {
  isSubmit.value = true;
  try {
    if (!selectedSubDepartmentId.value || !name.value) {
      alert('Please fill in all required fields');
      return;
    }


    const formData = new FormData();
    formData.append('Product_Sub_Sub_Department_Name', name.value);
    formData.append('Product_Sub_Sub_Department_Name_Ar', namear.value);
    formData.append('description', description.value);
    formData.append('View_Options', String(View_Options.value));

    formData.append('Product_Sub_Department_Id', String(selectedSubDepartmentId.value));
    if (uploadedImage.value) {
      formData.append('file', uploadedImage.value);
    }



    await $axios.post('/api/sub-sub-departments', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });



    await fetchFullTree();

    // Reset form
    name.value = '';
    description.value = '';
    selectedSubDepartmentId.value = null;
    uploadedImage.value = null;
    previewUrl.value = null;
   
    flash.success('Sub-sub department created successfully')

  } catch (error: any) {
    flash.error('Failed to create sub-sub department: ' + error.message)
  } finally {
    await fetchFullTree();

    isSubmit.value = false;

  }
};


const deleteSubSubDepartment = async (id: number) => {
  const ok = await flash.confirm({
    title: 'Delete department?',
    message: `Are you sure you want to delete "${name}"? This cannot be undone.`,
    confirmText: 'Yes, delete',
    cancelText: 'No, cancel',
  })
  if (!ok) return;
  try {
    await $axios.delete(`/api/sub-sub-departments/${id}`);
    flash.success('Deleted successfully!');
    await fetchFullTree();
  } catch (error: any) {
    flash.error('Failed to delete: ' + (error?.response?.data?.message || 'Unknown error'));
  
  }
};




onMounted(async () => {

  await getDepartments();

  await fetchFullTree();


});



</script>
<template>

  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #41a5e3">Sub Sub Department</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">Sub Sub Department</li>
      </ul>
    </div>

    <div class="card h-100 p-0 radius-12 overflow-hidden">
      <div class="card-body p-40">
        <form @submit.prevent="handleSubmit">
          <div class="row">

            <div class="col-sm-12">


              <div class="mb-20">

                <label class="form-label">Department </label>
                <select class="form-control" v-model="selectedDepartmentId" @change="fetchSubDepartments">
                  <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                    {{ dept.Product_Department_Name }}
                  </option>
                </select>

              </div>


              <div class="mb-20">

                <label class="form-label">Sub Department </label>
                <select class="form-control" v-model="selectedSubDepartmentId">
                  <option v-for="sub in subDepartments" :key="sub.id" :value="sub.id">
                    {{ sub.Sub_Department_Name }}
                  </option>
                </select>
              </div>

              <div class="mb-20">
                <label for="address" class="form-label fw-semibold text-primary-light text-sm mb-8"> Name <span
                    class="text-danger-600">*</span></label>
                <input type="text" class="form-control radius-8" id="address" v-model="name"
                  placeholder="Enter Your Name" required>
              </div>


               <div class="mb-20">
                <label for="address" class="form-label fw-semibold text-primary-light text-sm mb-8"> Name (Arabic) <span
                    class="text-danger-600">*</span></label>
                <input type="text" class="form-control radius-8" id="address" v-model="namear"
                  placeholder="Enter Your Name" required>
              </div>

              <div class="mb-20">
                <label for="address" class="form-label fw-semibold text-primary-light text-sm mb-8"> Descriptions* <span
                    class="text-danger-600">*</span></label>
                <input type="text" class="form-control radius-8" id="address" v-model="description"
                  placeholder="Enter Descriptions">
              </div>



              <div class="mb-20">
                <label for="address" class="form-label fw-semibold text-primary-light text-sm mb-8"> View Option* {{
                  View_Options == true ? 'Grid' : 'List' }}<span class="text-danger-600">*</span></label>
                <input type="checkbox" class="form-control radius-8" id="address" values="grid" v-model="View_Options">
              </div>

              <div class="mb-20">

                <div class="card h-100 p-0">
                  <div class="card-header border-bottom bg-base py-16 px-24">
                    <h6 class="text-lg fw-semibold mb-0">Upload With image preview</h6>
                  </div>
                  <div class="card-body p-24">

                    <div class="upload-image-wrapper d-flex align-items-center gap-3 flex-wrap">
                      <!-- Single preview with remove button -->
                      <div v-if="previewUrl" class="position-relative" style="width: 100px; height: 100px;">
                        <img :src="previewUrl" class="img-fluid radius-8 w-100 h-100 object-fit-cover" />
                        <button class="btn btn-sm btn-danger position-absolute top-0 end-0" @click="removeImage"
                          style="transform: translate(50%, -50%);">
                          ×
                        </button>
                      </div>

                      <!-- Upload Button (hide if image already exists) -->
                      <label v-if="!previewUrl"
                        class="upload-file-multiple h-120-px w-120-px border input-form-light radius-8 overflow-hidden border-dashed bg-neutral-50 bg-hover-neutral-200 d-flex align-items-center flex-column justify-content-center gap-1"
                        for="upload-file">
                        <iconify-icon icon="solar:camera-outline" class="text-xl text-secondary-light"></iconify-icon>
                        <span class="fw-semibold text-secondary-light">Upload</span>
                        <input id="upload-file" type="file" hidden accept="image/*" @change="handleFileChange" />
                      </label>
                    </div>

                  </div>
                </div>



              </div>
            </div>
            <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
              <button type="reset"
                class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8">
                Reset
              </button>
              <button type="submit" class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"
                :disable="isSubmit" :class="{ 'opacity-50 cursor-not-allowed': isSubmit }">

                <span v-if="isSubmit" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>

                Save Change
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>






  </div>


  <div class="dashboard-main-body">



    <div class="col-lg-12">
      <div class="card">
        <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div class="d-flex flex-wrap align-items-center gap-3">
            <div class="d-flex align-items-center gap-2">




            </div>
            <div class="icon-field">

            </div>
          </div>

        </div>
        <div class="card-body">

          <h5 class="fw-semibold mb-3">Department → Sub → Sub-Sub Tree</h5>



          <ul class="category-tree ml-4">
            <li v-for="dept in departments" :key="dept.id"
              :class="{ 'has-child': dept.sub_departments.length > 0, open: expandedDepartments[dept.id] }">
              <p class="cursor-pointer text-primary font-medium hover:underline" @click="toggleDepartment(dept.id)">
                {{ dept.Product_Department_Name }} - ({{ dept.sub_departments.length }})
              </p>

              <ul>
                <li v-for="sub in dept.sub_departments" :key="sub.id"
                  :class="{ 'has-child': sub.sub_sub_departments?.length, open: expandedSubDepartments[sub.id] }">
                  <p class="cursor-pointer text-indigo-600 hover:underline" @click="toggleSubDepartment(sub.id)">
                    {{ sub.Sub_Department_Name }} - ({{ sub.sub_sub_departments.length }})
                  </p>

                  <ul>
                    <li>
                      <table class="table bordered-table mb-0 ml-4" v-if="expandedSubDepartments[sub.id]">
                        <thead>
                          <tr>
                            <th>
                              <div class="form-check style-check d-flex align-items-center">
                                <input class="form-check-input" type="checkbox" value="" id="checkAll">
                                <label class="form-check-label" for="checkAll">S.L</label>
                              </div>
                            </th>
                            <th>Name</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="(subsub, index) in sub.sub_sub_departments" :key="subsub.id">
                            
                            <td>
                              <div class="form-check style-check d-flex align-items-center">
                                <input class="form-check-input" type="checkbox" :id="'check' + index">
                                <label class="form-check-label" :for="'check' + index">{{ index + 1 }}</label>
                              </div>
                            </td>
                            <td>
                              <img :src="`${$r2Url}/` + subsub.Image_Path" alt="" class="flex-shrink-0 me-12 radius-8"
                                style="width: 50px; height: 50px; object-fit: cover;">
                              <h6 class="text-md mb-0 fw-medium">{{ subsub.Product_Sub_Sub_Department_Name }}</h6>
                            </td>
                            <td>

                              <a href="javascript:void(0)" @click.prevent="openEditModal(subsub, sub, dept)"
                                class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center">
                                <iconify-icon icon="lucide:edit"></iconify-icon>
                              </a>
                              <a @click.prevent="deleteSubSubDepartment(subsub.id)"
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
            </li>
          </ul>








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
  <!-- Edit Modal -->
  <transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0"
    enter-to-class="opacity-100" leave-active-class="transition-opacity duration-150" leave-from-class="opacity-100"
    leave-to-class="opacity-0">
    <div v-if="isEditOpen" class="modal-backdrop" @click.self="closeEditModal">
      <div class="modal-card" role="dialog" aria-modal="true">
        <!-- Header -->
        <div class="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
          <h6 class="fw-semibold mb-0">Edit Sub Sub Department</h6>
          <button type="button" class="btn btn-sm btn-outline-secondary" @click="closeEditModal">✕</button>
        </div>

        <!-- Body -->
        <form @submit.prevent="updateSubSubDepartment">
          <!-- Department selector -->
          <div class="mb-3">
            <label class="form-label fw-semibold text-sm">
              Department <span class="text-danger">*</span>
            </label>
            <select class="form-control rounded-lg form-select" v-model="editParentDeptId" @change="onEditDeptChange"
              required>
              <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                {{ dept.Product_Department_Name }}
              </option>
            </select>
          </div>

          <!-- Sub Department selector -->
          <div class="mb-3">
            <label class="form-label fw-semibold text-sm">
              Sub Department <span class="text-danger">*</span>
            </label>
            <select class="form-control rounded-lg form-select" v-model="editSubDeptId" required>
              <option v-for="sd in editSubDeptOptions" :key="sd.id" :value="sd.id">
                {{ sd.Sub_Department_Name }}
              </option>
            </select>
          </div>

          <!-- Name -->
          <div class="mb-3">
            <label class="form-label fw-semibold text-sm">
              Name <span class="text-danger">*</span>
            </label>
            <input type="text" class="form-control radius-8" placeholder="Enter sub sub department name"
              v-model="editName" required />
          </div>



           <div class="mb-3">
            <label class="form-label fw-semibold text-sm">
              Name (Arabic) <span class="text-danger">*</span>
            </label>
            <input type="text" class="form-control radius-8" placeholder="Enter sub sub department name"
              v-model="editNameAr" required />
          </div>


          <!-- Description -->
          <div class="mb-3">
            <label class="form-label fw-semibold text-sm">Description</label>
            <input type="text" class="form-control radius-8" placeholder="Enter description"
              v-model="editDescription" />
          </div>

          <!-- View Options -->
          <div class="mb-3">
            <label class="form-label fw-semibold text-sm">
              View Option
              <span class="text-muted ms-1">({{ editViewOptions ? 'Grid' : 'List' }}) {{ editViewOptions }}s</span>
            </label>

            <div class="d-flex align-items-center gap-2">
              <input type="checkbox" class="form-check-input" v-model="editViewOptions" />
              <small class="text-muted">{{ editViewOptions ? 'Checked' : 'Not checked' }}</small>
            </div>
          </div>


          <!-- Image -->
          <div class="mb-3">
            <div class="mb-2 fw-semibold text-sm">Logo / Image</div>

            <!-- Preview (either server URL OR new blob) -->
            <div v-if="editPreviewUrl" class="position-relative mb-2" style="width: 120px; height: 120px;">
              <img :src="editPreviewUrl" class="img-fluid radius-8 w-100 h-100 object-fit-cover" />
              <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0"
                style="transform: translate(50%, -50%);" @click="removeEditImage">
                ×
              </button>
            </div>

            <!-- Upload box if no preview -->
            <label v-else class="upload-file-multiple h-120-px w-120-px border input-form-light radius-8 overflow-hidden
                   border-dashed bg-neutral-50 bg-hover-neutral-200 d-inline-flex align-items-center
                   flex-column justify-content-center gap-1 cursor-pointer">
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

/* lines */
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

/* caret */
.category-tree li.has-child>p::before {
  content: "▸";
  margin-right: 4px;
  transition: 0.2s transform;
}

.category-tree li.open>p::before {
  transform: rotate(90deg);
}

/* hide children unless open */
.category-tree ul {
  display: none;
}

.category-tree li.open>ul {
  display: block;
}


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