<script setup lang="ts">
definePageMeta({
     layout: 'admin',
     middleware: ['permission'],
     permissions: 'departments'
     
    });

    import { ref, onMounted ,defineEmits, defineProps, watch} from 'vue'
     const { $axios, $r2Url } = useNuxtApp();


interface CustomerContact {
  id: number;
  Contact_Person_Name: string;
  Telephone: string;
  Email: string;
  created_at?: string;
  updated_at?: string;
}

interface Order {
  id: number;
  Order_Code: string;
  Transaction_Number: string;
  Total_Price: number;
  customer_contact?: CustomerContact;
  Status: string;
  created_at?: string;
  updated_at?: string;
}


const orders = ref<Order[]>([]);

const fetchOrders = async () => {
  try {
    const response = await $axios.get('/api/orders-placed');
    orders.value = response.data;
    
  } catch (error) {
    console.error('Failed to fetch orders:', error);
  }
};

onMounted(() => {
  fetchOrders();
});

</script>
<template>

     <div class="dashboard-main-body">


        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
              <h6 class="fw-semibold mb-0" style="color: #ef4444">View Orders</h6>
              <ul class="d-flex align-items-center gap-2">
                  <li class="fw-medium">
                      <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
                          <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
                          Dashboard
                      </a>
                  </li>
                  <li>-</li>
                  <li class="fw-medium">View Orders</li>
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
                    
                  </div>
                  <div class="card-body">

                    <table class="table w-full text-sm text-left text-gray-700 dark:text-gray-300 table-bordered shadow-sm border mb-0">
                        <thead class="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white">
                          <tr>
                            <th scope="col" class="p-3">
                              <div class="form-check style-check flex items-center">
                                <input class="form-check-input" id="serial" type="checkbox">
                                <label class="ms-2 form-check-label" for="serial">S.L</label>
                              </div>
                            </th>
                            <th scope="col" class="p-3">Order Code</th>
                            <th scope="col" class="p-3">Transaction Number</th>
                            <th scope="col" class="p-3">Customer Name</th>
                            <th scope="col" class="p-3">Customer Number</th>
                            <th scope="col" class="p-3">Total Price</th>
                            <th scope="col" class="p-3">Status</th>
                            <th scope="col" class="p-3">Created At</th>
                            <th scope="col" class="p-3 text-center">Action</th>
                          </tr>
                        </thead>

                          <tbody>
                            <tr v-for="(order, index) in orders" :key="order.id" class="border-t">
                              <td class="p-3">
                                <div class="form-check style-check flex items-center">
                                  <input class="form-check-input" type="checkbox" :id="'check-' + order.id">
                                  <label class="form-check-label" :for="'check-' + order.id">{{ index + 1 }}</label>
                                </div>
                              </td>
                              <td class="p-3">{{ order.Order_Code }}</td>
                              <td class="p-3">{{ order.Transaction_Number }}</td>
                              <td class="p-3">{{ order.customer_contact?.Contact_Person_Name }}</td>
                              <td class="p-3">{{ order.customer_contact?.Telephone }}</td>
                              <td class="p-3">{{ order.Total_Price }}</td>
                              <td class="p-3">{{ order.Status }}</td>
                              <td class="p-3">{{ order.created_at }}</td>
                              <td class="p-3 text-center">
                                <button class="btn btn-sm btn-primary">View</button>
                                <button class="btn btn-sm btn-danger">Print</button>
                            
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