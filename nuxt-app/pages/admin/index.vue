<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { definePageMeta, useNuxtApp } from '#imports'
import { useAuth } from '~/stores/auth'

definePageMeta({
  layout: 'admin',
  ssr: false,
  middleware: ['permission'],
  permission: 'dashboard',
})

type RangeKey = 'today' | '7d' | '30d' | '90d' | 'year'

const { $axios } = useNuxtApp() as any
const auth = useAuth()

const hasPermission = (perm: string) => auth.permissions.includes(perm)

const range = ref<RangeKey>('30d')
const loading = ref(false)
const error = ref('')

const summary = ref<any>({
  cards: {},
  financials: {},
  status_breakdown: [],
  fulfillment_breakdown: [],
  payment_methods: [],
  payment_statuses: [],
  top_customers: [],
  vendor_summary: { top_vendors: [] },
})

const intent = ref<any>({
  cart_products: [],
  favorite_products: [],
  totals: {},
})

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

const recentOrders = ref<any[]>([])
const topProducts = ref<any[]>([])
const stockReport = ref<any[]>([])

const rangeOptions = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'year', label: 'This year' },
] as const

const chartDays = computed(() => {
  if (range.value === 'today' || range.value === '7d') return 7
  if (range.value === '90d') return 60
  return 30
})

async function loadDashboard() {
  if (!hasPermission('dashboard')) return

  loading.value = true
  error.value = ''

  try {
    const [summaryRes, intentRes, trendRes, recentRes, topRes, stockRes] = await Promise.all([
      $axios.get('/api/dashboard/operations-summary', { params: { range: range.value } }),
      $axios.get('/api/dashboard/intent-insights', { params: { range: range.value } }),
      $axios.get('/api/dashboard/orders-trend', { params: { days: chartDays.value } }),
      $axios.get('/api/dashboard/recent-orders', { params: { limit: 8 } }),
      $axios.get('/api/dashboard/top-products', { params: { limit: 8 } }),
      $axios.get('/api/dashboard/stock-report', { params: { limit: 8 } }),
    ])

    summary.value = summaryRes.data || summary.value
    intent.value = intentRes.data || intent.value
    ordersSummary.value = trendRes.data?.summary || ordersSummary.value
    ordersTrend.value = trendRes.data?.chart || ordersTrend.value
    recentOrders.value = recentRes.data?.data || []
    topProducts.value = topRes.data?.data || []
    stockReport.value = stockRes.data?.data || []
  } catch (e) {
    console.error(e)
    error.value = 'Dashboard data could not be loaded. Please refresh after confirming the API is running.'
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)
watch(range, loadDashboard)

const cards = computed(() => summary.value?.cards || {})
const financials = computed(() => summary.value?.financials || {})
const vendorSummary = computed(() => summary.value?.vendor_summary || { top_vendors: [] })

function money(value: any, digits = 3) {
  const n = Number(value || 0)
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

function compact(value: any) {
  const n = Number(value || 0)
  return n.toLocaleString()
}

function percent(value: any) {
  if (value === null || value === undefined) return 'New'
  const n = Number(value || 0)
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

function deltaClass(value: any) {
  if (value === null || value === undefined) return 'neutral'
  return Number(value) >= 0 ? 'positive' : 'negative'
}

function labelize(value: any) {
  return String(value || 'Unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function statusPillClass(status: string) {
  const s = String(status || '').toLowerCase()
  if (['delivered', 'completed'].includes(s)) return 'pill success'
  if (['shipped', 'dispatched', 'ready_for_collection'].includes(s)) return 'pill info'
  if (['pending', 'on-hold', 'returned'].includes(s)) return 'pill warning'
  if (['cancelled', 'failed'].includes(s)) return 'pill danger'
  return 'pill neutral'
}

function stockLabel(stock: any) {
  const s = Number(stock || 0)
  if (s <= 0) return 'Out'
  if (s <= 10) return 'Low'
  return 'Healthy'
}

function stockClass(stock: any) {
  const s = Number(stock || 0)
  if (s <= 0) return 'danger'
  if (s <= 10) return 'warning'
  return 'success'
}

const stockMax = computed(() => {
  const max = Math.max(...stockReport.value.map((item) => Number(item.Product_Stock || 0)), 0)
  return max <= 0 ? 1 : max
})

function stockPercent(stock: any) {
  return Math.min(100, Math.round((Math.max(0, Number(stock || 0)) / stockMax.value) * 100))
}

const trendChartOptions = computed<any>(() => ({
  chart: {
    type: 'area',
    height: 330,
    toolbar: { show: false },
    zoom: { enabled: false },
    fontFamily: 'inherit',
  },
  colors: ['#2563eb', '#10b981'],
  dataLabels: { enabled: false },
  stroke: { width: [3, 2], curve: 'smooth' },
  fill: {
    type: 'gradient',
    gradient: { shadeIntensity: 0.15, opacityFrom: 0.32, opacityTo: 0.04, stops: [0, 90, 100] },
  },
  grid: { borderColor: '#e5e7eb', strokeDashArray: 4 },
  xaxis: {
    categories: ordersTrend.value.categories,
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: '#64748b', fontSize: '12px' } },
  },
  yaxis: [
    {
      labels: {
        formatter: (value: number) => `${Number(value || 0).toFixed(0)}`,
        style: { colors: '#64748b' },
      },
    },
  ],
  tooltip: {
    shared: true,
    y: {
      formatter: (value: number, opts: any) => opts.seriesIndex === 0 ? `${money(value)} OMR` : `${compact(value)} orders`,
    },
  },
  legend: { position: 'top', horizontalAlign: 'right', markers: { radius: 4 } },
}))

const trendChartSeries = computed<any[]>(() => [
  { name: 'Revenue', data: ordersTrend.value.amount || [] },
  { name: 'Orders', data: ordersTrend.value.count || [] },
])

function donutOptions(items: any[], colors: string[]) {
  return {
    chart: { type: 'donut', height: 270, fontFamily: 'inherit' },
    labels: items.map((item) => labelize(item.label)),
    colors,
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    legend: { position: 'bottom', fontSize: '12px', markers: { radius: 4 } },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            total: { show: true, label: 'Total', formatter: () => compact(items.reduce((sum, item) => sum + Number(item.total || 0), 0)) },
          },
        },
      },
    },
  }
}

