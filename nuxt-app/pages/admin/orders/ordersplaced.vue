<script setup lang="ts">
import { definePageMeta, useNuxtApp } from '#imports'
import { ref, onMounted, defineEmits, defineProps, watch, reactive } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'departments'

});

const { $axios, $r2Url } = (useNuxtApp() as any);


interface CustomerContact {
  id: number;
  Contact_Person_Name: string;
  Telephone: string;
  Email: string;
  created_at?: string;
  updated_at?: string;
}

interface Shipper {
  id: number;
  Shippers_Name: string;



}

interface Order {
  id: number;
  Order_Code: string;
  Transaction_Number: string;
  Total_Price: number;
  Shippers_Id: number;
  Shipping_Price: string
  customer_contact?: CustomerContact;
  shipper?: Shipper;
  Status: string;
  created_at?: string;
  updated_at?: string;
}


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



const orders = ref<Order[]>([]);

const fetchOrders = async () => {
  try {
    const { data } = await $axios.get('/api/orders-placed', {
      params: {
        page: table.page,
        per_page: table.perPage,
        search: table.search,
        sortBy: table.sortBy,
        sortDir: table.sortDir,
      }
    });



    orders.value = data.data;
    pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }


  } catch (error) {
    console.error('Failed to fetch orders:', error);
  }
};



watch(
  () => [table.page, table.perPage, table.search, table.sortBy, table.sortDir],
  () => {
    fetchOrders()
  }
)

onMounted(async() => {
  await fetchOrders();
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
              <select v-model.number="table.perPage" class="form-select form-select-sm w-auto">
                <option :value="10">10</option>
                <option :value="15">15</option>
                <option :value="20">20</option>
              </select>

            </div>
            <div class="icon-field">
              <input type="text" class="form-control form-control-sm w-auto" placeholder="Search"
                v-model="table.search" />
              <span class="icon">
                <iconify-icon icon="ion:search-outline"></iconify-icon>
              </span>
            </div>
          </div>

        </div>
        <div class="card-body">

          <div class="table-responsive table-scroll rounded-3 border shadow-sm">
            <table class="table table-hover table-striped align-middle mb-0 table-sticky">
              <thead class="table-header-gradient text-white">
                <tr class="text-uppercase small">
                  <th class="py-3 px-3">
                    <div class="form-check m-0 d-flex align-items-center gap-2">
                       <label class="form-check-label fw-semibold" for="select-all">S.L</label>
                    </div>
                  </th>
                  <th class="py-3 px-3">Order Code</th>
                  <th class="py-3 px-3">Transaction Number</th>
                  <th class="py-3 px-3">Customer Name</th>
                  <th class="py-3 px-3">Customer Number</th>
                  <th class="py-3 px-3">Shipper Name</th>
                  <th class="py-3 px-3 text-end">Shipping Price</th>
                  <th class="py-3 px-3 text-end">Total Price</th>
                  <th class="py-3 px-3">Status</th>
                  <th class="py-3 px-3">Created At</th>
                  <th class="py-3 px-3 text-center" style="width: 8rem;">Action</th>
                </tr>
              </thead>

              <tbody>
                <tr v-for="(order, index) in orders" :key="order.id">
                  <!-- checkbox + serial -->
                  <td class="py-2 px-3">
                    <div class="form-check m-0 d-flex align-items-center gap-2">
                      <label class="form-check-label text-muted small" :for="`check-${order.id}`">{{ index + 1
                        }}</label>
                    </div>
                  </td>

                  <!-- codes (truncate) -->
                  <td class="py-2 px-3">
                    <div class="text-truncate fw-semibold font-monospace" style="max-width: 200px;">
                      {{ order.Order_Code || '-' }}
                    </div>
                  </td>
                  <td class="py-2 px-3">
                    <div class="text-truncate font-monospace" style="max-width: 200px;">
                      {{ order.Transaction_Number || '-' }}
                    </div>
                  </td>

                  <!-- customer -->
                  <td class="py-2 px-3">{{ order.customer_contact?.Contact_Person_Name || '-' }}</td>
                  <td class="py-2 px-3 text-nowrap">{{ order.customer_contact?.Telephone || '-' }}</td>
                  <td class="py-2 px-3">{{ order.shipper?.Shippers_Name || '-' }}</td>

                  <!-- money chips -->
                  <td class="py-2 px-3 text-end text-nowrap">
                    <span class="currency-chip omr">
                      <span class="fw-bold me-1">OMR</span>{{ Number(order.Shipping_Price || 0).toFixed(3) }}
                    </span>
                  </td>
                  <td class="py-2 px-3 text-end text-nowrap">
                    <span class="currency-chip total">
                      <span class="fw-bold me-1">OMR</span>{{ Number(order.Total_Price || 0).toFixed(3) }}
                    </span>
                  </td>

                  <!-- status badge -->
                  <td class="py-2 px-3">
                    <span class="badge rounded-pill" :class="{
                      'bg-warning text-dark': order.Status === 'pending',
                      'bg-success': ['paid', 'completed'].includes(order.Status),
                      'bg-primary': order.Status === 'shipped',
                      'bg-danger': ['cancelled', 'failed'].includes(order.Status),
                      'bg-secondary': !['pending', 'paid', 'completed', 'shipped', 'cancelled', 'failed'].includes(order.Status)
                    }">
                      {{ order.Status }}
                    </span>
                  </td>

                  <!-- date -->
                  <td class="py-2 px-3 text-nowrap">

                    {{ order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short', year: 'numeric' }) : '-' }}

                  </td>

                  <!-- actions -->
                  <td class="py-2 px-3">
                    <div class="d-flex justify-content-center gap-2">
                      <NuxtLink :to="`/admin/orders/${order.id}`" class="btn btn-sm btn-success px-3">View</NuxtLink>

                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>




          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-24">
            <span>
              Showing {{ pagination.from || 0 }} to {{ pagination.to || 0 }} of {{ pagination.total || 0 }} entries
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