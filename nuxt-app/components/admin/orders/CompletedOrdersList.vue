<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { navigateTo, useNuxtApp } from '#imports'
import {
  adminActionLabel,
  adminStatusClass,
  adminStatusLabel,
  isKeyboardActivation,
  tableNavigationLabel,
} from '~/utils/adminAccessibility.js'

const { $axios } = (useNuxtApp() as any)

interface CustomerContact {
  Contact_Person_Name?: string
  Telephone?: string
  Email?: string
}

interface Order {
  id: number
  Order_Code?: string
  Transaction_Number?: string
  Delivery_Type?: string
  Shipping_Basis?: string
  Shipping_Price?: number | string
  Total_Price?: number | string
  Product_Discount_Amount?: number | string
  Loyalty_Discount_Amount?: number | string
  Loyalty_Points_Redeemed?: number
  Status?: string
  created_at?: string
  orderlist?: any[]
  orderlist_count?: number
  total_quantity?: number
  customer_contact?: CustomerContact
  shipper?: any
  location?: any
  transaction?: any
  vendor_orders?: any[]
}

const table = reactive({
  page: 1,
  perPage: 10,
  search: '',
  sortBy: 'id',
  sortDir: 'desc',
  status: '',
})

const pagination = ref({
  total: 0,
  from: 0,
  to: 0,
  last_page: 1,
})

const orders = ref<Order[]>([])
const loading = ref(false)
const errorMsg = ref<string | null>(null)

async function fetchOrders() {
  loading.value = true
  errorMsg.value = null

  try {
    const { data } = await $axios.get('/api/orders-placed/delivered', {
      params: {
        page: table.page,
        per_page: table.perPage,
        search: table.search,
        sortBy: table.sortBy,
        sortDir: table.sortDir,
        status: table.status,
      },
    })

    orders.value = data.data || []
    pagination.value = {
      total: data.total || 0,
      from: data.from || 0,
      to: data.to || 0,
      last_page: data.last_page || 1,
    }
  } catch (error: any) {
    errorMsg.value = error?.response?.data?.message || 'Failed to fetch orders.'
  } finally {
    loading.value = false
  }
}

watch(
  () => [table.page, table.perPage, table.search, table.sortBy, table.sortDir, table.status],
  fetchOrders,
)

onMounted(fetchOrders)

function money(value?: number | string | null) {
  return `OMR ${Number(value || 0).toFixed(3)}`
}

function fmt(value?: string) {
  return value
    ? new Date(value).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '-'
}

function statusClass(status?: string) {
  return adminStatusClass(status)
}

function fulfillmentLabel(order: Order) {
  if (order.Delivery_Type === 'pickup') return 'Local pickup'
  if (order.Delivery_Type === 'ship') return 'Ship to address'
  return order.Delivery_Type || '-'
}

function fulfillmentName(order: Order) {
  if (order.Delivery_Type === 'pickup') {
    return order.location?.Location_Name || order.location?.Location_Name_Ar || '-'
  }

  return order.shipper?.Shippers_Name || '-'
}

function paymentLabel(order: Order) {
  const line = order.transaction?.details?.[0]
  if (!line) return '-'
  return `${line.Payment_Method || '-'}${line.Payment_Status ? ` / ${line.Payment_Status}` : ''}`
}

function itemsLabel(order: Order) {
  const count = Number(order.orderlist_count || order.orderlist?.length || 0)
  const qty = Number(order.total_quantity || order.orderlist?.reduce((sum: number, line: any) => sum + Number(line.Quantity || 0), 0) || 0)
  return `${count} line(s), ${qty} item(s)`
}

function orderSubject(order: Order) {
  return order.Order_Code || order.Transaction_Number || `order ${order.id}`
}

function openOrder(order: Order) {
  return navigateTo(`/admin/orders/completed/${order.id}`)
}

function onOrderRowKey(event: KeyboardEvent, order: Order) {
  if (!isKeyboardActivation(event)) return
  event.preventDefault()
  openOrder(order)
}
</script>

