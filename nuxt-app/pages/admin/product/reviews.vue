<script setup lang="ts">
import { definePageMeta, useNuxtApp } from '#imports'
import { computed, onMounted, reactive, ref, watch } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permission: 'product activation',
})

const { $axios } = (useNuxtApp() as any)

type Tab = 'reviews' | 'questions'

type EngagementRow = {
  id: number
  Products_Id: number
  Rating?: number
  Title?: string | null
  Body?: string
  Question?: string
  Status: string
  Verified_Purchase?: boolean
  Helpful_Count?: number
  Report_Count?: number
  created_at?: string
  product?: { Product_Name?: string; Product_Name_Ar?: string; Slug?: string } | null
  customer?: { Customer_Full_Name?: string; Company_Name?: string } | null
  replies?: Array<{ id: number; Reply_Type: string; Body: string }>
  answers?: Array<{ id: number; Answer_Type: string; Body: string }>
}

type ResponseRow = {
  id: number
  Reply_Type?: string
  Answer_Type?: string
  Body: string
}

const activeTab = ref<Tab>('reviews')
const rows = ref<EngagementRow[]>([])
const loading = ref(false)
const savingId = ref<number | null>(null)
const error = ref('')
const replyDrafts = reactive<Record<string, string>>({})
const table = reactive({
  page: 1,
  perPage: 20,
  status: 'pending',
  q: '',
  rating: '',
})
const pagination = ref({ total: 0, from: 0, to: 0, last_page: 1 })

const endpoint = computed(() => activeTab.value === 'reviews'
  ? '/api/product-engagement/reviews'
  : '/api/product-engagement/questions')

const statusOptions = ['pending', 'approved', 'reported', 'rejected']

const productName = (row: EngagementRow) => row.product?.Product_Name || `Product #${row.Products_Id}`
const customerName = (row: EngagementRow) => row.customer?.Customer_Full_Name || row.customer?.Company_Name || 'Customer'
const createdAt = (value?: string) => value ? new Date(value).toLocaleString() : '-'
const rowText = (row: EngagementRow) => activeTab.value === 'reviews' ? row.Body : row.Question
const rowTitle = (row: EngagementRow) => activeTab.value === 'reviews' ? (row.Title || 'Review') : 'Question'
const responses = (row: EngagementRow): ResponseRow[] => activeTab.value === 'reviews' ? (row.replies || []) : (row.answers || [])

const badgeClass = (status?: string) => {
  const value = String(status || '').toLowerCase()
  if (value === 'approved') return 'status-success'
  if (value === 'reported' || value === 'rejected') return 'status-danger'
  return 'status-warning'
}

const fetchRows = async () => {
  loading.value = true
  error.value = ''
  try {
    const { data } = await $axios.get(endpoint.value, {
      params: {
        page: table.page,
        per_page: table.perPage,
        status: table.status || undefined,
        q: table.q || undefined,
        rating: activeTab.value === 'reviews' && table.rating ? table.rating : undefined,
      },
    })
    rows.value = data?.data || []
    pagination.value = {
      total: data?.total || 0,
      from: data?.from || 0,
      to: data?.to || 0,
      last_page: data?.last_page || 1,
    }
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Unable to load product engagement.'
  } finally {
    loading.value = false
  }
}

const moderate = async (row: EngagementRow, status: string) => {
  savingId.value = row.id
  try {
    const url = activeTab.value === 'reviews'
      ? `/api/product-engagement/reviews/${row.id}/moderate`
      : `/api/product-engagement/questions/${row.id}/moderate`
    await $axios.post(url, { status })
    row.Status = status
  } finally {
    savingId.value = null
  }
}

const sendResponse = async (row: EngagementRow) => {
  const key = `${activeTab.value}-${row.id}`
  const body = replyDrafts[key]?.trim()
  if (!body) return

  savingId.value = row.id
  try {
    const url = activeTab.value === 'reviews'
      ? `/api/product-engagement/reviews/${row.id}/reply`
      : `/api/product-engagement/questions/${row.id}/answer`
    await $axios.post(url, { body })
    replyDrafts[key] = ''
    await fetchRows()
  } finally {
    savingId.value = null
  }
}

