<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { definePageMeta, useNuxtApp } from '#imports'

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permission: 'dashboard',
})

const { $axios } = useNuxtApp() as any

const reportOptions = [
  { key: 'net_sales', label: 'Net Sales' },
  { key: 'refunds', label: 'Refunds' },
  { key: 'returns', label: 'Returns' },
  { key: 'cancellation_reasons', label: 'Cancellation Reasons' },
  { key: 'vendor_performance', label: 'Vendor Performance' },
  { key: 'stock_movement', label: 'Stock Movement' },
  { key: 'payouts', label: 'Payouts' },
]

const loading = ref(false)
const exporting = ref(false)
const error = ref<string | null>(null)
const selectedReport = ref('net_sales')
const dateFrom = ref('')
const dateTo = ref('')
const vendorId = ref('')
const reports = ref<Record<string, any[]>>({})
const summary = ref<Record<string, any>>({})

const activeRows = computed(() => reports.value[selectedReport.value] || [])
const activeColumns = computed(() => {
  const first = activeRows.value[0]
  return first ? Object.keys(first) : []
})

const money = (value: any) => Number(value || 0).toFixed(3)
const labelFor = (key: string) => reportOptions.find((item) => item.key === key)?.label || key

const fetchReports = async () => {
  loading.value = true
  error.value = null
  try {
    const { data } = await $axios.get('/api/admin/reports/operations', {
      params: {
        report: 'all',
        date_from: dateFrom.value || undefined,
        date_to: dateTo.value || undefined,
        vendor_id: vendorId.value || undefined,
        limit: 250,
      },
    })

    reports.value = data.reports || {}
    summary.value = data.summary || {}
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Failed to load operations reports.'
  } finally {
    loading.value = false
  }
}

const downloadReport = async () => {
  exporting.value = true
  error.value = null
  try {
    const response = await $axios.get('/api/admin/reports/operations/export', {
      params: {
        report: selectedReport.value,
        date_from: dateFrom.value || undefined,
        date_to: dateTo.value || undefined,
        vendor_id: vendorId.value || undefined,
        limit: 1000,
      },
      responseType: 'blob',
    })

    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
    const href = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = href
    link.download = `operations-${selectedReport.value}.csv`
    link.click()
    URL.revokeObjectURL(href)
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Failed to export report.'
  } finally {
    exporting.value = false
  }
}

onMounted(fetchReports)
</script>

<template>
  <div class="dashboard-main-body operations-report-page">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <div>
        <ul class="d-flex align-items-center gap-2 mb-2 list-unstyled">
          <li class="fw-medium">
            <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
              <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg" />
              Dashboard
            </NuxtLink>
          </li>
          <li class="text-muted">-</li>
          <li class="fw-medium">Operations Reports</li>
        </ul>
        <h5 class="fw-semibold mb-1">Operations Reports</h5>
        <p class="text-muted small mb-0">Net sales, returns, refunds, vendor performance, stock movement, and payouts.</p>
      </div>

      <div class="d-flex flex-wrap align-items-center gap-2">
        <input v-model="dateFrom" type="date" class="form-control form-control-sm report-filter" />
        <input v-model="dateTo" type="date" class="form-control form-control-sm report-filter" />
        <input v-model="vendorId" type="number" min="1" class="form-control form-control-sm report-filter" placeholder="Vendor ID" />
        <button class="btn btn-sm btn-outline-primary" :disabled="loading" @click="fetchReports">
          Refresh
        </button>
        <button class="btn btn-sm btn-success" :disabled="exporting || !activeRows.length" @click="downloadReport">
          Export CSV
        </button>
      </div>
    </div>

    <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>

    <div class="row g-3 mb-24">
      <div class="col-md-3">
        <div class="report-stat">
          <div class="text-muted small">Sold Amount</div>
          <div class="fw-semibold fs-5">{{ money(summary.sold_amount) }}</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="report-stat">
          <div class="text-muted small">Refunded</div>
          <div class="fw-semibold fs-5 text-danger">{{ money(summary.refunded_amount) }}</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="report-stat">
          <div class="text-muted small">Net Amount</div>
          <div class="fw-semibold fs-5 text-success">{{ money(summary.net_amount) }}</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="report-stat">
          <div class="text-muted small">Pending Payouts</div>
          <div class="fw-semibold fs-5 text-warning">{{ money(summary.pending_payout_amount) }}</div>
        </div>
      </div>
    </div>

    <div class="report-shell">
      <div class="report-tabs">
        <button
          v-for="option in reportOptions"
          :key="option.key"
          type="button"
          class="report-tab"
          :class="{ active: selectedReport === option.key }"
          @click="selectedReport = option.key"
        >
          {{ option.label }}
          <span>{{ reports[option.key]?.length || 0 }}</span>
        </button>
      </div>

      <div class="report-table-wrap">
        <div class="d-flex align-items-center justify-content-between gap-2 p-3 border-bottom">
          <div>
            <h6 class="mb-0">{{ labelFor(selectedReport) }}</h6>
            <div class="text-muted small">{{ activeRows.length }} rows</div>
          </div>
        </div>

        <div v-if="loading" class="p-5 text-center text-muted">Loading reports...</div>
        <div v-else-if="!activeRows.length" class="p-5 text-center text-muted">No report rows for the selected filters.</div>
        <div v-else class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th v-for="column in activeColumns" :key="column">{{ column.replaceAll('_', ' ') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in activeRows" :key="index">
                <td v-for="column in activeColumns" :key="column">
                  {{ row[column] ?? '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.operations-report-page {
  color: #111827;
}

.report-filter {
  width: 140px;
}

.report-stat {
  height: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 1rem;
}

.report-shell {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.report-tabs {
  border-right: 1px solid #e5e7eb;
  background: #f8fafc;
  padding: .75rem;
}

.report-tab {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  padding: .65rem .75rem;
  color: #475569;
  font-size: .875rem;
  text-align: left;
}

.report-tab.active {
  background: #0f766e;
  color: #fff;
}

.report-tab span {
  font-size: .75rem;
  opacity: .8;
}

.report-table-wrap {
  min-width: 0;
}

@media (max-width: 992px) {
  .report-shell {
    grid-template-columns: 1fr;
  }

  .report-tabs {
    border-right: 0;
    border-bottom: 1px solid #e5e7eb;
  }
}
</style>