const statusSeries = computed(() => (summary.value?.status_breakdown || []).map((item: any) => Number(item.total || 0)))
const statusOptions = computed(() => donutOptions(summary.value?.status_breakdown || [], ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#64748b', '#8b5cf6']))

const fulfillmentSeries = computed(() => (summary.value?.fulfillment_breakdown || []).map((item: any) => Number(item.total || 0)))
const fulfillmentOptions = computed(() => donutOptions(summary.value?.fulfillment_breakdown || [], ['#0ea5e9', '#f97316', '#64748b']))

const paymentOptions = computed<any>(() => {
  const rows = summary.value?.payment_methods || []

  return {
    chart: { type: 'bar', height: 290, toolbar: { show: false }, fontFamily: 'inherit' },
    plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: '58%' } },
    colors: ['#334155'],
    dataLabels: { enabled: false },
    grid: { borderColor: '#e5e7eb', strokeDashArray: 4 },
    xaxis: {
      categories: rows.map((row: any) => labelize(row.label)),
      labels: { formatter: (value: number) => `${money(value, 2)}` },
    },
    tooltip: { y: { formatter: (value: number) => `${money(value)} OMR` } },
  }
})

const paymentSeries = computed<any[]>(() => [
  { name: 'Amount', data: (summary.value?.payment_methods || []).map((row: any) => Number(row.amount || 0)) },
])