watch([activeTab, () => table.page, () => table.perPage, () => table.status, () => table.rating], fetchRows)
watch(() => table.q, () => {
  table.page = 1
  fetchRows()
})
watch(activeTab, () => {
  table.page = 1
  table.rating = ''
})
onMounted(fetchRows)
</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <div>
        <h6 class="fw-semibold mb-1" style="color:#ef4444">Reviews, Ratings & Q&A</h6>
        <div class="text-muted small">Moderate customer content, answer questions, and reply to reviews.</div>
      </div>
      <ul class="d-flex align-items-center gap-2 mb-0">
        <li class="fw-medium">
          <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg" aria-hidden="true"></iconify-icon>
            Dashboard
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">Product engagement</li>
      </ul>
    </div>

    <div v-if="error" role="alert" class="alert alert-danger">{{ error }}</div>

    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white">
        <div class="d-flex flex-wrap align-items-end justify-content-between gap-3">
          <div class="btn-group" role="tablist" aria-label="Product engagement type">
            <button type="button" class="btn btn-sm" :class="activeTab === 'reviews' ? 'btn-primary' : 'btn-outline-primary'" @click="activeTab = 'reviews'">
              Reviews
            </button>
            <button type="button" class="btn btn-sm" :class="activeTab === 'questions' ? 'btn-primary' : 'btn-outline-primary'" @click="activeTab = 'questions'">
              Q&A
            </button>
          </div>

          <div class="d-flex flex-wrap align-items-end gap-3">
            <label class="form-label small mb-0">
              Show
              <select v-model.number="table.perPage" class="form-select form-select-sm mt-1">
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
              </select>
            </label>
            <label class="form-label small mb-0">
              Status
              <select v-model="table.status" class="form-select form-select-sm mt-1">
                <option value="">All</option>
                <option v-for="status in statusOptions" :key="status" :value="status">{{ status }}</option>
              </select>
            </label>
            <label v-if="activeTab === 'reviews'" class="form-label small mb-0">
              Rating
              <select v-model="table.rating" class="form-select form-select-sm mt-1">
                <option value="">All</option>
                <option v-for="rating in [5,4,3,2,1]" :key="rating" :value="rating">{{ rating }}</option>
              </select>
            </label>
            <label class="form-label small mb-0">
              Search
              <input v-model.trim="table.q" class="form-control form-control-sm mt-1" placeholder="Product or text" />
            </label>
          </div>
        </div>
      </div>

      <div class="table-responsive">
        <table class="table align-middle mb-0 product-engagement-table" :aria-busy="loading ? 'true' : 'false'">
          <caption class="visually-hidden">Product reviews and questions awaiting moderation.</caption>
          <thead class="table-light">
            <tr>
              <th scope="col">Product</th>
              <th scope="col">Customer</th>
              <th v-if="activeTab === 'reviews'" scope="col">Rating</th>
              <th scope="col">Content</th>
              <th scope="col">Status</th>
              <th scope="col">Signals</th>
              <th scope="col">Replies</th>
              <th scope="col" class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td :colspan="activeTab === 'reviews' ? 8 : 7" class="py-5 text-center text-muted" role="status">Loading product engagement...</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td :colspan="activeTab === 'reviews' ? 8 : 7" class="py-5 text-center text-muted" role="status">No matching items found.</td>
            </tr>
            <template v-else>
              <tr v-for="row in rows" :key="row.id">
                <td>
                  <div class="fw-semibold">{{ productName(row) }}</div>
                  <div class="text-muted small">{{ createdAt(row.created_at) }}</div>
                </td>
                <td>{{ customerName(row) }}</td>
                <td v-if="activeTab === 'reviews'">
                  <span class="fw-semibold text-warning">{{ row.Rating }}/5</span>
                  <div v-if="row.Verified_Purchase" class="small text-success">Verified purchase</div>
                </td>
                <td class="engagement-content">
                  <div class="fw-semibold">{{ rowTitle(row) }}</div>
                  <div class="text-muted">{{ rowText(row) }}</div>
                </td>
                <td>
                  <span class="badge rounded-pill text-capitalize" :class="badgeClass(row.Status)">{{ row.Status }}</span>
                </td>
                <td class="small">
                  <div>Helpful: {{ row.Helpful_Count || 0 }}</div>
                  <div>Reports: {{ row.Report_Count || 0 }}</div>
                </td>
                <td>
                  <div v-if="responses(row).length" class="small">
                    <div v-for="reply in responses(row)" :key="reply.id" class="mb-1">
                      <span class="fw-semibold text-capitalize">{{ reply.Reply_Type || reply.Answer_Type }}:</span>
                      {{ reply.Body }}
                    </div>
                  </div>
                  <div v-else class="text-muted small">No reply yet</div>
                </td>
                <td class="text-end">
                  <div class="d-flex flex-column gap-2 align-items-end">
                    <div class="btn-group btn-group-sm" role="group" :aria-label="`Moderate item ${row.id}`">
                      <button type="button" class="btn btn-outline-success" :disabled="savingId === row.id" @click="moderate(row, 'approved')">Approve</button>
                      <button type="button" class="btn btn-outline-danger" :disabled="savingId === row.id" @click="moderate(row, 'rejected')">Reject</button>
                      <button type="button" class="btn btn-outline-secondary" :disabled="savingId === row.id" @click="moderate(row, 'pending')">Pending</button>
                    </div>
                    <label class="visually-hidden" :for="`reply-${activeTab}-${row.id}`">Reply to {{ productName(row) }}</label>
                    <textarea
                      :id="`reply-${activeTab}-${row.id}`"
                      v-model="replyDrafts[`${activeTab}-${row.id}`]"
                      class="form-control form-control-sm"
                      rows="2"
                      placeholder="Write reply..."
                    ></textarea>
                    <button type="button" class="btn btn-sm btn-primary" :disabled="savingId === row.id" @click="sendResponse(row)">
                      {{ activeTab === 'reviews' ? 'Reply' : 'Answer' }}
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div class="card-footer bg-white d-flex flex-wrap align-items-center justify-content-between gap-2">
        <span class="small text-muted">Showing {{ pagination.from || 0 }} to {{ pagination.to || 0 }} of {{ pagination.total || 0 }}</span>
        <div class="btn-group btn-group-sm" role="group" aria-label="Product engagement pagination">
          <button type="button" class="btn btn-outline-secondary" :disabled="table.page <= 1" @click="table.page--">Prev</button>
          <button type="button" class="btn btn-outline-secondary" disabled>Page {{ table.page }} / {{ pagination.last_page }}</button>
          <button type="button" class="btn btn-outline-secondary" :disabled="table.page >= pagination.last_page" @click="table.page++">Next</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-engagement-table {
  min-width: 1160px;
}

.engagement-content {
  max-width: 320px;
  white-space: normal;
}

.status-success {
  background-color: #166534 !important;
  color: #fff !important;
}

.status-warning {
  background-color: #facc15 !important;
  color: #3f2f00 !important;
}

.status-danger {
  background-color: #b91c1c !important;
  color: #fff !important;
}
</style>
