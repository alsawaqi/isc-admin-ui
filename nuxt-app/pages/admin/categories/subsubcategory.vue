<script setup lang="ts">
 definePageMeta({
     layout: 'admin',
     middleware: ['permission']
     });

import { ref, onMounted } from 'vue'
const { $axios,$r2Url } = useNuxtApp();


interface SubSubDepartment {
  id: number
  name: string
  image_path: string
}

interface SubDepartment {
  id: number
  name: string
  
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
const subSubDepartments = ref<SubSubDepartment[]>([]);

const selectedDepartmentId = ref<number | null>(null);
const selectedSubDepartmentId = ref<number | null>(null);
const uploadedImage = ref<File | null>(null);
const previewUrl = ref<string | null>(null);

const subDepartments = ref<SubDepartment[]>([]);

const isSubmit = ref<Boolean>(false);
const isLoading = ref<Boolean>(false);

 
const name = ref<string>('');



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





const getDepartments = async () => {
  isLoading.value = true;
  try {
    const res = await $axios.get('/api/productdepartment');
    departments.value = res.data;
    console.log('Departments:', res.data);
  } catch (error) {
    console.error('Failed to load departments:', error);
  }finally {
    isLoading.value = false;
  }


  
};

const fetchSubSubDepartments = async () => {
  try {
    const res = await $axios.get('/api/full-product-department-tree');
    subSubDepartments.value = res.data;
    console.log('Fetched:', res.data);
  } catch (error) {
    console.error('Failed to fetch:', error);
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
  } catch (err) {
    console.error('Failed to fetch department tree:', err)
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
    formData.append('name', name.value);
    formData.append('product_sub_department_id', String(selectedSubDepartmentId.value));
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
    selectedSubDepartmentId.value = null;
    uploadedImage.value = null;
    previewUrl.value = null;
     alert('Saved successfully!');

  } catch (error: any) {
    alert('Failed to save: ' + (error?.response?.data?.message || 'Unknown error'));
    console.error(error.response?.data || error);
  }finally {
    await fetchFullTree();

    isSubmit.value = false;
    
  }
};


const deleteSubSubDepartment = async (id: number) => {
  if (!confirm('Are you sure you want to delete this sub-sub department?')) return;

  try {
    await $axios.delete(`/api/sub-sub-departments/${id}`);
    alert('Deleted successfully!');
    await fetchFullTree();
  } catch (error: any) {
    alert('Failed to delete: ' + (error?.response?.data?.message || 'Unknown error'));
    console.error(error.response?.data || error);
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


                        <div class="mb-5 col-span-2">

                            <label class="form-label">Department </label>
                           <select class="form-control" v-model="selectedDepartmentId" @change="fetchSubDepartments">
                            <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                                {{ dept.Product_Department_Name }}
                            </option>
                            </select>

                        </div>


                        <div class="mb-5 col-span-2">

                            <label class="form-label">Sub Department </label>
                           <select class="form-control" v-model="selectedSubDepartmentId">
                        <option v-for="sub in subDepartments" :key="sub.id" :value="sub.id">
                            {{ sub.name }}
                        </option>
                        </select>
                        </div>

                        <div class="mb-20">
                            <label for="address" class="form-label fw-semibold text-primary-light text-sm mb-8"> Name* <span class="text-danger-600">*</span></label>
                            <input type="text" class="form-control radius-8" id="address" v-model="name" placeholder="Enter Your Name">
                        </div>


                        <div class="mb-20">

                            <div class="card h-100 p-0">
                                <div class="card-header border-bottom bg-base py-16 px-24">
                                    <h6 class="text-lg fw-semibold mb-0">Upload With image preview</h6>
                                </div>
                                <div class="card-body p-24">

                                    <div class="upload-image-wrapper d-flex align-items-center gap-3 flex-wrap">
                                            <!-- Single preview with remove button -->
                                            <div
                                              v-if="previewUrl"
                                              class="position-relative"
                                              style="width: 100px; height: 100px;"
                                            >
                                              <img :src="previewUrl" class="img-fluid radius-8 w-100 h-100 object-fit-cover" />
                                              <button
                                                class="btn btn-sm btn-danger position-absolute top-0 end-0"
                                                @click="removeImage"
                                                style="transform: translate(50%, -50%);"
                                              >
                                                ×
                                              </button>
                                            </div>

                                        <!-- Upload Button (hide if image already exists) -->
                                        <label
                                            v-if="!previewUrl"
                                            class="upload-file-multiple h-120-px w-120-px border input-form-light radius-8 overflow-hidden border-dashed bg-neutral-50 bg-hover-neutral-200 d-flex align-items-center flex-column justify-content-center gap-1"
                                            for="upload-file"
                                        >
                                            <iconify-icon icon="solar:camera-outline" class="text-xl text-secondary-light"></iconify-icon>
                                            <span class="fw-semibold text-secondary-light">Upload</span>
                                            <input
                                            id="upload-file"
                                            type="file"
                                            hidden
                                            accept="image/*"
                                            @change="handleFileChange"
                                            />
                                        </label>
                                   </div>

                                </div>
                            </div>



                        </div>
                    </div>
                    <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
                        <button type="reset" class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8">
                            Reset
                        </button>
                        <button type="submit" class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8" 
                                :disable="isSubmit"
                                :class="{ 'opacity-50 cursor-not-allowed': isSubmit }">

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

                    <h5 class="fw-semibold mb-3">Department → Sub → Sub-Sub Tree</h5>



                    <ul class="category-tree ml-4">
  <li
    v-for="dept in departments"
    :key="dept.id"
    :class="{ 'has-child': dept.sub_departments.length > 0, open: expandedDepartments[dept.id] }"
  >
    <p class="cursor-pointer text-primary font-medium hover:underline" @click="toggleDepartment(dept.id)">
      {{ dept.Product_Department_Name }} - ({{ dept.sub_departments.length }})
    </p>

    <ul>
      <li
        v-for="sub in dept.sub_departments"
        :key="sub.id"
        :class="{ 'has-child': sub.sub_sub_departments?.length, open: expandedSubDepartments[sub.id] }"
      >
        <p class="cursor-pointer text-indigo-600 hover:underline" @click="toggleSubDepartment(sub.id)">
          {{ sub.name }} - ({{ sub.sub_sub_departments.length }})
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
                    <img :src="`${$r2Url}/` + subsub.image_path" alt="" class="flex-shrink-0 me-12 radius-8" style="width: 50px; height: 50px; object-fit: cover;">
                    <h6 class="text-md mb-0 fw-medium">{{ subsub.name }}</h6>
                  </td>
                  <td>
                  
                    <a href="javascript:void(0)" class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center">
                      <iconify-icon icon="lucide:edit"></iconify-icon>
                    </a>
                    <a @click.prevent="deleteSubSubDepartment(subsub.id)" class="w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center">
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
                                  <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base" href="javascript:void(0)">
                                      <iconify-icon icon="ep:d-arrow-left" class="text-xl"></iconify-icon>
                                  </a>
                              </li>
                              <li class="page-item">
                                  <a class="page-link bg-primary-600 text-white fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px" href="javascript:void(0)">1</a>
                              </li>
                              <li class="page-item">
                                  <a class="page-link bg-primary-50 text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px" href="javascript:void(0)">2</a>
                              </li>
                              <li class="page-item">
                                  <a class="page-link bg-primary-50 text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px" href="javascript:void(0)">3</a>
                              </li>
                              <li class="page-item">
                                  <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base" href="javascript:void(0)">
                                      <iconify-icon icon="ep:d-arrow-right" class="text-xl"></iconify-icon>
                                  </a>
                              </li>
                          </ul>
                      </div>
                  </div>
              </div>
          </div>


      </div>

   
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
.category-tree li.has-child > p::before {
  content: "▸";
  margin-right: 4px;
  transition: 0.2s transform;
}
.category-tree li.open > p::before {
  transform: rotate(90deg);
}

/* hide children unless open */
.category-tree ul {
  display: none;
}
.category-tree li.open > ul {
  display: block;
}




</style>