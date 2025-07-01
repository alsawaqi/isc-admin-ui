<script setup lang="ts">
definePageMeta({
     layout: 'admin',
     middleware: ['permission'],
     permissions: 'departments'
     
    })
import { ref, onMounted } from 'vue'
const { $axios,$r2Url } = useNuxtApp();





interface Department {
  id: number;
  Product_Department_Code: string;
  Product_Department_Name: string;
 
}

interface SubDepartment {
  id: number;
  Product_Department_Code: string;
  product_department_id : number;
  name: string;
  image_path: string;
  created_at: string;
 
}


 

interface DepartmentWithSubs extends Department {
  sub_departments: SubDepartment[];
}


const departments = ref<DepartmentWithSubs[]>([]);
 

const selectedDepartmentId = ref<string>('');
const name = ref<string>('');
const uploadedImage = ref<File | null>(null);
const previewUrl = ref<string | null>(null);
const isSubmit = ref<boolean>(false);
const isLoading = ref<boolean>(false);

const expandedDepartments = ref<{ [key: number]: boolean }>({});
const toggleDepartment = (id: number) => {
  expandedDepartments.value[id] = !expandedDepartments.value[id];
};





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


const createSubDepartment = async (e: Event) => {

    isSubmit.value = true;

    e.preventDefault();


    if (!selectedDepartmentId.value || !name) {
        alert('Please select a department and enter a name.');
        return;
    }
    
    const formData = new FormData();
    formData.append('product_department_id', selectedDepartmentId.value);
    formData.append('name', name.value);
    if (uploadedImage.value) {
      formData.append('file', uploadedImage.value); // ✅ Now sending actual File
     }

  try {
    await $axios.post('/api/productsubdepartment', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    
    });
    name.value = '';
    selectedDepartmentId.value = '';
    uploadedImage.value = null;
    previewUrl.value = null;
    

  } catch (error) {
     alert('Failed to create sub department');
  }finally {
    await getsubDepartments();

    isSubmit.value = false;  

}
};


const getDepartments = async () => {
  try {
    const res = await $axios.get('/api/productdepartment');
    departments.value = res.data;
   
  } catch (error) {
    console.error('Failed to load departments:', error);
  }


  
};


const getsubDepartments = async () => {
    isLoading.value = true;
  try {
    const res = await $axios.get('/api/product-departments-with-sub');
     departments.value = res.data;
  } catch (error) {
    console.error('Failed to load sub departments:', error);
  }finally {
    isLoading.value = false;
  }
};


const deleteSubDepartment = async (id: number) => {
  if (!confirm('Are you sure you want to delete this sub department?')) return;

  try {
    await $axios.delete(`/api/productsubdepartment/${id}`);
    await getsubDepartments();
  } catch (error) {
    console.error('Failed to delete sub department:', error);
  }
};

 
onMounted(async () => {
    await getDepartments();
    await getsubDepartments();
});

</script>
<template>

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


                        <div class="mb-5 col-span-2">

                            <label class="form-label">Product Department </label>
                           <select
                                class="form-control rounded-lg form-select"
                                v-model="selectedDepartmentId"
                                >
                                <option value="">Select Product Department</option>
                                <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                                    {{ dept.Product_Department_Name }}
                                </option>
                                </select>
                        </div>

                        <div class="mb-20">
                            <label for="address" class="form-label fw-semibold text-primary-light text-sm mb-8"> Name <span class="text-danger-600">*</span> {{ name }}</label>
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
                        <button type="submit" class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"  :disabled="isSubmit">
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
                
            </div>
            <div class="card-body">

                <div class="ml-4">
    <!-- Top Level -->
    <p class="font-bold text-gray-700">View Categories</p>

    <!-- Product Category -->
   
     <div class="spinner-border" role="status" v-if="isLoading">
          <span class="sr-only">Loading...</span>
        </div>

    <!-- Nested: Department Tree -->


    <ul class="category-tree ml-4">
  <li
    v-for="dept in departments"
    :key="dept.id"
    :class="{ 
      'has-child': Array.isArray(dept.sub_departments) && dept.sub_departments.length > 0, 
      open: expandedDepartments[dept.id] 
    }"
  >
    <p
      class="cursor-pointer text-cyan-600 hover:underline"
      @click="toggleDepartment(dept.id)"
    >
      {{ dept.Product_Department_Name }}
    </p>

    <!-- Always rendered, CSS will hide/show -->
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
            <tr
              v-for="(subDept, index) in dept.sub_departments"
              :key="subDept.id"
            >
              <td>{{ index + 1 }}</td>
              <td>
                <div class="d-flex align-items-center">
                  <img
                    :src="`${$r2Url}/` + subDept.image_path"
                    alt=""
                    class="flex-shrink-0 me-12 radius-8"
                    style="width: 50px; height: 50px; object-fit: cover"
                  />
                  <h6 class="text-md mb-0 fw-medium flex-grow-1">
                    {{ subDept.name }}
                  </h6>
                </div>
              </td>
              <td>
            
 
 <a href="javascript:void(0)" class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center">
                                  <iconify-icon icon="lucide:edit"></iconify-icon>
                                </a>
                  <a @click.prevent="deleteSubDepartment(subDept.id)" class="w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center">
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
.category-tree li.has-child > p::before {
  content: "▸";
  margin-right: 4px;
  transition: 0.2s transform;
}
.category-tree li.open > p::before {
  transform: rotate(90deg);
}
.category-tree ul {
  display: none;
}
.category-tree li.open > ul {
  display: block;
}
</style>