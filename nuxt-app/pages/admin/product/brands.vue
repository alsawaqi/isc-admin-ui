<script setup lang="ts">
definePageMeta({
     layout: 'admin',
     middleware: ['permission'],
     permissions: 'departments'
     
    });

const { $axios } = useNuxtApp();

import {ref,onMounted} from 'vue';
import { useProductsBrands } from '~/data/ProductsBrands';


const { getProductBrands } = useProductsBrands();

interface ProductBrand {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
}

const productBrands = ref<ProductBrand[]>([]);

const name = ref<string>('');

const submit = async () => {
    try {
        const response = await $axios.post('/api/productbrands', { name: name.value });
       
        name.value = ''; // Clear the input after submission
    } catch (error) {
      
    }finally {
        // Optionally, you can refresh the list of product brands after submission
        productBrands.value = await getProductBrands();
    }
};

onMounted(async () => {
    try {
        productBrands.value = await getProductBrands();
    } catch (error) {
        console.error('Error fetching product brands:', error);
    }
});

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
            <form @submit.prevent="submit()"  class="row g-4">
                <div class="row">

                    <div class="col-sm-12">


                         

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

                            <th scope="col">Name</th>


                            <th scope="col">Action</th>
                        </tr>
                    </thead>
                     <tbody>
  <tr v-for="(productBrand, index) in productBrands" :key="productBrand.id">
    <td>
      <div class="form-check style-check d-flex align-items-center">
        <input class="form-check-input" type="checkbox" :id="'check-' + productBrand.id" />
        <label class="form-check-label" :for="'check-' + productBrand.id">
          {{ index + 1 }}
        </label>
      </div>
    </td>

    <td>
      <div class="d-flex align-items-center">
        <!-- Optional static image -->
        <img src="/isc-assets/images/user-list/user-list2.png" alt="" class="flex-shrink-0 me-12 radius-8">
        <h6 class="text-md mb-0 fw-medium flex-grow-1">{{ productBrand.name }}</h6>
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