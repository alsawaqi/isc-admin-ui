<script setup lang="ts">
 definePageMeta({
     layout: 'admin',
     middleware: ['permission']
     });

import { ref, onMounted } from 'vue'
const { $axios } = useNuxtApp();


interface Department {
  id: number;
  Product_Department_Code: string;
  Product_Department_Name: string;
 
}

interface SubDepartment {
  id: number;
  name: string;
  
}

interface SubSubDepartment {
  id: number;
  name: string;
  product_sub_department: {
    name: string;
    product_department: {
      Product_Department_Name: string;
    };
  };
}

const subSubDepartments = ref<SubSubDepartment[]>([]);

const selectedDepartmentId = ref<number | null>(null);
const selectedSubDepartmentId = ref<number | null>(null);


const subDepartments = ref<SubDepartment[]>([]);
const departments = ref<Department[]>([]);
const name = ref<string>('');




const getDepartments = async () => {
  try {
    const res = await $axios.get('/api/productdepartment');
    departments.value = res.data;
    console.log('Departments:', res.data);
  } catch (error) {
    console.error('Failed to load departments:', error);
  }


  
};

const fetchSubSubDepartments = async () => {
  try {
    const res = await $axios.get('/api/sub-sub-departments');
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



const handleSubmit = async () => {
  try {
    const payload = {
      product_sub_department_id: selectedSubDepartmentId.value,
      name: name.value
    };

    await $axios.post('/api/sub-sub-departments', payload);
    alert('Saved successfully!');
  await fetchSubSubDepartments();
    name.value = ''; // Clear the input field after saving
    selectedSubDepartmentId.value = null; 
  } catch (error: any) {
    alert('Failed to save: ' + (error?.response?.data?.message || 'Unknown error'));
    console.error(error.response?.data || error);
  }
};




onMounted(async () => {
    await fetchSubSubDepartments();
    await getDepartments();
   

});



</script>
<template>

    <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 class="fw-semibold mb-0">Sub Sub Department</h6>
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
                <div class="d-flex flex-wrap align-items-center gap-3">
                    <select class="form-select form-select-sm w-auto">
                        <option>status</option>
                        <option>Paid</option>
                        <option>Pending</option>
                    </select>

                </div>
            </div>
            <div class="card-body">
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

                            <th scope="col">Department</th>

                            <th scope="col">Sub Sub Department</th>


                            <th scope="col">Name</th>


                            <th scope="col">Action</th>
                        </tr>
                    </thead>
                    <tbody>
  <tr v-for="(item, index) in subSubDepartments" :key="item.id">
    <td>
      <div class="form-check style-check d-flex align-items-center">
        <input class="form-check-input" type="checkbox" :id="'check' + index">
        <label class="form-check-label" :for="'check' + index">
          {{ index + 1 }}
        </label>
      </div>
    </td>

    <td>
      <h6 class="text-md mb-0 fw-medium">{{ item.product_sub_department.product_department.Product_Department_Name }}</h6>
    </td>

    <td>
      <h6 class="text-md mb-0 fw-medium">{{ item.product_sub_department.name }}</h6>
    </td>

    <td>
      <h6 class="text-md mb-0 fw-medium">{{ item.name }}</h6>
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