<template>
  <div class="dashboard-main-body completed-orders-list">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <div>
        <h6 class="fw-semibold mb-1" style="color: #1d2939">All Orders</h6>
        <div class="text-muted small">Every order across all fulfillment stages and statuses — pending, packing, dispatch, shipment, pickup, delivered, on-hold, cancelled, and returned.</div>
      </div>
      <ul class="d-flex align-items-center gap-2 mb-0">
        <li class="fw-medium">
          <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg" aria-hidden="true"></iconify-icon>
            Dashboard
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">All Orders</li>
      </ul>
    </div>

    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div class="d-flex flex-wrap align-items-center gap-3">
            <div>
              <label for="completed-orders-page-size" class="form-label small text-muted mb-1">Show</label>
              <select id="completed-orders-page-size" v-model.number="table.perPage" class="form-select form-select-sm">
                <option :value="10">10</option>
                <option :value="15">15</option>
                <option :value="20">20</option>
              </select>
            </div>
            <div>
              <label for="completed-orders-search" class="form-label small text-muted mb-1">Search</label>
              <input id="completed-orders-search" v-model="table.search" type="text" class="form-control form-control-sm" placeholder="Order, transaction, customer, phone" />
            </div>
            <div>
              <label for="completed-orders-status" class="form-label small text-muted mb-1">Status</label>
              <select id="completed-orders-status" v-model="table.status" class="form-select form-select-sm">
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="packed">Packed</option>
                <option value="dispatched">Dispatched</option>
                <option value="shipped">Shipped</option>
                <option value="ready_for_collection">Ready for Collection</option>
                <option value="delivered">Delivered</option>
                <option value="on-hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
                <option value="returned">Returned</option>
              </select>
            </div>
          </div>

          <div class="completed-stat">
            <span>Total</span>
            <strong>{{ pagination.total }}</strong>
          </div>
        </div>
      </div>
    </div>

    <div v-if="errorMsg" class="alert alert-danger" role="alert">{{ errorMsg }}</div>

    <div class="card border-0 shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0 completed-orders-table" :aria-busy="loading ? 'true' : 'false'" aria-describedby="completed-orders-range">
          <caption class="visually-hidden">All orders with customer, fulfillment, payment, vendor split, totals, status, and actions.</caption>
          <thead class="table-light">
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Customer</th>
              <th scope="col">Fulfillment</th>
              <th scope="col">Items</th>
              <th scope="col">Payment</th>
              <th scope="col">Vendor Split</th>
              <th scope="col" class="text-end">Shipping</th>
              <th scope="col" class="text-end">Total</th>
              <th scope="col">Status</th>
              <th scope="col">Order Date</th>
              <th scope="col" class="text-end">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="11" class="text-center text-muted py-4" role="status">Loading orders...</td>
            </tr>
            <tr v-else-if="!orders.length">
              <td colspan="11" class="text-center text-muted py-4" role="status">No orders found. Adjust the filters or search another order reference.</td>
            </tr>
            <template v-else>
              <tr
                v-for="order in orders"
                :key="order.id"
                role="row"
                tabindex="0"
                :aria-label="adminActionLabel('Open order', orderSubject(order))"
                @click="openOrder(order)"
                @keydown="onOrderRowKey($event, order)"
              >
                <td>
                  <div class="fw-semibold font-monospace">{{ order.Order_Code || '-' }}</div>
                  <div class="text-muted small font-monospace">{{ order.Transaction_Number || '-' }}</div>
                </td>
                <td>
                  <div class="fw-semibold">{{ order.customer_contact?.Contact_Person_Name || '-' }}</div>
                  <div class="text-muted small">{{ order.customer_contact?.Telephone || '-' }}</div>
                </td>
                <td>
                  <div class="fw-semibold">{{ fulfillmentLabel(order) }}</div>
                  <div class="text-muted small">{{ fulfillmentName(order) }}</div>
                  <div v-if="order.Shipping_Basis" class="text-muted small">Basis: {{ order.Shipping_Basis }}</div>
                </td>
                <td>{{ itemsLabel(order) }}</td>
                <td class="text-capitalize">{{ paymentLabel(order) }}</td>
                <td>
                  <span class="badge rounded-pill bg-info text-dark">
                    {{ order.vendor_orders?.length || 0 }} vendor(s)
                  </span>
                </td>
                <td class="text-end text-nowrap">{{ money(order.Shipping_Price) }}</td>
                <td class="text-end text-nowrap fw-semibold">{{ money(order.Total_Price) }}</td>
                <td>
                  <span class="badge rounded-pill admin-status-badge" :class="statusClass(order.Status)">
                    {{ adminStatusLabel(order.Status) }}
                  </span>
                </td>
                <td class="text-nowrap">{{ fmt(order.created_at) }}</td>
                <td class="text-end">
                  <NuxtLink
                    :to="`/admin/orders/completed/${order.id}`"
                    class="btn btn-sm btn-primary"
                    :aria-label="adminActionLabel('View details', orderSubject(order))"
                    @click.stop
                  >
                    View details
                  </NuxtLink>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div class="card-footer bg-white d-flex flex-wrap align-items-center justify-content-between gap-2">
        <span id="completed-orders-range" class="small text-muted">
          Showing {{ pagination.from || 0 }} to {{ pagination.to || 0 }} of {{ pagination.total || 0 }} entries
        </span>

        <nav :aria-label="tableNavigationLabel('Completed orders', table.page, pagination.last_page)">
          <ul class="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center mb-0">
            <li class="page-item" :class="{ disabled: table.page === 1 }">
              <button
                type="button"
                class="page-link"
                :disabled="table.page === 1"
                :aria-label="adminActionLabel('Previous page', 'completed orders')"
                @click="table.page > 1 && (table.page -= 1)"
              >
                <iconify-icon icon="ep:d-arrow-left" aria-hidden="true"></iconify-icon>
              </button>
            </li>

            <li v-for="p in pagination.last_page" :key="p" class="page-item" :class="{ active: p === table.page }">
              <button
                type="button"
                class="page-link"
                :aria-label="`Go to completed orders page ${p}`"
                :aria-current="p === table.page ? 'page' : undefined"
                @click="table.page = p"
              >
                {{ p }}
              </button>
            </li>

            <li class="page-item" :class="{ disabled: table.page === pagination.last_page }">
              <button
                type="button"
                class="page-link"
                :disabled="table.page === pagination.last_page"
                :aria-label="adminActionLabel('Next page', 'completed orders')"
                @click="table.page < pagination.last_page && (table.page += 1)"
              >
                <iconify-icon icon="ep:d-arrow-right" aria-hidden="true"></iconify-icon>
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </div>
</template>

<style scoped>
.completed-orders-table {
  min-width: 1180px;
}

.completed-orders-table tbody tr[tabindex='0'] {
  cursor: pointer;
}

.completed-orders-table tbody tr[tabindex='0']:focus-visible {
  outline: 3px solid #0ea5e9;
  outline-offset: -3px;
}

.admin-status-badge {
  font-weight: 700;
}

.status-success {
  background-color: #166534 !important;
  color: #ffffff !important;
}

.status-warning {
  background-color: #facc15 !important;
  color: #3f2f00 !important;
}

.status-danger {
  background-color: #b91c1c !important;
  color: #ffffff !important;
}

.status-info {
  background-color: #075985 !important;
  color: #ffffff !important;
}

.status-neutral {
  background-color: #475569 !important;
  color: #ffffff !important;
}

.completed-stat {
  min-width: 84px;
  border: 1px solid #e5eaf2;
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.completed-stat span {
  color: #667085;
  font-size: 12px;
}

.completed-stat strong {
  font-size: 20px;
}
</style>
