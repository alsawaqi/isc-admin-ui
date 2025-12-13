<script lang="ts" setup>
import { definePageMeta,useNuxtApp } from '#imports';
import { ref, onMounted, reactive, watch } from 'vue'
import { useFlashStore } from '~/stores/flashs'
const flash = useFlashStore()

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
    loyalty: Array<{
      Points_Earned: number;
    }>;
    users: {
      id: number;
      No_Login: number | string;
    };
}

const customers = ref<Customer[]>([]);

const table = reactive({
  page: 1,
  perPage: 10,
  search: '',
  sortBy: 'id',
  sortDir: 'desc',
})

// paginator info from backend
const pagination = ref({
  total: 0,
  from: 0,
  to: 0,
  last_page: 1,
})

const fetchCustomers = async (): Promise<void> => {
    try {
        const {data} = await $axios.get('/api/customers', {
          params: {
            page: table.page,
            per_page: table.perPage,
            search: table.search,
            sort_by: table.sortBy,
            sort_dir: table.sortDir,
          },
        });

        customers.value = data.data;
    
        pagination.value = {
          total: data.total,
          from: data.from,
          to: data.to,
          last_page: data.last_page,
        };
    } catch (error) {
       
        flash.error('Failed to fetch customers: ' + (error as any).message);
    }
};



const blocking = ref<number | null>(null) // which user is being processed

const blockUser = async (userId: number) => {
       const ok = await flash.confirm({
    title: 'Block user?',
    message: `Are you sure you want to block this user? This cannot be undone.`,
    confirmText: 'Yes, block',
    cancelText: 'No, cancel',
  })
  if (!ok) return;

    try {
        blocking.value = userId
      const success =   await $axios.post(`/api/customers/${userId}/block`) // 👈 adjust URL if needed
          if (success) {
      flash.success('User blocked successfully')
    } 
      
        await fetchCustomers() // refresh list
    } catch (error) {
        
        flash.error('Failed to block user: ' + (error as any).message)
    } finally {
        blocking.value = null
    }
}

const unblockUser = async (userId: number) => {
         const ok = await flash.confirm({
    title: 'Unblock user?',
    message: `Are you sure you want to unblock this user?`,
    confirmText: 'Yes, unblock',
    cancelText: 'No, cancel',
  })
  if (!ok) return;

    try {
        blocking.value = userId
        const success = await $axios.post(`/api/customers/${userId}/unblock`) // 👈 adjust URL if needed
        if (success) {
      flash.success('User unblocked successfully')
    } 
        await fetchCustomers()
    } catch (error) {
        flash.error('Failed to unblock user: ' + (error as any).message)
    } finally {
        blocking.value = null
    }
}


watch(
  () => [table.page, table.perPage, table.search, table.sortBy, table.sortDir],
  fetchCustomers,
  { immediate: true }
);  

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
                           

                            <select v-model.number="table.perPage" class="form-select form-select-sm w-auto">
                <option :value="10">10</option>
                <option :value="15">15</option>
                <option :value="20">20</option>
              </select>
                        </div>
                        <div class="icon-field">
                            <input type="text" name="#0" class="form-control form-control-sm w-auto"
                                placeholder="Search" v-model="table.search">
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
                                       
                                        <label class="form-check-label" for="checkAll">
                                            S.L
                                        </label>
                                    </div>
                                </th>
                                

                                <th scope="col">Full Name</th>
                                <th scope="col">Telephone</th>
                                <th scope="col">Email Address</th>
                                <th scope="col">Loyality Points</th>
                                <th scope="col">View Orders</th>
                                <th scope="col">View Cart</th>
                                <th scope="col">View Favorites</th>
                                <th scope="col">Block</th>


                             
                            </tr>
                        </thead>
                        <tbody>

                            <tr v-for="(customer, index) in customers" :key="customer.id">
                                <td>
                                    <div class="form-check style-check d-flex align-items-center">
                                      
                                        <label class="form-check-label" :for="'check' + customer.id">
                                            {{ index + 1 }}
                                        </label>            
                                        </div>   
                                        </td>
                                        <td>{{ customer.Customer_Full_Name }}</td>
                                        <td>{{ customer.Telephone }}</td>
                                        <td>{{ customer.Email_Address }}</td>
                                        <td>{{ customer.loyalty[0]?.Points_Earned }}</td>
                                        <td><NuxtLink :to="`/admin/orders/customer/${customer.id}`">View Orders</NuxtLink></td>
                                        <td><NuxtLink :to="`/admin/customer/cart/${customer.id}`">View Carts</NuxtLink></td>
                                        <td><NuxtLink :to="`/admin/customer/favorites/${customer.id}`">View Favorites</NuxtLink></td>
                                        <td>

                                            <button type="button" class="btn btn-sm"
                                        :class="customer.users?.No_Login === '1.0' ? 'btn-success' : 'btn-danger'"
                                        :disabled="blocking === customer.users?.id"
                                        @click="customer.users?.No_Login === '1.0' ? unblockUser(customer.users?.id) : blockUser(customer.users?.id)">
                                        <span v-if="blocking === customer.users?.id" class="spinner-border spinner-border-sm me-1"
                                            role="status" aria-hidden="true"></span>
                                        {{ customer.users?.No_Login === '1.0' ? 'Unblock' : 'Block' }}
                                    </button>

                                        </td>
                                    </tr>



                        </tbody>
                    </table>

                   <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-24">
            <span>
              Showing {{ pagination.from || 0 }} to {{ pagination.to || 0 }} of {{ pagination.total || 0
              }} entries
            </span>
            <ul class="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
              <!-- Prev -->
              <li class="page-item" :class="{ disabled: table.page === 1 }">
                <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                  href="javascript:void(0)" @click="table.page > 1 && (table.page -= 1)">
                  <iconify-icon icon="ep:d-arrow-left" class="text-xl"></iconify-icon>
                </a>
              </li>

              <!-- Page numbers -->
              <li v-for="p in pagination.last_page" :key="p" class="page-item">
                <a href="javascript:void(0)" @click="table.page = p" :class="[
                  'page-link fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px',
                  p === table.page
                    ? 'bg-primary-600 text-white'
                    : 'bg-primary-50 text-secondary-light'
                ]">
                  {{ p }}
                </a>
              </li>

              <!-- Next -->
              <li class="page-item" :class="{ disabled: table.page === pagination.last_page }">
                <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                  href="javascript:void(0)" @click="table.page < pagination.last_page && (table.page += 1)">
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