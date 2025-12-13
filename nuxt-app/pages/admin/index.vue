<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useNuxtApp, definePageMeta } from '#imports'
import { useAuth } from '~/stores/auth'

definePageMeta({ layout: 'admin', ssr: false })

const { $axios } = useNuxtApp() as any
const auth = useAuth()

const hasPermission = (perm: string) => auth.permissions.includes(perm)

const stockReport = ref<any[]>([])

async function loadStockReport() {
  const { data } = await $axios.get('/api/dashboard/stock-report', { params: { limit: 5 } })
  stockReport.value = data.data || []
}


const txPeriod = ref<'this_month'|'last_month'>('this_month')
const transactions = ref<any[]>([])

const topProducts = ref<any[]>([])

async function loadTopProducts() {
  const { data } = await $axios.get('/api/dashboard/top-products', { params: { limit: 5 } })
  topProducts.value = data.data || []
}

async function loadTransactions() {
  const { data } = await $axios.get('/api/dashboard/transactions-feed', {
    params: { period: txPeriod.value, limit: 6 }
  })
  transactions.value = data.data || []
}

function paymentTitle(t: any) {
  // show method + card last 4 + brand
  if (t.Payment_Method?.toLowerCase() === 'cod') return 'Cash on Delivery'
  const last4 = t.Card_Last4 ? ` • **** ${t.Card_Last4}` : ''
  const brand = t.Card_Brand ? `${t.Card_Brand}` : (t.Payment_Method || 'Payment')
  return `${brand}${last4}`
}

function paymentSubtitle(t: any) {
  // show order + status + customer
  const order = t.Order_Code ? `Order: ${t.Order_Code}` : ''
  const status = t.Payment_Status ? ` • ${t.Payment_Status}` : ''
  const cust = t.Customer_Full_Name ? ` • ${t.Customer_Full_Name}` : ''
  return `${order}${status}${cust}`.replace(/^ • /, '')
}

function amountClass(t: any) {
  // confirmed => green, pending => yellow (you can tweak)
  return (String(t.Payment_Status).toLowerCase() === 'confirmed')
    ? 'text-success-main'
    : 'text-warning-main'
}



const recentOrders = ref<any[]>([])

async function loadRecentOrders() {
  const { data } = await $axios.get('/api/dashboard/recent-orders', { params: { limit: 5 } })
  recentOrders.value = data.data || []
}

function statusPillClass(status: string) {
  switch (status) {
    case 'delivered':
      return 'bg-success-focus text-success-main'
    case 'shipped':
    case 'dispatched':
      return 'bg-info-focus text-info-main'
    case 'pending':
    case 'on-hold':
      return 'bg-warning-focus text-warning-main'
    case 'returned':
      return 'bg-warning-focus text-warning-main'
    case 'cancelled':
      return 'bg-danger-focus text-danger-main'
    case 'processing':
    case 'packed':
    default:
      return 'bg-primary-light text-primary-600' // neutral
  }
}


// keep the template dropdown (even if range is basic for now)
const range = ref<'today' | 'weekly' | 'monthly' | 'yearly'>('weekly')

const paymentOptions = ref<any>({
  chart: { type: 'area', height: 280, toolbar: { show: false } },
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth' },
  xaxis: { categories: [] },
})

const paymentSeries = ref<any[]>([
  { name: 'Confirmed', data: [] },
  { name: 'Pending', data: [] },
])

const confirmedTotal = computed(() =>
  (paymentSeries.value?.[0]?.data || []).reduce((a: number, b: number) => a + Number(b || 0), 0)
)

const pendingTotal = computed(() =>
  (paymentSeries.value?.[1]?.data || []).reduce((a: number, b: number) => a + Number(b || 0), 0)
)

