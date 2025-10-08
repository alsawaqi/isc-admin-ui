<script setup lang="ts">
definePageMeta({
    layout: 'admin',
    middleware: ['permission'],
    permissions: 'departments'

});

const { $axios } = useNuxtApp();

import { ref, onMounted } from 'vue';

interface ProductDepartments {
    id: number;
    Product_Department_Name: string;
}

interface department {
    id: number;
    Product_Department_Name: string;
}

interface Manufacture {
    id: number;
    Products_Manufacture_Name: string;
    department: department;
    created_at?: string;
    updated_at?: string;
}

const ProductDepartments = ref<ProductDepartments[]>([]);
const ProductManufactures = ref<Manufacture[]>([]);
const name = ref<string>('');
const Product_Department_Id = ref<string>('');
const loading = ref<boolean>(false);


const getProductDepartment = async () => {
    try {
        const response = await $axios.get('/api/productdepartment');

        ProductDepartments.value = response.data;
    } catch (error) {
        console.error('Failed to fetch product departments:', error);
        throw error;
    }
};

const getManufactures = async () => {
    loading.value = true;
    try {
        const response = await $axios.get('/api/productmanufacture');
        ProductManufactures.value = response.data;
    } catch (error) {
        console.error('Failed to fetch manufactures:', error);
        throw error;
    } finally {
        loading.value = false;
    }

};


const submit = async () => {
    try {
        const response = await $axios.post('/api/productmanufacture', {
            name: name.value,
            product_department_id: Product_Department_Id.value
        });
        console.log('Manufacture created:', response.data);
        // Optionally, you can reset the form or redirect
        name.value = '';
    } catch (error) {
        console.error('Error creating manufacture:', error);
    } finally {
        await getManufactures();


    }
};



onMounted(async () => {

    await getManufactures();
    await getProductDepartment();

});

</script>
<template>

    <div class="dashboard-main-body">


        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
            <h6 class="fw-semibold mb-0" style="color: #10b981">Create Manufacture</h6>
            <ul class="d-flex align-items-center gap-2">
                <li class="fw-medium">
                    <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
                        <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
                        Dashboard
                    </a>
                </li>
                <li>-</li>
                <li class="fw-medium">Create Manufacture</li>
            </ul>
        </div>


        <div class="card h-100 p-0 radius-12 overflow-hidden">
            <div class="card-body p-40">
                <form @submit.prevent="submit()" class="row g-4">
                    <div class="row">

                        <div class="col-sm-12">


                            <div class="mb-20">
                                <label for="address" class="form-label fw-semibold text-primary-light text-sm mb-8">
                                    Department </label>
                                <select class="form-control radius-8" id="address" v-model="Product_Department_Id">
                                    <option value="" disabled selected>Select Department</option>
                                    <option v-for="department in ProductDepartments" :key="department.id"
                                        :value="department.id">
                                        {{ department.Product_Department_Name }}
                                    </option>

                                </select>
                            </div>



                            <div class="mb-20">
                                <label for="address" class="form-label fw-semibold text-primary-light text-sm mb-8">
                                    Name <span class="text-danger-600">*</span> </label>
                                <input type="text" class="form-control radius-8" id="address" v-model="name"
                                    placeholder="Enter Your Name">
                            </div>






                        </div>
                        <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
                            <button type="reset"
                                class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8">
                                Reset
                            </button>
                            <button type="submit"
                                class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8">
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
                            <input type="text" name="#0" class="form-control form-control-sm w-auto"
                                placeholder="Search">
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
                                        <input class="form-check-input" type="checkbox" value="" id="checkAll">
                                        <label class="form-check-label" for="checkAll">
                                            S.L
                                        </label>
                                    </div>
                                </th>
                                <th scope="col">Department</th>

                                <th scope="col">Name</th>


                                <th scope="col">Action</th>
                            </tr>
                        </thead>
                        <tbody>


                            <tr v-for="(manufacture, index) in ProductManufactures" :key="manufacture.id">
                                <td>
                                    <div class="form-check style-check d-flex align-items-center">
                                        <input class="form-check-input" type="checkbox"
                                            :id="'check-' + manufacture.id" />
                                        <label class="form-check-label" :for="'check-' + manufacture.id">
                                            {{ index + 1 }}
                                        </label>
                                    </div>
                                </td>

                                <td>
                                    <div class="d-flex align-items-center">
                                        <!-- Optional static image -->
                                        <h6 class="text-md mb-0 fw-medium flex-grow-1">{{
                                            manufacture.department?.Product_Department_Name }}</h6>

                                    </div>
                                </td>


                                <td>
                                    <div class="d-flex align-items-center">
                                        <!-- Optional static image -->
                                        <h6 class="text-md mb-0 fw-medium flex-grow-1">{{
                                            manufacture.Products_Manufacture_Name }}</h6>

                                    </div>
                                </td>

                                <td>
                                    <a href="javascript:void(0)"
                                        class="w-32-px h-32-px bg-primary-light text-primary-600 rounded-circle d-inline-flex align-items-center justify-content-center">
                                        <iconify-icon icon="iconamoon:eye-light"></iconify-icon>
                                    </a>
                                    <a href="javascript:void(0)"
                                        class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center">
                                        <iconify-icon icon="lucide:edit"></iconify-icon>
                                    </a>
                                    <a href="javascript:void(0)"
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



</template>