const financialOptions = computed<any>(() => ({
  chart: { type: 'bar', height: 300, toolbar: { show: false }, fontFamily: 'inherit' },
  plotOptions: { bar: { columnWidth: '44%', borderRadius: 6 } },
  colors: ['#2563eb', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'],
  dataLabels: { enabled: false },
  grid: { borderColor: '#e5e7eb', strokeDashArray: 4 },
  xaxis: {
    categories: ['Subtotal', 'Shipping', 'VAT', 'Discounts', 'Loyalty'],
    labels: { style: { colors: '#64748b', fontSize: '12px' } },
  },
  yaxis: { labels: { formatter: (value: number) => `${money(value, 2)}` } },
  tooltip: { y: { formatter: (value: number) => `${money(value)} OMR` } },
}))

const financialSeries = computed<any[]>(() => [
  {
    name: 'Amount',
    data: [
      Number(financials.value.subtotal || 0),
      Number(financials.value.shipping || 0),
      Number(financials.value.vat || 0),
      Number(financials.value.product_discounts || 0),
      Number(financials.value.loyalty_discounts || 0),
    ],
  },
])

const intentRows = computed(() => [
  { title: 'Cart additions', rows: intent.value?.cart_products || [], empty: 'No cart activity in this range.' },
  { title: 'Favorites', rows: intent.value?.favorite_products || [], empty: 'No favorite activity in this range.' },
])
</script>

<template>
  <div class="dashboard-main-body operations-dashboard">
    <div class="dashboard-shell" v-if="hasPermission('dashboard')">
      <div class="dashboard-heading">
        <div>
          <span class="eyebrow">ISC commerce operations</span>
          <h4>Dashboard</h4>
          <p>Revenue, order movement, payments, vendors, stock, and product intent in one view.</p>
        </div>

        <div class="dashboard-actions">
          <select v-model="range" class="form-select form-select-sm">
            <option v-for="option in rangeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>

          <button class="btn btn-primary-600 btn-sm d-inline-flex align-items-center gap-2" :disabled="loading" @click="loadDashboard">
            <iconify-icon :icon="loading ? 'eos-icons:loading' : 'solar:refresh-outline'" class="icon" />
            Refresh
          </button>
        </div>
      </div>

      <div v-if="error" class="dashboard-alert">
        {{ error }}
      </div>

      <div class="metric-grid">
        <article class="metric-card revenue">
          <div class="metric-icon">
            <iconify-icon icon="solar:wallet-money-bold" />
          </div>
          <span>Revenue</span>
          <strong>{{ money(cards.revenue?.value) }} OMR</strong>
          <em :class="deltaClass(cards.revenue?.delta)">{{ percent(cards.revenue?.delta) }} vs previous</em>
        </article>

        <article class="metric-card orders">
          <div class="metric-icon">
            <iconify-icon icon="solar:cart-large-2-bold" />
          </div>
          <span>Orders</span>
          <strong>{{ compact(cards.orders?.value) }}</strong>
          <em :class="deltaClass(cards.orders?.delta)">{{ percent(cards.orders?.delta) }} vs previous</em>
        </article>

        <article class="metric-card customers">
          <div class="metric-icon">
            <iconify-icon icon="solar:users-group-rounded-bold" />
          </div>
          <span>New Customers</span>
          <strong>{{ compact(cards.customers?.value) }}</strong>
          <em :class="deltaClass(cards.customers?.delta)">{{ percent(cards.customers?.delta) }} vs previous</em>
        </article>

        <article class="metric-card average">
          <div class="metric-icon">
            <iconify-icon icon="solar:chart-square-bold" />
          </div>
          <span>Average Order</span>
          <strong>{{ money(cards.average_order?.value) }} OMR</strong>
          <em :class="deltaClass(cards.average_order?.delta)">{{ percent(cards.average_order?.delta) }} vs previous</em>
        </article>
      </div>

      <div class="dashboard-grid primary-grid">
        <section class="panel span-8">
          <div class="panel-header">
            <div>
              <h6>Sales Trend</h6>
              <p>{{ money(ordersSummary.current_total) }} OMR across the selected trend window</p>
            </div>
            <span class="trend-badge" :class="deltaClass(ordersSummary.pct_change)">
              {{ percent(ordersSummary.pct_change) }}
            </span>
          </div>
          <ClientOnly>
            <apexchart type="area" height="330" :options="trendChartOptions" :series="trendChartSeries" />
          </ClientOnly>
        </section>

        <section class="panel span-4">
          <div class="panel-header compact">
            <div>
              <h6>Order Status</h6>
              <p>Lifecycle distribution</p>
            </div>
          </div>
          <ClientOnly>
            <apexchart type="donut" height="270" :options="statusOptions" :series="statusSeries" />
          </ClientOnly>
        </section>
      </div>

      <div class="dashboard-grid secondary-grid">
        <section class="panel span-4">
          <div class="panel-header compact">
            <div>
              <h6>Fulfillment</h6>
              <p>Ship to address vs pickup</p>
            </div>
          </div>
          <ClientOnly>
            <apexchart type="donut" height="270" :options="fulfillmentOptions" :series="fulfillmentSeries" />
          </ClientOnly>
        </section>

        <section class="panel span-4">
          <div class="panel-header compact">
            <div>
              <h6>Payment Methods</h6>
              <p>Collected by method</p>
            </div>
          </div>
          <ClientOnly>
            <apexchart type="bar" height="290" :options="paymentOptions" :series="paymentSeries" />
          </ClientOnly>
        </section>

        <section class="panel span-4">
          <div class="panel-header compact">
            <div>
              <h6>Financial Breakdown</h6>
              <p>Subtotal, VAT, shipping, discounts</p>
            </div>
          </div>
          <ClientOnly>
            <apexchart type="bar" height="300" :options="financialOptions" :series="financialSeries" />
          </ClientOnly>
        </section>
      </div>

      <div class="dashboard-grid detail-grid">
        <section class="panel span-7">
          <div class="panel-header">
            <div>
              <h6>Recent Orders</h6>
              <p>Latest customer transactions</p>
            </div>
            <NuxtLink to="/admin/orders/ordersplaced" class="text-primary-600 text-sm fw-semibold">View all</NuxtLink>
          </div>

          <div class="table-responsive dashboard-table">
            <table class="table mb-0">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="recentOrders.length === 0">
                  <td colspan="5" class="empty-cell">No orders in this view.</td>
                </tr>
                <tr v-for="order in recentOrders" :key="order.id">
                  <td>
                    <strong>#{{ order.Order_Code }}</strong>
                    <small>{{ new Date(order.created_at).toLocaleString() }}</small>
                  </td>
                  <td>{{ order.customer_name }}</td>
                  <td>
                    {{ order.first_product_name || 'Product' }}
                    <small v-if="Number(order.items_count || 0) > 1">+{{ Number(order.items_count) - 1 }} more</small>
                  </td>
                  <td>{{ money(order.Total_Price) }}</td>
                  <td><span :class="statusPillClass(order.Status)">{{ labelize(order.Status) }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel span-5">
          <div class="panel-header">
            <div>
              <h6>Top Customers</h6>
              <p>Highest spend in selected range</p>
            </div>
          </div>

          <div class="rank-list">
            <div v-if="(summary.top_customers || []).length === 0" class="empty-state">No customer orders in this range.</div>
            <div v-for="(customer, index) in summary.top_customers || []" :key="customer.customer_id || index" class="rank-row">
              <span class="rank">{{ index + 1 }}</span>
              <div>
                <strong>{{ customer.customer_name }}</strong>
                <small>{{ customer.customer_code }} · {{ compact(customer.total_orders) }} orders</small>
              </div>
              <em>{{ money(customer.total_spent) }} OMR</em>
            </div>
          </div>
        </section>

        <section class="panel span-6">
          <div class="panel-header">
            <div>
              <h6>Top Selling Products</h6>
              <p>Products moving through confirmed order states</p>
            </div>
            <NuxtLink to="/admin/product/viewproducts" class="text-primary-600 text-sm fw-semibold">Products</NuxtLink>
          </div>

          <div class="rank-list product-list">
            <div v-if="topProducts.length === 0" class="empty-state">No product sales yet.</div>
            <div v-for="product in topProducts" :key="product.id" class="rank-row">
              <span class="product-marker"></span>
              <div>
                <strong>{{ product.Product_Name }}</strong>
                <small>{{ compact(product.total_orders) }} orders · {{ compact(product.sold_qty) }} sold</small>
              </div>
              <em>{{ money(product.Product_Price) }} OMR</em>
            </div>
          </div>
        </section>

        <section class="panel span-6">
          <div class="panel-header">
            <div>
              <h6>Vendor Performance</h6>
              <p>Vendor orders, sales, and commission exposure</p>
            </div>
            <NuxtLink to="/admin/vendor-orders" class="text-primary-600 text-sm fw-semibold">Vendor orders</NuxtLink>
          </div>

          <div class="vendor-strip">
            <div>
              <span>Vendor Orders</span>
              <strong>{{ compact(vendorSummary.orders) }}</strong>
            </div>
            <div>
              <span>Vendor Sales</span>
              <strong>{{ money(vendorSummary.sales) }}</strong>
            </div>
            <div>
              <span>Commission</span>
              <strong>{{ money(vendorSummary.commission) }}</strong>
            </div>
          </div>

          <div class="rank-list vendor-list">
            <div v-if="(vendorSummary.top_vendors || []).length === 0" class="empty-state">No vendor activity in this range.</div>
            <div v-for="vendor in vendorSummary.top_vendors || []" :key="vendor.vendor_id || vendor.vendor_code" class="rank-row">
              <span class="vendor-avatar">{{ String(vendor.vendor_name || 'V').slice(0, 1) }}</span>
              <div>
                <strong>{{ vendor.vendor_name }}</strong>
                <small>{{ vendor.vendor_code }} · {{ compact(vendor.vendor_orders) }} orders</small>
              </div>
              <em>{{ money(vendor.total_sales) }} OMR</em>
            </div>
          </div>
        </section>

        <section v-for="block in intentRows" :key="block.title" class="panel span-6">
          <div class="panel-header">
            <div>
              <h6>{{ block.title }}</h6>
              <p>Includes removed records after soft delete migration</p>
            </div>
          </div>

          <div class="intent-list">
            <div v-if="block.rows.length === 0" class="empty-state">{{ block.empty }}</div>
            <div v-for="row in block.rows" :key="`${block.title}-${row.product_id}`" class="intent-row">
              <div>
                <strong>{{ row.product_name }}</strong>
                <small>{{ row.product_code }}</small>
              </div>
              <div class="intent-metrics">
                <span>{{ compact(row.total_events) }} events</span>
                <span>{{ compact(row.active_count) }} active</span>
                <span>{{ compact(row.removed_count) }} removed</span>
              </div>
            </div>
          </div>
        </section>

        <section class="panel span-12">
          <div class="panel-header">
            <div>
              <h6>Stock Watch</h6>
              <p>Products that need attention first</p>
            </div>
          </div>

          <div class="stock-grid">
            <div v-if="stockReport.length === 0" class="empty-state">No stock data available.</div>
            <div v-for="stock in stockReport" :key="stock.id" class="stock-card">
              <div>
                <strong>{{ stock.Product_Name }}</strong>
                <small>{{ money(stock.Product_Price) }} OMR</small>
              </div>
              <span :class="['stock-badge', stockClass(stock.Product_Stock)]">{{ stockLabel(stock.Product_Stock) }}</span>
              <div class="stock-bar">
                <span :style="{ width: `${stockPercent(stock.Product_Stock)}%` }"></span>
              </div>
              <em>{{ compact(stock.Product_Stock) }} in stock</em>
            </div>
          </div>
        </section>
      </div>
    </div>

    <div v-else class="permission-empty">
      <iconify-icon icon="solar:shield-warning-outline" />
      <h5>Dashboard access is not enabled for your role.</h5>
    </div>
  </div>
</template>

<style scoped>
.operations-dashboard {
  background: #f6f8fb;
  min-height: calc(100vh - 72px);
}

.dashboard-shell {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dashboard-heading {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.dashboard-heading h4 {
  color: #0f172a;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0;
  margin: 4px 0 2px;
}

.dashboard-heading p,
.panel-header p,
.rank-row small,
.intent-row small,
.stock-card small {
  color: #64748b;
  margin: 0;
}

.eyebrow {
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.dashboard-actions {
  display: flex;
  gap: 10px;
}

.dashboard-actions .form-select {
  min-width: 132px;
}

.dashboard-alert {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  color: #9a3412;
  padding: 12px 14px;
}

.metric-grid,
.dashboard-grid,
.stock-grid {
  display: grid;
  gap: 16px;
}

.metric-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.metric-card,
.panel,
.stock-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
}

.metric-card {
  display: grid;
  gap: 8px;
  min-height: 150px;
  padding: 18px;
  position: relative;
}

.metric-card span {
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.metric-card strong {
  color: #0f172a;
  font-size: clamp(22px, 2vw, 30px);
  font-weight: 800;
  line-height: 1.1;
}

.metric-card em,
.trend-badge {
  border-radius: 999px;
  font-style: normal;
  font-weight: 800;
  justify-self: start;
  padding: 5px 9px;
}

.metric-icon {
  align-items: center;
  border-radius: 8px;
  display: inline-flex;
  font-size: 24px;
  height: 42px;
  justify-content: center;
  width: 42px;
}

.metric-card.revenue .metric-icon { background: #dbeafe; color: #2563eb; }
.metric-card.orders .metric-icon { background: #dcfce7; color: #16a34a; }
.metric-card.customers .metric-icon { background: #fef3c7; color: #d97706; }
.metric-card.average .metric-icon { background: #ffe4e6; color: #e11d48; }

.positive {
  background: #dcfce7;
  color: #15803d;
}

.negative {
  background: #fee2e2;
  color: #b91c1c;
}

.neutral {
  background: #e2e8f0;
  color: #475569;
}

.dashboard-grid {
  grid-template-columns: repeat(12, minmax(0, 1fr));
}

.panel {
  overflow: hidden;
  padding: 18px;
}

.span-4 { grid-column: span 4; }
.span-5 { grid-column: span 5; }
.span-6 { grid-column: span 6; }
.span-7 { grid-column: span 7; }
.span-8 { grid-column: span 8; }
.span-12 { grid-column: span 12; }

.panel-header {
  align-items: flex-start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 14px;
}

.panel-header.compact {
  margin-bottom: 4px;
}

.panel-header h6 {
  color: #0f172a;
  font-size: 16px;
  font-weight: 800;
  margin: 0 0 3px;
}

.dashboard-table {
  border: 1px solid #edf2f7;
  border-radius: 8px;
}

.dashboard-table table {
  min-width: 760px;
}

.dashboard-table th {
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.dashboard-table td {
  color: #0f172a;
  vertical-align: middle;
}

.dashboard-table small,
.rank-row small {
  display: block;
  font-size: 12px;
}

.pill,
.stock-badge {
  border-radius: 999px;
  display: inline-flex;
  font-size: 12px;
  font-weight: 800;
  padding: 5px 9px;
  white-space: nowrap;
}

.pill.success,
.stock-badge.success { background: #dcfce7; color: #15803d; }
.pill.info { background: #e0f2fe; color: #0369a1; }
.pill.warning,
.stock-badge.warning { background: #fef3c7; color: #b45309; }
.pill.danger,
.stock-badge.danger { background: #fee2e2; color: #b91c1c; }
.pill.neutral { background: #e2e8f0; color: #475569; }

.rank-list,
.intent-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rank-row,
.intent-row {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  display: grid;
  gap: 12px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 12px;
}

.rank-row strong,
.intent-row strong,
.stock-card strong {
  color: #0f172a;
  display: block;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-row em {
  color: #0f172a;
  font-style: normal;
  font-weight: 800;
  white-space: nowrap;
}

.rank,
.vendor-avatar {
  align-items: center;
  background: #0f172a;
  border-radius: 8px;
  color: #fff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 800;
  height: 34px;
  justify-content: center;
  width: 34px;
}

.product-marker {
  background: #2563eb;
  border-radius: 999px;
  height: 12px;
  width: 12px;
}

.vendor-strip {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 14px;
}

.vendor-strip div {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px;
}

.vendor-strip span {
  color: #64748b;
  display: block;
  font-size: 11px;
  font-weight: 800;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.vendor-strip strong {
  color: #0f172a;
}

.intent-row {
  grid-template-columns: minmax(0, 1fr) auto;
}

.intent-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}

.intent-metrics span {
  background: #fff;
  border: 1px solid #dbe3ef;
  border-radius: 999px;
  color: #475569;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 8px;
}

.stock-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.stock-card {
  display: grid;
  gap: 10px;
  padding: 14px;
}

.stock-bar {
  background: #e2e8f0;
  border-radius: 999px;
  height: 8px;
  overflow: hidden;
}

.stock-bar span {
  background: #2563eb;
  border-radius: inherit;
  display: block;
  height: 100%;
}

.stock-card em {
  color: #475569;
  font-style: normal;
  font-weight: 700;
}

.empty-cell,
.empty-state {
  color: #64748b;
  padding: 18px;
  text-align: center;
}

.permission-empty {
  align-items: center;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #475569;
  display: flex;
  flex-direction: column;
  gap: 10px;
  justify-content: center;
  min-height: 360px;
}

.permission-empty iconify-icon {
  color: #f59e0b;
  font-size: 42px;
}

@media (max-width: 1199px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .span-4,
  .span-5,
  .span-6,
  .span-7,
  .span-8 {
    grid-column: span 12;
  }

  .stock-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .dashboard-heading,
  .dashboard-actions,
  .panel-header {
    align-items: stretch;
    flex-direction: column;
  }

  .dashboard-heading h4 {
    font-size: 22px;
  }

  .metric-grid,
  .stock-grid,
  .vendor-strip {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: 14px;
  }

  .rank-row,
  .intent-row {
    align-items: start;
    grid-template-columns: 1fr;
  }

  .rank-row em,
  .intent-metrics {
    justify-content: flex-start;
  }
}
</style>
