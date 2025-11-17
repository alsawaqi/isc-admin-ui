<script lang="ts" setup>
import { definePageMeta,useNuxtApp } from '#imports';
import { ref, onMounted } from 'vue';

definePageMeta({
    layout: 'admin',
    middleware: ['permission'],
    permissions: 'departments'

});

const { $axios } = (useNuxtApp() as any);

interface Customer {
    id: number;
    Customer_Full_Name: string;
    Email_Address: string;
    Telephone: string;
    Customer_Address: string;
    Loyalty_Points: number;
    created_at: string;
}


const customers = ref<Customer[]>([]);

const fetchCustomers = async (): Promise<void> => {
    try {
        const response = await $axios.get('/api/customers');
        customers.value = response.data;
        console.log('Fetched customers:', customers.value);
    } catch (error) {
        console.error('Failed to fetch customers:', error);
    }
};

onMounted(async () => {
    await fetchCustomers();
});

</script>
<template>


    <div class="dashboard-main-body">


        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
            <h6 class="fw-semibold mb-0" style="color: #10b981">Customers</h6>
            <ul class="d-flex align-items-center gap-2">
                <li class="fw-medium">
                    <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
                        <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
                        Dashboard
                    </a>
                </li>
                <li>-</li>
                <li class="fw-medium">Customers</li>
            </ul>
        </div>



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
                                

                                <th scope="col">Full Name</th>
                                <th scope="col">Telephone</th>
                                <th scope="col">Email Address</th>
                                <th scope="col">Loyality Points</th>


                             
                            </tr>
                        </thead>
                        <tbody>

                            <tr v-for="(customer, index) in customers" :key="customer.id">
                                <td>
                                    <div class="form-check style-check d-flex align-items-center">
                                        <input class="form-check-input" type="checkbox" :value="customer.id"
                                            :id="'check' + customer.id">
                                        <label class="form-check-label" :for="'check' + customer.id">
                                            {{ index + 1 }}
                                        </label>            
                                        </div>   
                                        </td>
                                        <td>{{ customer.Customer_Full_Name }}</td>
                                        <td>{{ customer.Telephone }}</td>
                                        <td>{{ customer.Email_Address }}</td>
                                        <td>{{ customer.Loyalty_Points }}</td>
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