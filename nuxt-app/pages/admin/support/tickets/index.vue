 <script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'support.tickets'
})

import { ref, onMounted, watch, computed } from 'vue'
const { $axios } = useNuxtApp()

type TicketRow = {
  id: number
  reference: string
  subject: string
  type: 'support'|'feedback'|'return'
  status: 'open'|'pending'|'closed'
  order_id: number | null
  customer_id: number | null
  user_id: number | null
  messages_count: number
  last_message_at?: string | null
  last_message_snippet?: string | null
  created_at: string
  updated_at: string
  customer?: { id: number; full_name: string; telephone?: string | null } | null
}

const rows       = ref<TicketRow[]>([])
const total      = ref(0)
const page       = ref(1)
const perPage    = ref(20)
const lastPage   = ref(1)
const currentPage= ref(1)

const search = ref('')
const status = ref<string|undefined>(undefined) // open|pending|closed
const type   = ref<string|undefined>(undefined) // support|feedback|return
const sort   = ref('-created_at')               // "-created_at" | "created_at" | "subject" | "-subject" | "status" | "-status"
const loading= ref(false)

const formatDate = (d?: string | null) => d ? new Date(d).toLocaleString() : '—'
const startIdx   = computed(() => (page.value - 1) * perPage.value)

const fetchTickets = async () => {
  loading.value = true
  try {
    const { data } = await $axios.get('/api/admin/support-tickets', {
      params: {
        page: page.value,
        per_page: perPage.value,
        q: search.value || undefined,
        status: status.value || undefined,
        type: type.value || undefined,
        sort: sort.value || undefined
      }
    })
    rows.value        = data.data || []
    total.value       = data.meta?.total ?? rows.value.length
    lastPage.value    = data.meta?.last_page ?? 1
    currentPage.value = data.meta?.current_page ?? page.value
  } finally {
    loading.value = false
  }
}

// Re-fetch on filter/pager changes
watch([page, perPage, search, status, type, sort], fetchTickets, { deep: false })
onMounted(fetchTickets)
</script>

<template>
  <div class="dashboard-main-body">

    <!-- Header -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color:#ef4444">Support Tickets</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">Support</li>
      </ul>
    </div>

    <div class="card">
      <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div class="d-flex flex-wrap align-items-center gap-3">

          <!-- Per page -->
          <div class="d-flex align-items-center gap-2">
            <span>Show</span>
            <select v-model.number="perPage" class="form-select form-select-sm w-auto">
              <option :value="10">10</option>
              <option :value="15">15</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
            </select>
          </div>

          <!-- Status filter -->
          <select v-model="status" class="form-select form-select-sm w-auto">
            <option :value="undefined">All Status</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="closed">Closed</option>
          </select>

          <!-- Type filter -->
          <select v-model="type" class="form-select form-select-sm w-auto">
            <option :value="undefined">All Types</option>
            <option value="support">Support</option>
            <option value="feedback">Feedback</option>
            <option value="return">Return</option>
          </select>

          <!-- Search -->
          <div class="icon-field">
            <input
              v-model="search"
              type="text"
              class="form-control form-control-sm w-auto"
              placeholder="Search subject / reference"
            />
            <span class="icon"><iconify-icon icon="ion:search-outline"></iconify-icon></span>
          </div>

          <!-- Sort -->
          <select v-model="sort" class="form-select form-select-sm w-auto">
            <option value="-created_at">Newest</option>
            <option value="created_at">Oldest</option>
            <option value="subject">Subject A–Z</option>
            <option value="-subject">Subject Z–A</option>
            <option value="status">Status A–Z</option>
            <option value="-status">Status Z–A</option>
          </select>
        </div>

        <div v-if="loading" class="text-muted small">Loading…</div>
      </div>

      <div class="card-body">
        <div v-if="rows.length === 0 && !loading" class="text-muted">No tickets found.</div>

        <table v-else class="table bordered-table mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>Reference</th>
              <th>Subject</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Status</th>
              <th>Msgs</th>
              <th>Last Message</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(t, i) in rows" :key="t.id">
              <td>{{ startIdx + i + 1 }}</td>

              <td class="text-monospace">{{ t.reference }}</td>

              <td>
                <div class="fw-semibold">{{ t.subject }}</div>
                <div class="text-muted small">{{ t.last_message_snippet || '' }}</div>
              </td>

              <td>
                <div v-if="t.customer">
                  <div class="fw-semibold">{{ t.customer.full_name }}</div>
                  <div class="text-muted small" v-if="t.customer.telephone">{{ t.customer.telephone }}</div>
                </div>
                <div v-else class="text-muted">—</div>
              </td>

              <td class="text-capitalize">{{ t.type }}</td>

              <td>
                <span :class="[
                        'badge',
                        t.status==='open' ? 'bg-success-subtle text-success' :
                        t.status==='pending' ? 'bg-warning-subtle text-warning' :
                        'bg-secondary-subtle text-secondary'
                      ]">
                  {{ t.status }}
                </span>
              </td>

              <td>{{ t.messages_count }}</td>
              <td class="small">{{ formatDate(t.last_message_at) }}</td>

              <td>
                <NuxtLink
                  :to="`/admin/support/tickets/${t.id}`"
                  class="w-32-px h-32-px bg-primary-light text-primary-600 rounded-circle d-inline-flex align-items-center justify-content-center"
                >
                  <iconify-icon icon="iconamoon:eye-light" />
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pager -->
        <div class="d-flex justify-content-between align-items-center mt-3">
          <div class="small text-muted">Total: {{ total }}</div>
          <div class="btn-group">
            <button class="btn btn-sm btn-light" :disabled="page<=1 || loading" @click="page--">Prev</button>
            <button class="btn btn-sm btn-light" :disabled="page>=lastPage || loading" @click="page++">Next</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
