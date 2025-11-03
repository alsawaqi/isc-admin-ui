<script setup lang="ts">
definePageMeta({
    layout: 'admin',
    middleware: ['permission'],
    permissions: 'departments'

});
import { ref, onMounted } from 'vue';
const { $axios } = useNuxtApp();

interface CustomerType {
    id: number;
    Customer_Type_Name: string;
    Customer_Type_Description: string;
    created_at: string;
}

const customerTypes = ref<CustomerType[]>([]);
const isLoading = ref<boolean>(false);
const CustomerTypeName = ref<string>('');
const CustomerTypeDescription = ref<string>('');
const successMessage = ref<boolean>(false);
const errorMessage = ref<string>('');
const isSubmitting = ref<boolean>(false);


const getCustomerTypes = async (): Promise<void> => {
    isLoading.value = true;
    try {
        const response = await $axios.get('/api/customer-types');
        console.log('Fetched customer types:', response.data);

        customerTypes.value = response.data;
    } catch (error) {
        console.error('Failed to fetch customer types:', error);
    }finally {
        isLoading.value = false;
    }
};

const submitCustomerType = async (): Promise<void> => {

    isSubmitting.value = true;

    try {
        const payload = {
            Customer_Type_Name: CustomerTypeName.value,
            Customer_Type_Description: CustomerTypeDescription.value
        };

        const response = await $axios.post('/api/customer-types', payload);
        console.log('Customer type created:', response.data);
        successMessage.value = true;
        errorMessage.value = '';
        CustomerTypeName.value = '';
        CustomerTypeDescription.value = '';
        await getCustomerTypes();

    } catch (error) {
        console.error('Error creating customer type:', error);
        errorMessage.value = 'Failed to create customer type.';
    } finally {
        isSubmitting.value = false;
    }


}


onMounted(async (): Promise<void> => {
    await getCustomerTypes();
});



</script>
<template>


    <div class="dashboard-main-body">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
            <h6 class="fw-semibold mb-0" style="color: #6b8629">Customer Type</h6>
            <ul class="d-flex align-items-center gap-2">
                <li class="fw-medium">
                    <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
                        <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
                        Dashboard
                    </a>
                </li>
                <li>-</li>
                <li class="fw-medium">Customer Type</li>
            </ul>
        </div>



        <div class="card h-100 p-0 radius-12 overflow-hidden">
            <div class="card-body p-40">
                <form @submit.prevent="submitCustomerType()">
                    <div class="row">

                        <div class="col-sm-12">
                            <div class="mb-20">
                                <label for="address" class="form-label fw-semibold text-primary-light text-sm mb-8">
                                    Customer Type Name* <span class="text-danger-600">*</span></label>
                                <input type="text" v-model="CustomerTypeName" class="form-control radius-8" id="address"
                                    placeholder="Enter Customer Type Name" required>
                            </div>



                        </div>


                        <div class="col-sm-12">
                            <div class="mb-20">
                                <label for="address" class="form-label fw-semibold text-primary-light text-sm mb-8">
                                    Descripition* <span class="text-danger-600">*</span></label>
                                <input type="text" v-model="CustomerTypeDescription" class="form-control radius-8"
                                    id="address" placeholder="Enter Customer Type Description">
                            </div>



                        </div>
                        <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
                            <button type="reset"
                                class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8">
                                Reset
                            </button>
                            <button type="submit"
                                class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"
                                :disable="isSubmitting">
                                <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"
                                    aria-hidden="true"></span>
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




                    <div class="spinner-border" role="status" v-if="isLoading">
                        <span class="sr-only">Loading...</span>
                    </div>


                    <table class="table bordered-table mb-0" v-else>
                        <thead>
                            <tr>
                                <th scope="col">
                                    <div class="form-check style-check d-flex align-items-center">
                                       
                                        <label class="form-check-label" for="checkAll">
                                            S.L
                                        </label>
                                    </div>
                                </th>

                               <th scope="col">Customer Type Name</th>
                               <th scope="col">Customer Type Description</th>


                                <th scope="col">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                           <tr v-for="(type, index) in customerTypes" :key="type.id">
                                <td>
                                    <div class="form-check style-check d-flex align-items-center">
                                         {{ index + 1 }}
                                    </div>
                                </td>
                                <td>{{ type.Customer_Type_Name }}</td>
                                <td>{{ type.Customer_Type_Description }}</td>
                                <td>
                                    
                                    <a href="javascript:void(0)" class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center">
                                        <iconify-icon icon="lucide:edit"></iconify-icon>
                                    </a>
                                    <a class="w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center">
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