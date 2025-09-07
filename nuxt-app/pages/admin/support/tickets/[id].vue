<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'support.tickets'
})

import { ref, onMounted, nextTick, watch  } from 'vue'
const route = useRoute()
const { $axios } = useNuxtApp()

type Ticket = {
  id: number
  reference: string
  subject: string
  type: 'support'|'feedback'|'return'
  status: 'open'|'pending'|'closed'
  order_id: number | null
  user?: { id:number, name?:string, email?:string } | null
  
  created_at: string
  updated_at: string
}
type Message = {
  id: number
  sender_type: 'user'|'support'
  body: string
  created_at: string
}

type Customer = {
  id: number
  full_name: string
  telephone?: string | null
}

const ticket = ref<Ticket | null>(null)
const messages = ref<Message[]>([])
const customer = ref<Customer | null>(null)
const loading = ref(false)

const replyBody = ref('')
const newStatus = ref<'open'|'pending'|'closed'|''>('') // optional status change on reply
const saving = ref(false);


const chatBox = ref<HTMLElement | null>(null)

// helper to scroll to the latest message
const scrollToBottom = async () => {
  await nextTick()
  if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight
}

// after you load messages (where you set messages = ...), call:
await scrollToBottom()

// also keep it sticky when messages update
watch(() => messages.value.length, () => { scrollToBottom() })

const fetchTicket = async () => {
  loading.value = true
  try {
    const { data } = await $axios.get(`/api/admin/support-tickets/${route.params.id}`)
    ticket.value = data.ticket
    messages.value = data.messages || []
 
    customer.value = data.customer || null

    
  } finally {
    loading.value = false
  }
}

const postReply = async () => {
  if (!replyBody.value.trim()) return
  saving.value = true
  try {
    await $axios.post(`/api/admin/support-tickets/${route.params.id}/reply`, {
      message_body: replyBody.value,
      status: newStatus.value || undefined
    })
    replyBody.value = ''
    newStatus.value = ''
    await fetchTicket()
  } finally {
    saving.value = false
  }
}

const setStatus = async (status: 'open'|'pending'|'closed') => {
  if (!ticket.value) return
  await $axios.patch(`/api/admin/support-tickets/${ticket.value.id}/status`, { status })
  await fetchTicket()
}

const fmt = (d?: string) => d ? new Date(d).toLocaleString() : '—'
onMounted(fetchTicket)
</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color:#ef4444">Ticket Details</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">
          <NuxtLink to="/admin/support/tickets" class="hover-text-primary">Support Tickets</NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">Details</li>
      </ul>
    </div>

    <div v-if="loading" class="card"><div class="card-body">Loading…</div></div>
    <div v-else-if="!ticket" class="card"><div class="card-body text-danger">Ticket not found.</div></div>

    <div v-else class="row g-3">
      <!-- Left: thread -->
       <!-- Left: thread -->
<div class="col-lg-8">
  <div class="card h-100 d-flex">
    <div class="card-header d-flex justify-content-between align-items-center">
      <div>
        <div class="fw-semibold">{{ ticket.subject }}</div>
        <div class="small text-muted">
          Ref: <span class="text-monospace">{{ ticket.reference }}</span> ·
          Type: <span class="text-capitalize">{{ ticket.type }}</span> ·
          Status:
          <span :class="['badge', 
                        ticket.status==='open' ? 'bg-success-subtle text-success' : 
                        ticket.status==='pending' ? 'bg-warning-subtle text-warning' :
                        'bg-secondary-subtle text-secondary']">
            {{ ticket.status }}
          </span>
        </div>
      </div>
      <div class="btn-group btn-group-sm">
        <button class="btn btn-outline-secondary" @click="setStatus('open')">Open</button>
        <button class="btn btn-outline-secondary" @click="setStatus('pending')">Pending</button>
        <button class="btn btn-outline-secondary" @click="setStatus('closed')">Close</button>
      </div>
    </div>

    <!-- Chat window -->
    <div class="card-body p-0 d-flex flex-column">
      <div ref="chatBox" class="chat-window p-3">
        <div v-if="messages.length === 0" class="text-muted text-center py-5">No messages yet.</div>

        <div v-for="m in messages" :key="m.id"
             class="mb-3 d-flex"
             :class="m.sender_type === 'support' ? 'justify-content-end' : 'justify-content-start'">

          <div class="d-flex align-items-end gap-2"
               :class="m.sender_type === 'support' ? 'flex-row-reverse' : ''">

            <!-- avatar -->
            <div class="chat-avatar rounded-circle d-inline-flex align-items-center justify-content-center"
                 :class="m.sender_type === 'support' ? 'bg-primary text-white' : 'bg-light border text-muted'">
              {{ m.sender_type === 'support' ? 'S' : 'U' }}
            </div>

            <!-- bubble -->
            <div class="chat-bubble p-3 rounded-3 shadow-sm"
                 :class="m.sender_type === 'support' ? 'bg-primary text-white' : 'bg-light border'">
              <div class="chat-text">
                <pre class="mb-1" :class="m.sender_type === 'support' ? 'text-white' : 'text-body'"
                     style="white-space:pre-wrap">{{ m.body }}</pre>
              </div>
              <div class="small"
                   :class="m.sender_type === 'support' ? 'text-white-50' : 'text-muted'">
                {{ fmt(m.created_at) }}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- Composer -->
    <div class="card-footer">
      <div class="d-flex flex-column gap-2">
        <textarea v-model="replyBody" class="form-control" rows="3" placeholder="Type your message…"></textarea>

        <div class="d-flex align-items-center justify-content-between">
          <div class="d-flex align-items-center gap-2">
            <span class="small text-muted">Set status:</span>
            <select v-model="newStatus" class="form-select form-select-sm w-auto">
              <option value="">(no change)</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <button class="btn btn-primary" :disabled="!replyBody.trim() || saving" @click="postReply">
            {{ saving ? 'Sending…' : 'Send' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

       
      <!-- Right: meta -->
      <div class="col-lg-4">
        <div class="card">
          <div class="card-header fw-semibold">Ticket Info</div>
          <div class="card-body">
            <table class="table table-sm mb-0">
              <tbody>
                <tr><th class="w-25">Reference</th><td class="text-monospace">{{ ticket.reference }}</td></tr>
                <tr><th>Type</th><td class="text-capitalize">{{ ticket.type }}</td></tr>
                <tr><th>Status</th>
                  <td>
                    <span :class="['badge', 
                                   ticket.status==='open' ? 'bg-success-subtle text-success' : 
                                   ticket.status==='pending' ? 'bg-warning-subtle text-warning' :
                                   'bg-secondary-subtle text-secondary']">
                      {{ ticket.status }}
                    </span>
                  </td>
                </tr>
                <tr><th>Order</th><td>{{ ticket.order_id ?? '—' }}</td></tr>
                <tr><th>Customer</th><td>{{ customer?.full_name ?? '—' }}</td></tr>
                <tr><th>Phone Number</th><td>{{ customer?.telephone ?? '—' }}</td></tr>
                <tr><th>Created</th><td>{{ fmt(ticket.created_at) }}</td></tr>
                <tr><th>Updated</th><td>{{ fmt(ticket.updated_at) }}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