function moneys(v: any) {
  const n = Number(v || 0)
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function loadRevenueChart() {
  const { data } = await $axios.get('/api/dashboard/revenue-chart', {
    params: { range: range.value },
  })

  paymentOptions.value = {
    ...paymentOptions.value,
    xaxis: { categories: data.categories || [] },
  }

  paymentSeries.value = [
    { name: 'Confirmed', data: data.confirmed || [] },
    { name: 'Pending', data: data.pending || [] },
  ]
}


const customerDonutOptions = ref<any>({
  chart: { type: 'donut', height: 280 },
  labels: [],
  legend: { show: true },
  dataLabels: { enabled: false },
})

const customerDonutSeries = ref<number[]>([])

async function loadCustomersDonut() {
  const { data } = await $axios.get('/api/dashboard/customers-donut')

  customerDonutOptions.value = {
    ...customerDonutOptions.value,
    labels: data.labels || [],
  }

  customerDonutSeries.value = data.series || []
}


const kpiTotals = ref({ products: 0, customers: 0, orders: 0, sales: 0 })
const kpiDelta  = ref({ products: 0, customers: 0, orders: 0, sales: 0 })

async function loadKpis() {
  const { data } = await $axios.get('/api/dashboard/kpis')
  kpiTotals.value = data.totals
  kpiDelta.value  = data.delta
}

function deltaClass(n: number) {
  return n >= 0
    ? 'bg-success-focus fw-medium text-success-main'
    : 'bg-danger-focus fw-medium text-danger-main'
}

function deltaText(n: number) {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n}`
}

function money(v: any) {
  const n = Number(v || 0)
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}


watch(txPeriod, loadTransactions)


const ordersTrend = ref({
  categories: [] as string[],
  amount: [] as number[],
  count: [] as number[],
})

const ordersSummary = ref({
  current_total: 0,
  prev_total: 0,
  pct_change: null as number | null,
})

const recentOrdersLineOptions = computed(() => ({
  chart: { type: 'line', height: 260, toolbar: { show: false } },
  stroke: { curve: 'smooth', width: 3 },
  dataLabels: { enabled: false },
  xaxis: { categories: ordersTrend.value.categories },
  legend: { show: true },
}))

const recentOrdersLineSeries = computed(() => ([
  { name: 'Amount', data: ordersTrend.value.amount },
  { name: 'Orders', data: ordersTrend.value.count },
]))

function pctClass(p: number | null) {
  if (p === null) return 'bg-success-focus border border-success text-success-main'
  return p >= 0
    ? 'bg-success-focus border border-success text-success-main'
    : 'bg-danger-focus border border-danger text-danger-main'
}

function pctText(p: number | null) {
  if (p === null) return '—'
  return `${Math.abs(p).toFixed(0)}%`
}

function pctIcon(p: number | null) {
  return (p !== null && p < 0) ? 'iconamoon:arrow-down-2-fill' : 'iconamoon:arrow-up-2-fill'
}

async function loadOrdersTrend() {
  const { data } = await $axios.get('/api/dashboard/orders-trend', { params: { days: 14 } })
  ordersSummary.value = data.summary
  ordersTrend.value = data.chart
}


function stockLabel(stock: any) {
  const s = Number(stock || 0)
  if (s <= 0) return 'Out of Stock'
  if (s <= 10) return `${s} Low Stock`
  return `${s} High Stock`
}

function stockBarClass(stock: any) {
  const s = Number(stock || 0)
  if (s <= 0) return 'bg-primary-600'
  if (s <= 10) return 'bg-danger-main'
  return 'bg-success-main'
}

// Normalize % based on the max stock of the returned list (looks good in UI)
const stockMax = computed(() => {
  const max = Math.max(...stockReport.value.map(x => Number(x.Product_Stock || 0)), 0)
  return max <= 0 ? 1 : max
})

function stockPercent(stock: any) {
  const s = Math.max(0, Number(stock || 0))
  return Math.min(100, Math.round((s / stockMax.value) * 100))
}


onMounted(async () => {

    await loadCustomersDonut()
    await      loadRevenueChart()
    await      loadKpis()
       
  await loadRecentOrders()
   loadTransactions()
    loadOrdersTrend()
    loadTopProducts()
      loadStockReport()
    })
watch(range, loadRevenueChart)
</script>

<template>
    <div class="dashboard-main-body">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
            <h6 class="fw-semibold mb-0">Dashboard</h6>
            <ul class="d-flex align-items-center gap-2">

                <li class="fw-medium">
                    <a class="d-flex align-items-center gap-1 hover-text-primary">
                        <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
                        Dashboard


                    </a>
                </li>


                <li>-</li>
                <li class="fw-medium">eCommerce</li>
            </ul>
        </div>
        <div class="row gy-4" v-if="hasPermission('dashboard')">
            <div class="col-xxl-12">
                <div class="card radius-8 border-0">
                    <div class="row">
                        <div class="col-xxl-6 pe-xxl-0">
                            <div class="card-body p-24">
                                <div class="d-flex align-items-center flex-wrap gap-2 justify-content-between">
                                    <h6 class="mb-2 fw-bold text-lg">Revenue Report</h6>
                                    <div class="">
                                        <select
                                            class="form-select form-select-sm w-auto bg-base border text-secondary-light">
                                            <option>Yearly</option>
                                            <option>Monthly</option>
                                            <option>Weekly</option>
                                            <option>Today</option>
                                        </select>
                                    </div>
                                </div>
                                 
                                <div class="mt-40">
                                    <ClientOnly>
                                        <apexchart type="area" height="280" :options="paymentOptions"
                                            :series="paymentSeries" class="margin-16-minus" />
                                    </ClientOnly>
                                </div>
                            </div>
                        </div>
                        <div class="col-xxl-6">
                            <div class="row h-100 g-0">
                                <div class="col-6 p-0 m-0">
                                    <div
                                        class="card-body p-24 h-100 d-flex flex-column justify-content-center border border-top-0">
                                        <div
                                            class="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                            <div>
                                                <span
                                                    class="mb-12 w-44-px h-44-px text-primary-600 bg-primary-light border border-primary-light-white flex-shrink-0 d-flex justify-content-center align-items-center radius-8 h6 mb-12">
                                                    <iconify-icon icon="fa-solid:box-open" class="icon"></iconify-icon>
                                                </span>
                                                <span class="mb-1 fw-medium text-secondary-light text-md">Total
                                                    Products</span>
                                                <h6 class="fw-semibold text-primary-light mb-1">{{ kpiTotals.products }}</h6>
                                            </div>
                                        </div>
                                            <p class="text-sm mb-0">Increase by<span :class="deltaClass(kpiDelta.products)" class="px-1 rounded-2 text-sm">
  {{ deltaText(kpiDelta.products) }}
</span>
                                            this week</p>
                                    </div>
                                </div>
                                <div class="col-6 p-0 m-0">
                                    <div
                                        class="card-body p-24 h-100 d-flex flex-column justify-content-center border border-top-0 border-start-0 border-end-0">
                                        <div
                                            class="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                            <div>
                                                <span
                                                    class="mb-12 w-44-px h-44-px text-yellow bg-yellow-light border border-yellow-light-white flex-shrink-0 d-flex justify-content-center align-items-center radius-8 h6 mb-12">
                                                    <iconify-icon icon="flowbite:users-group-solid"
                                                        class="icon"></iconify-icon>
                                                </span>
                                                <span class="mb-1 fw-medium text-secondary-light text-md">Total
                                                    Customer</span>
                                                <h6 class="fw-semibold text-primary-light mb-1">{{ kpiTotals.customers }}</h6>
                                            </div>
                                        </div>
                                        <p class="text-sm mb-0">Increase by <span
                                                :class="deltaClass(kpiDelta.customers)" class="px-1 rounded-2 text-sm">
  {{ deltaText(kpiDelta.customers) }}
</span>
                                            this week</p>
                                    </div>
                                </div>
                                <div class="col-6 p-0 m-0">
                                    <div
                                        class="card-body p-24 h-100 d-flex flex-column justify-content-center border border-top-0 border-bottom-0">
                                        <div
                                            class="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                            <div>
                                                <span
                                                    class="mb-12 w-44-px h-44-px text-lilac bg-lilac-light border border-lilac-light-white flex-shrink-0 d-flex justify-content-center align-items-center radius-8 h6 mb-12">
                                                    <iconify-icon icon="majesticons:shopping-cart"
                                                        class="icon"></iconify-icon>
                                                </span>
                                                <span class="mb-1 fw-medium text-secondary-light text-md">Total
                                                    Orders</span>
                                                <h6 class="fw-semibold text-primary-light mb-1">{{ kpiTotals.orders }}</h6>
                                            </div>
                                        </div>
                                        <p class="text-sm mb-0">Increase by <span
                                                :class="deltaClass(kpiDelta.orders)" class="px-1 rounded-2 text-sm">
  {{ deltaText(kpiDelta.orders) }}
</span>
                                            this week</p>
                                    </div>
                                </div>
                                <div class="col-6 p-0 m-0">
                                    <div
                                        class="card-body p-24 h-100 d-flex flex-column justify-content-center border border-top-0 border-start-0 border-end-0 border-bottom-0">
                                        <div
                                            class="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8">
                                            <div>
                                                <span
                                                    class="mb-12 w-44-px h-44-px text-pink bg-pink-light border border-pink-light-white flex-shrink-0 d-flex justify-content-center align-items-center radius-8 h6 mb-12">
                                                    <iconify-icon icon="ri:discount-percent-fill"
                                                        class="icon"></iconify-icon>
                                                </span>
                                                <span class="mb-1 fw-medium text-secondary-light text-md">Total
                                                    Sales</span>
                                                <h6 class="fw-semibold text-primary-light mb-1">{{ money(kpiTotals.sales) }} OMR</h6>
                                            </div>
                                        </div>
                                                <p class="text-sm mb-0">Increase by <span
                                                        class="bg-success-focus px-1 rounded-2 fw-medium text-success-main text-sm">{{ deltaText(kpiDelta.sales) }}</span>
                                            this week</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-xxl-9 col-lg-6">
                <div class="card h-100">
                    <div class="card-body p-24">
                        <div class="d-flex align-items-center flex-wrap gap-2 justify-content-between mb-20">
                            <h6 class="mb-2 fw-bold text-lg mb-0">Recent Orders</h6>
                            <a href="javascript:void(0)"
                                class="text-primary-600 hover-text-primary d-flex align-items-center gap-1">
                                View All
                                <iconify-icon icon="solar:alt-arrow-right-linear" class="icon"></iconify-icon>
                            </a>
                        </div>
                        <div class="table-responsive scroll-sm">
                            <table class="table bordered-table mb-0">
                                <thead>
                                    <tr>
                                        <th scope="col">Users</th>
                                        <th scope="col">Invoice</th>
                                        <th scope="col">Items</th>
                                        <th scope="col">Qty</th>
                                        <th scope="col">Amount</th>
                                        <th scope="col" class="text-center">Status</th>
                                    </tr>
                                </thead>
                                 <tbody>
  <tr v-if="recentOrders.length === 0">
    <td colspan="6" class="text-center text-secondary-light py-4">No orders</td>
  </tr>

  <tr v-for="o in recentOrders" :key="o.id">
    <td>
      <div class="d-flex align-items-center">
        
        <span class="text-lg text-secondary-light fw-semibold flex-grow-1">
          {{ o.customer_name }}
        </span>
      </div>
    </td>

    <td>#{{ o.Order_Code }}</td>

    <td>
      {{ o.first_product_name || '—' }}
      <span v-if="Number(o.items_count) > 1" class="text-secondary-light">
        (+{{ Number(o.items_count) - 1 }} more)
      </span>
    </td>

    <td>{{ o.total_qty }}</td>

    <td>{{ money(o.Total_Price) }}</td>

    <td class="text-center">
      <span
        class="px-24 py-4 rounded-pill fw-medium text-sm"
        :class="statusPillClass(o.Status)"
      >
        {{ o.Status }}
      </span>
    </td>
  </tr>
</tbody>

                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-xxl-3">
                <div class="card h-100">

                    <div class="card-body">
                        <div class="d-flex align-items-center flex-wrap gap-2 justify-content-between">
                            <h6 class="mb-2 fw-bold text-lg">Transactions</h6>
                            <div class="">
                                <select v-model="txPeriod" class="form-select form-select-sm w-auto bg-base border text-secondary-light">
  <option value="this_month">This Month</option>
  <option value="last_month">Last Month</option>
</select>
                            </div>
                        </div>

                        <div class="mt-32">
  <div v-if="transactions.length === 0" class="text-secondary-light">
    No transactions
  </div>

  <div
    v-for="t in transactions"
    :key="t.id"
    class="d-flex align-items-center justify-content-between gap-3 mb-32"
  >
    <div class="d-flex align-items-center gap-2">
      <img
        src="/public/isc-assets/images/payment/payment3.png"
        alt=""
        class="w-40-px h-40-px radius-8 flex-shrink-0"
      >
      <div class="flex-grow-1">
        <h6 class="text-md mb-0 fw-normal">{{ paymentTitle(t) }}</h6>
        <span class="text-sm text-secondary-light fw-normal">{{ paymentSubtitle(t) }}</span>
      </div>
    </div>

    <span class="text-md fw-medium" :class="amountClass(t)">
      {{ money(t.Payment_Amount) }}
    </span>
  </div>
</div>

                        
                    </div>
                </div>
            </div>
            <div class="col-xxl-9 col-lg-6">
                <div class="card h-100 radius-8 border">
                    <div class="card-body p-24">
                        <h6 class="mb-12 fw-bold text-lg mb-0">Recent Orders</h6>
                        <div class="d-flex align-items-center gap-2">
                             <h6 class="fw-semibold mb-0">{{ money(ordersSummary.current_total) }}</h6>

<p class="text-sm mb-0">
  <span
    class="px-8 py-2 rounded-pill fw-semibold text-sm d-inline-flex align-items-center gap-1"
    :class="pctClass(ordersSummary.pct_change)"
  >
    {{ pctText(ordersSummary.pct_change) }}
    <iconify-icon :icon="pctIcon(ordersSummary.pct_change)" class="icon"></iconify-icon>
  </span>
  Increases
</p>
                        </div>
                        <ClientOnly>
  <apexchart
    type="line"
    height="260"
    :options="recentOrdersLineOptions"
    :series="recentOrdersLineSeries"
    class="mt-28"
  />
</ClientOnly>

                    </div>
                </div>
            </div>
            
            <div class="col-xxl-3">
                <div class="card h-100">

                    <div class="card-body">
                        <div class="d-flex align-items-center flex-wrap gap-2 justify-content-between mb-20">
                            <h6 class="mb-2 fw-bold text-lg mb-0">Top Customers</h6>
                            <a href="javascript:void(0)"
                                class="text-primary-600 hover-text-primary d-flex align-items-center gap-1">
                                View All
                                <iconify-icon icon="solar:alt-arrow-right-linear" class="icon"></iconify-icon>
                            </a>
                        </div>

                        <div class="mt-32">

                            <div class="d-flex align-items-center justify-content-between gap-3 mb-32">
                                <div class="d-flex align-items-center gap-2">
                                    <img src="/public/isc-assets/images/users/user6.png" alt=""
                                        class="w-40-px h-40-px radius-8 flex-shrink-0">
                                    <div class="flex-grow-1">
                                        <h6 class="text-md mb-0 fw-normal">Dianne Russell</h6>
                                        <span class="text-sm text-secondary-light fw-normal">017******58</span>
                                    </div>
                                </div>
                                <span class="text-primary-light text-md fw-medium">Orders: 30</span>
                            </div>

                            <div class="d-flex align-items-center justify-content-between gap-3 mb-32">
                                <div class="d-flex align-items-center gap-2">
                                    <img src="/public/isc-assets/images/users/user1.png" alt=""
                                        class="w-40-px h-40-px radius-8 flex-shrink-0">
                                    <div class="flex-grow-1">
                                        <h6 class="text-md mb-0 fw-normal">Wade Warren</h6>
                                        <span class="text-sm text-secondary-light fw-normal">017******58</span>
                                    </div>
                                </div>
                                <span class="text-primary-light text-md fw-medium">Orders: 30</span>
                            </div>

                            <div class="d-flex align-items-center justify-content-between gap-3 mb-32">
                                <div class="d-flex align-items-center gap-2">
                                    <img src="/public/isc-assets/images/users/user2.png" alt=""
                                        class="w-40-px h-40-px radius-8 flex-shrink-0">
                                    <div class="flex-grow-1">
                                        <h6 class="text-md mb-0 fw-normal">Albert Flores</h6>
                                        <span class="text-sm text-secondary-light fw-normal">017******58</span>
                                    </div>
                                </div>
                                <span class="text-primary-light text-md fw-medium">Orders: 35</span>
                            </div>

                            <div class="d-flex align-items-center justify-content-between gap-3 mb-32">
                                <div class="d-flex align-items-center gap-2">
                                    <img src="/public/isc-assets/images/users/user3.png" alt=""
                                        class="w-40-px h-40-px radius-8 flex-shrink-0">
                                    <div class="flex-grow-1">
                                        <h6 class="text-md mb-0 fw-normal">Bessie Cooper</h6>
                                        <span class="text-sm text-secondary-light fw-normal">017******58</span>
                                    </div>
                                </div>
                                <span class="text-primary-light text-md fw-medium">Orders: 20</span>
                            </div>

                            <div class="d-flex align-items-center justify-content-between gap-3 mb-32">
                                <div class="d-flex align-items-center gap-2">
                                    <img src="/public/isc-assets/images/users/user4.png" alt=""
                                        class="w-40-px h-40-px radius-8 flex-shrink-0">
                                    <div class="flex-grow-1">
                                        <h6 class="text-md mb-0 fw-normal">Arlene McCoy</h6>
                                        <span class="text-sm text-secondary-light fw-normal">017******58</span>
                                    </div>
                                </div>
                                <span class="text-primary-light text-md fw-medium">Orders: 25</span>
                            </div>

                            <div class="d-flex align-items-center justify-content-between gap-3">
                                <div class="d-flex align-items-center gap-2">
                                    <img src="/public/isc-assets/images/users/user6.png" alt=""
                                        class="w-40-px h-40-px radius-8 flex-shrink-0">
                                    <div class="flex-grow-1">
                                        <h6 class="text-md mb-0 fw-normal">John Doe</h6>
                                        <span class="text-sm text-secondary-light fw-normal">017******58</span>
                                    </div>
                                </div>
                                <span class="text-primary-light text-md fw-medium">Orders: 32</span>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
            <div class="col-xxl-6">
                <div class="card h-100">
                    <div class="card-body p-24">
                        <div class="d-flex align-items-center flex-wrap gap-2 justify-content-between mb-20">
                            <h6 class="mb-2 fw-bold text-lg mb-0">Top Selling Product</h6>
                            <a href="javascript:void(0)"
                                class="text-primary-600 hover-text-primary d-flex align-items-center gap-1">
                                View All
                                <iconify-icon icon="solar:alt-arrow-right-linear" class="icon"></iconify-icon>
                            </a>
                        </div>
                        <div class="table-responsive scroll-sm">
                            <table class="table bordered-table mb-0">
                                <thead>
                                    <tr>
                                        <th scope="col">Items</th>
                                        <th scope="col">Price</th>
                                      
                                        <th scope="col">Sold</th>
                                        <th scope="col" class="text-center">Total Orders</th>
                                    </tr>
                                </thead>
                                <tbody>
  <tr v-if="topProducts.length === 0">
    <td colspan="5" class="text-center text-secondary-light py-4">No data</td>
  </tr>

  <tr v-for="p in topProducts" :key="p.id">
    <td>
      <div class="d-flex align-items-center">
        
        <div class="flex-grow-1">
          <h6 class="text-md mb-0 fw-normal">{{ p.Product_Name }}</h6>
           
        </div>
      </div>
    </td>

    <td>{{ money(p.Product_Price) }}</td>
  
    <td>{{ p.sold_qty }}</td>

    <td class="text-center">
      <span class="bg-success-focus text-success-main px-32 py-4 rounded-pill fw-medium text-sm">
        {{ p.total_orders }}
      </span>
    </td>
  </tr>
</tbody>

                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-xxl-6">
                <div class="card h-100">
                    <div class="card-body p-24">
                        <div class="d-flex align-items-center flex-wrap gap-2 justify-content-between mb-20">
                            <h6 class="mb-2 fw-bold text-lg mb-0">Stock Report</h6>
                            <a href="javascript:void(0)"
                                class="text-primary-600 hover-text-primary d-flex align-items-center gap-1">
                                View All
                                <iconify-icon icon="solar:alt-arrow-right-linear" class="icon"></iconify-icon>
                            </a>
                        </div>
                        <div class="table-responsive scroll-sm">
                            <table class="table bordered-table mb-0">
                                <thead>
                                    <tr>
                                        <th scope="col">Items</th>
                                        <th scope="col">Price</th>
                                        <th scope="col">
                                            <div class="max-w-112 mx-auto">
                                                <span>Stock</span>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                 <tbody>
  <tr v-if="stockReport.length === 0">
    <td colspan="3" class="text-center text-secondary-light py-4">No data</td>
  </tr>

  <tr v-for="p in stockReport" :key="p.id">
    <td>{{ p.Product_Name }}</td>
    <td>{{ money(p.Product_Price) }}</td>
    <td>
      <div class="max-w-112 mx-auto">
        <div class="w-100">
          <div class="progress progress-sm rounded-pill" role="progressbar">
            <div
              class="progress-bar rounded-pill"
              :class="stockBarClass(p.Product_Stock)"
              :style="{ width: stockPercent(p.Product_Stock) + '%' }"
            ></div>
          </div>
        </div>

        <span class="mt-12 text-secondary-light text-sm fw-medium">
          {{ stockLabel(p.Product_Stock) }}
        </span>
      </div>
    </td>
  </tr>
</tbody>

                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

</template>