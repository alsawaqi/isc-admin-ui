<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'departments'

})
import { ref, onMounted, onUnmounted, reactive } from 'vue'
import { useDepartment } from '~/data/useDepartment'

const { $r2Url, $axios } = useNuxtApp()

const { createDepartment, getDepartments, DeleteDepartment } = useDepartment()

interface EditDepartment {
  id: number | null;
  name: string;
  image: File | null;
}


const departments = ref<any[]>([])
const departmentName = ref<string>('')
const uploadedImage = ref<File | null>(null);
const previewUrl = ref<string | null>(null);

const removeCurrentImage = ref<boolean>(false);
 


const createImage = ref<File | null>(null)
const createPreview = ref<string | null>(null)

const updateImage = ref<File | null>(null)
const updatePreview = ref<string | null>(null)

const isSubmit = ref<boolean>(false);
const isLoading = ref<boolean>(false);
const isToggle = ref<boolean>(false);
const department = ref<any>(null);

const editedDepartment = reactive<EditDepartment>({
  id: null,
  name: '',
  image: null,
});

 



const handleImageChange = (event: Event, type: 'create' | 'update') => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  if (type === 'create') {
    if (createPreview.value && createPreview.value.startsWith('blob:')) {
      URL.revokeObjectURL(createPreview.value);
    }
    createImage.value = file;
    createPreview.value = URL.createObjectURL(file);
  } else {
    if (updatePreview.value && updatePreview.value.startsWith('blob:')) {
      URL.revokeObjectURL(updatePreview.value);
    }

    updateImage.value = file;
    updatePreview.value = URL.createObjectURL(file);

    editedDepartment.image = file; // this is what we append as 'file' in FormData

    removeCurrentImage.value = false; // because we replaced it
  }
};




const removeCreateImage = () => {
  if (createPreview.value) URL.revokeObjectURL(createPreview.value);
  createImage.value = null;
  createPreview.value = null;
};

const removeUpdateImage = () => {
  if (updatePreview.value && updatePreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(updatePreview.value);
  }

  updateImage.value = null;
  updatePreview.value = null;

  editedDepartment.image = null;

  removeCurrentImage.value = true;
};


const getdepartment = async () => {
  isLoading.value = true;
  try {
    departments.value = await getDepartments();
  } catch (error) {
    console.error('Error fetching departments:', error);
  } finally {
    isLoading.value = false;
  }
}

const handleSubmit = async (e: Event) => {
  isSubmit.value = true;
  e.preventDefault();

  try {

    await createDepartment(departmentName.value, uploadedImage.value);
    departmentName.value = '';
    uploadedImage.value = null;
    previewUrl.value = null;
    await getdepartment();
  } catch (err) {
    alert('Failed to create department')
  } finally {
    isSubmit.value = false;
  }
}



