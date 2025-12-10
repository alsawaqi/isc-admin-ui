<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { definePageMeta, useNuxtApp, useParam, useRouter } from '#imports'
definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'shipping.shippers'
})

const router = useRouter();
const customer_id = useParam('id');
const { $axios } = (useNuxtApp() as any);

interface Products {
  id: number;
  Product_Name: string;
  Product_Price: number;

}

interface Cart {
  id: number;
  product: Products;
  Quantity: number;
  created_at: string;
}


interface Customer {
  id: number;
  Customer_Full_Name: string;

}



const table = reactive({
  page: 1,
  perPage: 10,
  search: '',
  sortBy: 'id',
  sortDir: 'desc',
  status: ''
})

// paginator info from backend
const pagination = ref({
  total: 0,
  from: 0,
  to: 0,
  last_page: 1,
})


const carts = ref<Cart[]>([]);
const loading = ref<boolean>(false);
const customer = ref<Customer | null>(null);

const fetchCarts = async (): Promise<void> => {
  loading.value = true;
  try {
    const { data } = await $axios.get(`/api/customers/carts`, {
      params: {
        customer_id: customer_id,
        page: table.page,
        per_page: table.perPage,
        search: table.search,
        sort_by: table.sortBy,
        sort_dir: table.sortDir,
        status: table.status || undefined,
      },
    });

    // paginator object
    const paginator = data.data;

    carts.value = paginator.data;

    pagination.value = {
      total: paginator.total,
      from: paginator.from,
      to: paginator.to,
      last_page: paginator.last_page,
    };


    customer.value = data.customer;


  } catch (error) {
    console.error('Error fetching carts:', error);
  } finally {
    loading.value = false;
  }
};



const goBack = () => {
  router.back();
};



const multiplyAndRound = (
  price: number | null | undefined,
  qty: number,
  decimals = 3
): string => {
  const safePrice = price ?? 0; // fallback to 0 if null/undefined
  const total = safePrice * qty;
  return total.toFixed(decimals); // returns string like "12.345"
};



watch(
  () => [table.page, table.perPage, table.search, table.sortBy, table.sortDir, table.status],
  async () => {
    await fetchCarts()
  }
)


onMounted(async () => {
  await fetchCarts();
});

</script>
<template>


  <div class="dashboard-main-body">

    <div>
      <span class="cursor-pointer" @click="goBack">
        Back
      </span>
    </div>


    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #ef4444">

        View {{ customer?.Customer_Full_Name }} {{ carts.length > 0 ? ' (' + carts.length + ')' : '' }} Carts
      </h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">View {{ customer?.Customer_Full_Name }} Orders</li>
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
                  <th class="py-3 px-3">Products Name</th>
                  <th class="py-3 px-3">Products Price</th>
                  <th class="py-3 px-3">Quantity</th>
                  <th class="py-3 px-3">Total</th>

                </tr>
              </thead>

              <span v-if="loading" class="d-flex justify-content-center align-items-center my-5">
                Loading...
              </span>

              <tbody v-else>
                <tr v-for="(cart, index) in carts" :key="cart.id">
                  <td class="py-3 px-3">{{ index + 1 }}</td>
                  <td class="py-3 px-3">
                    {{ cart.product?.Product_Name }}
                  </td>
                  <td class="py-3 px-3">
                    {{ cart.product?.Product_Price }} OMR
                  </td>
                  <td class="py-3 px-3">{{ cart.Quantity }}</td>
                  <td class="py-3 px-3">
                    {{ multiplyAndRound(cart.product?.Product_Price, cart.Quantity) }} OMR
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