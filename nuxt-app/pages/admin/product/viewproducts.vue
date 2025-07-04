<script setup lang="ts">
definePageMeta({
     layout: 'admin',
     middleware: ['permission'],
     permissions: 'departments'
     
    });
 
import { ref, onMounted } from 'vue'
const { $axios } = useNuxtApp();


interface Products{
    id: number;
    name: string;
    created_at: string;
    price: number;
}

const products = ref<Products[]>([]);


const fetchProducts = async () => {
    try {
        const response = await $axios.get('/api/productmaster');
        products.value = response.data;
    } catch (error) {
        console.error('Error fetching products:', error);
    }
};


const deleteProduct = async (id: number) => {
  alert('Are you sure you want to delete this product?');
    if (!confirm('Are you sure you want to delete this product?')) {
        return; // Exit if the user cancels the deletion
    }
    try {
         await $axios.delete(`/api/productmaster/${id}`);
         await fetchProducts(); // Refresh the product list after deletion
    } catch (error) {
        console.error('Error deleting product:', error);
    }
};


onMounted(async() => {
    await fetchProducts();
});

</script>
<template>

    <div class="dashboard-main-body">


    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 class="fw-semibold mb-0" style="color: #ef4444">View Products</h6>
        <ul class="d-flex align-items-center gap-2">
            <li class="fw-medium">
                <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
                    <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
                    Dashboard
                </a>
            </li>
            <li>-</li>
            <li class="fw-medium">View Products</li>
        </ul>
    </div>


 

    <div class="card h-100 p-0 radius-12 overflow-hidden">
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
                            <option>Status</option>
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
                          <th scope="col" class="text-neutral-800 dark:text-white">
                            <div class="form-check style-check flex items-center">
                              <input class="form-check-input" id="serial" type="checkbox">
                              <label class="ms-2 form-check-label" for="serial">
                                S.L
                              </label>
                            </div>
                          </th>
                           
                          <th scope="col" class="text-neutral-800 dark:text-white">
                            <div class="flex items-center gap-2">
                              Name
                              <svg class="w-4 h-4 ms-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m8 15 4 4 4-4m0-6-4-4-4 4"/>
                              </svg>
                            </div>
                          </th>
                          <th scope="col" class="text-neutral-800 dark:text-white">
                            <div class="flex items-center gap-2">
                              Created Date
                              <svg class="w-4 h-4 ms-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m8 15 4 4 4-4m0-6-4-4-4 4"/>
                              </svg>
                            </div>
                          </th>
                          <th scope="col" class="text-neutral-800 dark:text-white">
                            <div class="flex items-center gap-2">
                              Amount
                              <svg class="w-4 h-4 ms-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m8 15 4 4 4-4m0-6-4-4-4 4"/>
                              </svg>
                            </div>
                          </th>
                           
                          <th scope="col" class="text-neutral-800 dark:text-white">
                            <div class="flex items-center gap-2">
                              Action
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>

                        
                        <tr v-for="(product,index) in products" :key="product.id">
                          <td>
                            <div class="form-check style-check flex items-center">
                              <input class="form-check-input" type="checkbox">
                              <label class="ms-2 form-check-label">
                                 {{ index + 1 }}
                              </label>
                            </div>
                          </td> 
                          <td>
                            <div class="flex items-center">
                              <img src="/public/isc-assets/images/user-list/user-list1.png" alt="" class="shrink-0 me-3 rounded-lg">
                            {{ product.name }}
                            </div>

                         

                          </td>
                          <td> {{ product.created_at }}</td>
                          <td>OMR {{ product.price }}</td>
                           <td>
                            <a href="javascript:void(0)" class="w-8 h-8 bg-primary-50 dark:bg-primary-600/10 text-primary-600 dark:text-primary-400 rounded-full inline-flex items-center justify-center">
                              <iconify-icon icon="iconamoon:eye-light"></iconify-icon>
                            </a>
                            <a href="javascript:void(0)" class="w-8 h-8 bg-success-100 dark:bg-success-600/25 text-success-600 dark:text-success-400 rounded-full inline-flex items-center justify-center">
                              <iconify-icon icon="lucide:edit"></iconify-icon>
                            </a>
                            <a @click.prevent="deleteProduct(product.id)" class="w-8 h-8 bg-danger-100 dark:bg-danger-600/25 text-danger-600 dark:text-danger-400 rounded-full inline-flex items-center justify-center">
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