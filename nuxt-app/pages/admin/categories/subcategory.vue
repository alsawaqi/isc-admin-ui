<script setup lang="ts">
definePageMeta({
     layout: 'admin',
     middleware: ['permission'],
     permissions: 'departments'
     
    })
import { ref, onMounted } from 'vue'
const { $axios } = useNuxtApp();

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
 
}


 

interface DepartmentWithSubs extends Department {
  sub_departments: SubDepartment[];
}


const departments = ref<DepartmentWithSubs[]>([]);
 

const selectedDepartmentId = ref<string>('');
const name = ref<string>('');


const expandedDepartments = ref<{ [key: number]: boolean }>({});
const toggleDepartment = (id: number) => {
  expandedDepartments.value[id] = !expandedDepartments.value[id];
};


const createSubDepartment = async (e: Event) => {
  e.preventDefault();
   if (!selectedDepartmentId.value || !name) {
    alert('Please select a department and enter a name.');
    return;
  }

  try {
    await $axios.post('/api/productsubdepartment', {
      product_department_id: selectedDepartmentId.value,
      name : name.value
    });
    name.value = '';
    selectedDepartmentId.value = '';
    alert('Sub department created successfully');  
    await getsubDepartments();

  } catch (error) {
    console.error('Error creating sub department:', error);
    alert('Failed to create sub department');
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
  try {
    const res = await $axios.get('/api/product-departments-with-sub');
     departments.value = res.data;
  } catch (error) {
    console.error('Failed to load sub departments:', error);
  }
};

const showProductCategory = ref(false)
const showDepartments = ref(false)
const showSubDepartments = ref(false)
const showSubSubDepartments = ref(false)


const arrowDepartments = computed(() => showDepartments.value ? '▾' : '▸')

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
                                        <div class="uploaded-imgs-container d-flex gap-3 flex-wrap"></div>

                                        <label class="upload-file-multiple h-120-px w-120-px border input-form-light radius-8 overflow-hidden border-dashed bg-neutral-50 bg-hover-neutral-200 d-flex align-items-center flex-column justify-content-center gap-1" for="upload-file-multiple">
                                            <iconify-icon icon="solar:camera-outline" class="text-xl text-secondary-light"></iconify-icon>
                                            <span class="fw-semibold text-secondary-light">Upload</span>
                                            <input id="upload-file-multiple" type="file" hidden multiple>
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
                        <button type="submit" class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8">
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
   

    <!-- Nested: Department Tree -->
    <div  class="ml-6" v-for="dept in departments" :key="dept.id">
      <p
            class="cursor-pointer text-cyan-600 hover:underline"
            @click="toggleDepartment(dept.id)"
            >
            {{ expandedDepartments[dept.id] ? '▾' : '▸' }} {{ dept.Product_Department_Name }}
            </p>

      <div v-if="expandedDepartments[dept.id]" class="ml-6">
        <!-- Replace with your department table -->
         <table class="table bordered-table mb-0">
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

                        <tr v-for="(subDept, index) in dept.sub_departments" :key="subDept.id">
                            <td>
                                <div class="form-check style-check d-flex align-items-center">
                                    <input class="form-check-input" type="checkbox" value="" id="check2">
                                    <label class="form-check-label" for="check2">
                                        {{ index + 1 }}
                                    </label>
                                </div>
                            </td>

                           


                            <td>
                                <div class="d-flex align-items-center">
                                    <img src="/public/isc-assets/images/user-list/user-list2.png" alt="" class="flex-shrink-0 me-12 radius-8">
                                    <h6 class="text-md mb-0 fw-medium flex-grow-1">{{ subDept.name }}</h6>
                                </div>
                            </td>


                            <td>
                                <a href="javascript:void(0)" class="w-32-px h-32-px bg-primary-light text-primary-600 rounded-circle d-inline-flex align-items-center justify-content-center">
                                    <iconify-icon icon="iconamoon:eye-light"></iconify-icon>
                                </a>
                                <a href="javascript:void(0)" class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center">
                                    <iconify-icon icon="lucide:edit"></iconify-icon>
                                </a>
                                <a href="javascript:void(0)" class="w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center">
                                    <iconify-icon icon="mingcute:delete-2-line"></iconify-icon>
                                </a>
                            </td>
                        </tr>

                    </tbody>
                </table>
      </div>

   
    </div>


    
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