const UpdateSubmit = async (e: Event): Promise<void> => {

    

  e.preventDefault();
  isSubmit.value = true;

  try {
    const formData = new FormData();

    formData.append('name', editedDepartment.name ?? '');

    // If user chose a new file, send it
    if (editedDepartment.image instanceof File) {
      formData.append('image', editedDepartment.image);
    }

    // If user clicked remove (and did NOT upload a new file), tell backend to delete old
    if (removeCurrentImage.value && !editedDepartment.image) {
      formData.append('remove_image', '1');
    }


  // formData.append('_method', 'PUT');

    const response = await $axios.post(
      `/api/productdepartment/${editedDepartment.id}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    console.log('Response data:', response.data);

    // close modal
   // isToggle.value = false;

    // refresh list
    await getdepartment();

  } catch (err) {
    alert('Failed to update department: ' + err);
  } finally {
    isSubmit.value = false;
  }
};



const deleteDepartmentHandler = async (id: number) => {
  if (!confirm('Are you sure you want to delete this department?')) {
    return;
  }
  try {
    await DeleteDepartment(id);

  } catch (err) {
    alert('Failed to delete department');
  } finally {
    await getdepartment();
  }
}



onMounted(async () => {
  await getdepartment();
})


const TogglePopup = (dept?: any) => {
  if (dept) {
    // OPEN
    isToggle.value = !isToggle.value;

    department.value = dept; // optional, if you still show department in the header

    editedDepartment.id = dept?.id ?? null;
    editedDepartment.name = dept?.Product_Department_Name ?? '';
    editedDepartment.image = null; // reset new upload

    // show current department image from DB or null
    updateImage.value = null;
    updatePreview.value = dept?.Image_path ? `${$r2Url}/` + dept.Image_path : null;

    // not removed unless they click ×
    removeCurrentImage.value = false;
  } else {
    // CLOSE
    isToggle.value = false;
  }
};




</script>
<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #6b8629">Department</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">Department</li>
      </ul>
    </div>

    <div class="card h-100 p-0 radius-12 overflow-hidden">
      <div class="card-body p-40">
        <form @submit.prevent="handleSubmit">
          <div class="row">

            <div class="col-sm-12">
              <div class="mb-20">
                <label for="address" class="form-label fw-semibold text-primary-light text-sm mb-8"> Name* <span
                    class="text-danger-600">*</span></label>
                <input type="text" v-model="departmentName" class="form-control radius-8" id="address"
                  placeholder="Enter Your Name" required>
              </div>


              <div class="mb-20">

                <div class="card h-100 p-0">
                  <div class="card-header border-bottom bg-base py-16 px-24">
                    <h6 class="text-lg fw-semibold mb-0">Upload With image preview</h6>
                  </div>
                  <div class="card-body p-24">

                    <div class="upload-image-wrapper d-flex align-items-center gap-3 flex-wrap">
                      <div v-if="createPreview" class="position-relative" style="width: 100px; height: 100px;">
                        <img :src="createPreview" class="img-fluid radius-8 w-100 h-100 object-fit-cover" />
                        <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0"
                          @click="removeCreateImage" style="transform: translate(50%, -50%);">×</button>
                      </div>

                      <label v-else class="upload-file-multiple h-120-px w-120-px border input-form-light radius-8 overflow-hidden border-dashed
                bg-neutral-50 bg-hover-neutral-200 d-flex align-items-center flex-column justify-content-center gap-1">
                        <iconify-icon icon="solar:camera-outline" class="text-xl text-secondary-light"></iconify-icon>
                        <span class="fw-semibold text-secondary-light">Upload</span>
                        <input type="file" hidden accept="image/*" @change="(e) => handleImageChange(e, 'create')" />
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
                :disable="isSubmit">
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
              <input type="text" name="#0" class="form-control form-control-sm w-auto" placeholder="Search">
              <span class="icon">
                <iconify-icon icon="ion:search-outline"></iconify-icon>
              </span>
            </div>
          </div>
          <div class="d-flex flex-wrap align-items-center gap-3">
            <select class="form-select form-select-sm w-auto">
              <option>status</option>
              <option>Paid</option>
              <option>Pending</option>
            </select>

          </div>
        </div>
        <div class="card-body">




          <div class="spinner-border" role="status" v-if="isLoading">
            <span class="sr-only">Loading...</span>
          </div>


          <table class="table bordered-table mb-0" v-else>
            <thead>
              <tr>
                <th scope="col">
                  <div class="form-check style-check d-flex align-items-center">
                    <input class="form-check-input" type="checkbox" value="" id="checkAll">
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
              <tr v-for="(dept, index) in departments" :key="dept.id">
                <td>
                  <div class="form-check style-check d-flex align-items-center">
                    <input class="form-check-input" type="checkbox" :id="'check-' + dept.id" />
                    <label class="form-check-label" :for="'check-' + dept.id">
                      {{ index + 1 }}
                    </label>
                  </div>
                </td>

                <td>
                  <div class="d-flex align-items-center">


                    <!-- Optional static image -->
                    <img :src="`${$r2Url}/` + dept.Image_path" alt="" class="flex-shrink-0 me-12 radius-8"
                      style="width: 50px; height: 50px; object-fit: cover;">
                    <h6 class="text-md mb-0 fw-medium flex-grow-1">{{ dept.Product_Department_Name }}</h6>
                  </div>
                </td>

                <td>

                  <a href="javascript:void(0)" @click.prevent="TogglePopup(dept)"
                    class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center">
                    <iconify-icon icon="lucide:edit"></iconify-icon>
                  </a>
                  <a @click.prevent="deleteDepartmentHandler(dept.id)"
                    class="w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center">
                    <iconify-icon icon="mingcute:delete-2-line"></iconify-icon>
                  </a>
                </td>
              </tr>
            </tbody>
          </table>

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


  <!-- Popup / Modal -->
  <transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0"
    enter-to-class="opacity-100" leave-active-class="transition-opacity duration-150" leave-from-class="opacity-100"
    leave-to-class="opacity-0">
    <div v-if="isToggle" class="modal-backdrop" @click.self="TogglePopup">

      <div class="modal-card" role="dialog" aria-modal="true">
        <!-- Header -->
        <div class="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
          <h6 class="fw-semibold mb-0">Edit {{ department?.Product_Department_Name }}</h6>
          <button type="button" class="btn btn-sm btn-outline-secondary" @click.self="TogglePopup">✕</button>
        </div>

        <!-- Body (your form) -->
        <form @submit.prevent="UpdateSubmit">
          <div class="mb-3">
            <label class="form-label fw-semibold text-sm">Name <span class="text-danger">*</span></label>
            <input type="text" class="form-control radius-8" placeholder="Enter department name"
              v-model="editedDepartment.name" required />
          </div>

          <div class="mb-3">
            <div class="mb-2 fw-semibold text-sm">Logo / Image</div>

            <div v-if="updatePreview" class="position-relative mb-2" style="width: 120px; height: 120px;">
              <img :src="updatePreview" class="img-fluid radius-8 w-100 h-100 object-fit-cover" />
              <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0"
                @click="removeUpdateImage" style="transform: translate(50%, -50%);">×</button>
            </div>

            <label v-else
              class="upload-file-multiple h-120-px w-120-px border input-form-light radius-8 overflow-hidden border-dashed
                bg-neutral-50 bg-hover-neutral-200 d-inline-flex align-items-center flex-column justify-content-center gap-1 cursor-pointer">
              <iconify-icon icon="solar:camera-outline" class="text-xl text-secondary-light"></iconify-icon>
              <span class="fw-semibold text-secondary-light">Upload</span>
              <input type="file" hidden accept="image/*" @change="(e) => handleImageChange(e, 'update')" />
            </label>
          </div>



          <!-- Actions -->
          <div class="d-flex align-items-center justify-content-end gap-2">
            <button type="button" class="btn btn-outline-secondary" @click="TogglePopup">
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
  width: min(640px, 92vw);
  max-height: 90vh;
  overflow: auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, .18);
  padding: 20px;
}
</style>
