<script lang="ts" setup>
import { useNuxtApp, definePageMeta } from '#imports'
import { ref, onMounted, reactive, watch } from 'vue'
import { useFlashStore } from '~/stores/flashs'

const flash = useFlashStore()

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permission: 'vendor registration requests',
})

const { $axios } = useNuxtApp() as any

interface VendorRequest {
  id: number
  Vendor_Code: string
  Vendor_Name: string
  Email_1?: string | null
  Phone_No?: string | null
  CR_Number?: string | null
  VAT_Number?: string | null
  Business_Type?: string | null
  Approval_Status?: 'pending' | 'accepted' | 'under_review' | 'approved' | 'rejected' | null
  Submitted_For_Approval_At?: string | null
  documents?: Array<{ id: number; Document_Type?: string; Document_Name?: string; Status?: string | null }>
}

const requests = ref<VendorRequest[]>([])
const isLoading = ref(false)
const actingId = ref<number | null>(null)
// 'pending' = new registrations to Accept; 'under_review' = completed profiles to Approve
const activeTab = ref<'pending' | 'under_review'>('pending')

const setTab = (t: 'pending' | 'under_review') => {
  if (activeTab.value === t) return
  activeTab.value = t
  table.page = 1
  getRequests()
}

const table = reactive({
  page: 1,
  perPage: 10,
  search: '',
})
const pagination = ref({ total: 0, from: 0, to: 0, last_page: 1 })

// reject modal
const showReject = ref(false)
const rejectTarget = ref<VendorRequest | null>(null)
const rejectNote = ref('')
const isRejecting = ref(false)

const approvalBadgeClass = (value?: string | null) => {
  if (value === 'approved') return 'bg-success'
  if (value === 'rejected') return 'bg-danger'
  if (value === 'under_review') return 'bg-warning text-dark'
  return 'bg-secondary'
}

const formatDate = (value?: string | null) => {
  if (!value) return '-'
  const d = new Date(value)
  return isNaN(d.getTime()) ? value : d.toLocaleString()
}

const docLabels: Record<string, string> = {
  commercial_registration: 'CR',
  chamber_of_commerce: 'Chamber of Commerce',
  activity_license: 'Activity License',
  rent_contract: 'Rent Contract',
}
const docLabel = (type?: string) => docLabels[type || ''] || (type || 'Document')

const openingDoc = ref<number | null>(null)
const openDocument = async (docId: number) => {
  openingDoc.value = docId
  try {
    const { data } = await $axios.get(`/api/admin/vendor-documents/${docId}/url`)
    if (data?.url) window.open(data.url, '_blank', 'noopener')
    else flash.error('Document URL unavailable.')
  } catch (error: any) {
    flash.error(error?.response?.data?.message || 'Could not open document.')
  } finally {
    openingDoc.value = null
  }
}

const getRequests = async () => {
  isLoading.value = true
  try {
    const { data } = await $axios.get('/api/admin/vendor-registrations', {
      params: {
        page: table.page,
        per_page: table.perPage,
        search: table.search,
        status: activeTab.value,
      },
    })
    requests.value = data.data
    pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }
  } catch (error: any) {
    const msg = error?.response?.data?.message || error?.message || 'Failed to load registration requests.'
    flash.error(msg)
  } finally {
    isLoading.value = false
  }
}

watch(
  () => [table.page, table.perPage, table.search],
  async () => { await getRequests() }
)

const accept = async (v: VendorRequest) => {
  const ok = await flash.confirm({
    title: 'Accept registration?',
    message: `Accept "${v.Vendor_Name}"? They'll be able to log in and complete their full profile.`,
    confirmText: 'Yes, accept',
    cancelText: 'Cancel',
  })
  if (!ok) return

  actingId.value = v.id
  try {
    await $axios.patch(`/api/vendors/${v.id}/approval`, {
      approval_status: 'accepted',
      note: 'Accepted from registration requests.',
    })
    flash.success(`${v.Vendor_Name} accepted — they can now log in and complete their profile.`)
    await getRequests()
  } catch (error: any) {
    flash.error(error?.response?.data?.message || 'Failed to accept registration.')
  } finally {
    actingId.value = null
  }
}

const approve = async (v: VendorRequest) => {
  const ok = await flash.confirm({
    title: 'Approve vendor?',
    message: `Approve "${v.Vendor_Name}"? They will get full access to add products.`,
    confirmText: 'Yes, approve',
    cancelText: 'Cancel',
  })
  if (!ok) return

  actingId.value = v.id
  try {
    await $axios.patch(`/api/vendors/${v.id}/approval`, {
      approval_status: 'approved',
      note: 'Approved from registration requests.',
    })
    flash.success(`${v.Vendor_Name} approved.`)
    await getRequests()
  } catch (error: any) {
    const msg = error?.response?.data?.message || error?.message || 'Failed to approve vendor.'
    flash.error(msg)
  } finally {
    actingId.value = null
  }
}

const openReject = (v: VendorRequest) => {
  rejectTarget.value = v
  rejectNote.value = ''
  showReject.value = true
}

const closeReject = () => {
  showReject.value = false
  rejectTarget.value = null
  rejectNote.value = ''
}

const confirmReject = async () => {
  if (!rejectTarget.value) return
  isRejecting.value = true
  try {
    await $axios.patch(`/api/vendors/${rejectTarget.value.id}/approval`, {
      approval_status: 'rejected',
      note: rejectNote.value || null,
    })
    flash.success(`${rejectTarget.value.Vendor_Name} rejected.`)
    closeReject()
    await getRequests()
  } catch (error: any) {
    const msg = error?.response?.data?.message || error?.message || 'Failed to reject vendor.'
    flash.error(msg)
  } finally {
    isRejecting.value = false
  }
}

onMounted(async () => {
  await getRequests()
})
</script>

<template>
  <div class="dashboard-main-body vendor-admin-page">
    <div class="vendor-hero d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <div>
        <h5 class="fw-semibold mb-1">Vendor Registration Requests</h5>
        <p class="text-muted mb-0">Review vendors who signed up through the portal and approve or reject them.</p>
      </div>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg" />
            Dashboard
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">Registration Requests</li>
      </ul>
    </div>

    <div class="row g-3 mb-24">
      <div class="col-md-4">
        <div class="vendor-stat-card">
          <span class="vendor-stat-icon bg-warning-50 text-warning-600">
            <iconify-icon icon="solar:user-plus-linear" />
          </span>
          <div>
            <div class="text-muted small">Pending Requests</div>
            <div class="fw-semibold fs-5">{{ pagination.total || 0 }}</div>
          </div>
        </div>
      </div>
    </div>

    <ul class="nav nav-pills gap-2 mb-16">
      <li class="nav-item">
        <button type="button" class="nav-link" :class="activeTab === 'pending' ? 'active' : ''" @click="setTab('pending')">
          New registrations
        </button>
      </li>
      <li class="nav-item">
        <button type="button" class="nav-link" :class="activeTab === 'under_review' ? 'active' : ''" @click="setTab('under_review')">
          Profile submissions
        </button>
      </li>
    </ul>

    <div class="col-lg-12">
      <div class="card vendor-table-card">
        <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <div class="fw-semibold">{{ activeTab === 'pending' ? 'New registrations' : 'Profile submissions' }}</div>
            <div class="text-muted small">
              {{ activeTab === 'pending'
                ? 'Accept to let the vendor log in and complete their full profile.'
                : 'Approve to give the vendor full access to add products.' }}
            </div>
          </div>

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
              <input v-model="table.search" type="text" class="form-control form-control-sm w-auto" placeholder="Search" />
              <span class="icon"><iconify-icon icon="ion:search-outline"></iconify-icon></span>
            </div>
          </div>
        </div>

        <div class="card-body">
          <div class="spinner-border" role="status" v-if="isLoading">
            <span class="sr-only">Loading...</span>
          </div>

          <template v-else>
            <table class="table bordered-table mb-0">
              <thead>
                <tr>
                  <th>S.L</th>
                  <th>Code</th>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>CR</th>
                  <th>VAT</th>
                  <th>Type</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Documents</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                <tr v-if="!requests.length">
                  <td colspan="12" class="text-center text-muted py-24">No pending registration requests.</td>
                </tr>
                <tr v-for="(v, index) in requests" :key="v.id">
                  <td>{{ index + 1 + ((pagination.from || 1) - 1) }}</td>
                  <td>{{ v.Vendor_Code }}</td>
                  <td>{{ v.Vendor_Name }}</td>
                  <td>{{ v.Email_1 || '-' }}</td>
                  <td>{{ v.Phone_No || '-' }}</td>
                  <td>{{ v.CR_Number || '-' }}</td>
                  <td>{{ v.VAT_Number || '-' }}</td>
                  <td>{{ v.Business_Type || '-' }}</td>
                  <td>{{ formatDate(v.Submitted_For_Approval_At) }}</td>
                  <td>
                    <span class="badge" :class="approvalBadgeClass(v.Approval_Status)">
                      {{ v.Approval_Status || 'pending' }}
                    </span>
                  </td>
                  <td style="min-width: 160px">
                    <div v-if="v.documents && v.documents.length" class="d-flex flex-wrap gap-1">
                      <button
                        v-for="d in v.documents"
                        :key="d.id"
                        type="button"
                        class="btn btn-sm btn-outline-primary py-0 px-2"
                        :disabled="openingDoc === d.id"
                        :title="d.Document_Name || ''"
                        @click="openDocument(d.id)"
                      >
                        <iconify-icon icon="solar:document-text-linear" class="me-1"></iconify-icon>
                        {{ docLabel(d.Document_Type) }}
                      </button>
                    </div>
                    <span v-else class="text-muted small">—</span>
                  </td>
                  <td style="min-width: 230px">
                    <NuxtLink
                      :to="`/admin/vendor/registration-requests/${v.id}`"
                      class="btn btn-sm btn-outline-secondary me-1"
                    >
                      <iconify-icon icon="solar:eye-linear" class="me-1"></iconify-icon>
                      View details
                    </NuxtLink>
                    <button
                      v-if="activeTab === 'pending'"
                      type="button"
                      class="btn btn-sm btn-outline-success"
                      :disabled="actingId === v.id"
                      @click="accept(v)"
                    >
                      <span v-if="actingId === v.id" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                      Accept
                    </button>
                    <button
                      v-else
                      type="button"
                      class="btn btn-sm btn-outline-success"
                      :disabled="actingId === v.id"
                      @click="approve(v)"
                    >
                      <span v-if="actingId === v.id" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                      Approve
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-danger ms-1"
                      :disabled="actingId === v.id"
                      @click="openReject(v)"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>

            <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-24">
              <span>
                Showing {{ pagination.from || 0 }} to {{ pagination.to || 0 }} of {{ pagination.total || 0 }} entries
              </span>
              <ul class="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
                <li class="page-item" :class="{ disabled: table.page === 1 }">
                  <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                    href="javascript:void(0)" @click="table.page > 1 && (table.page -= 1)">
                    <iconify-icon icon="ep:d-arrow-left" class="text-xl"></iconify-icon>
                  </a>
                </li>

                <li v-for="p in pagination.last_page" :key="p" class="page-item">
                  <a href="javascript:void(0)" @click="table.page = p" :class="[
                    'page-link fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px',
                    p === table.page ? 'bg-primary-600 text-white' : 'bg-primary-50 text-secondary-light'
                  ]">
                    {{ p }}
                  </a>
                </li>

                <li class="page-item" :class="{ disabled: table.page === pagination.last_page }">
                  <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                    href="javascript:void(0)" @click="table.page < pagination.last_page && (table.page += 1)">
                    <iconify-icon icon="ep:d-arrow-right" class="text-xl"></iconify-icon>
                  </a>
                </li>
              </ul>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- REJECT MODAL -->
    <transition name="fade-scale" appear>
      <div v-if="showReject" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
        style="background: rgba(0,0,0,0.5); z-index:1050;">
        <div class="bg-white radius-12 shadow p-24" style="min-width: 320px; max-width: 480px; width: 100%;">
          <div class="d-flex justify-content-between align-items-start mb-16">
            <div>
              <h5 class="fw-semibold mb-4">Reject registration</h5>
              <small class="text-muted d-block">{{ rejectTarget?.Vendor_Name }}</small>
            </div>
            <button type="button" class="btn-close" aria-label="Close" @click="closeReject"></button>
          </div>

          <div class="mb-3">
            <label class="form-label fw-semibold text-sm">Reason (optional)</label>
            <textarea v-model="rejectNote" rows="3" class="form-control radius-8" placeholder="Let the vendor know why (stored on the record)."></textarea>
          </div>

          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-outline-secondary" @click="closeReject">Cancel</button>
            <button type="button" class="btn btn-danger" :disabled="isRejecting" @click="confirmReject">
              <span v-if="isRejecting" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              Reject
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-scale-enter-active, .fade-scale-leave-active { transition: opacity .18s ease, transform .18s ease; }
.fade-scale-enter-from, .fade-scale-leave-to { opacity: 0; transform: scale(.94); }

.vendor-admin-page { color: #111827; }

.vendor-hero {
  padding: 1.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 10px 30px rgba(15, 23, 42, .05);
}

.vendor-stat-card {
  height: 100%;
  display: flex;
  align-items: center;
  gap: .875rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, .045);
}

.vendor-stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex: 0 0 auto;
}

.vendor-table-card {
  border: 1px solid #e5e7eb;
  box-shadow: 0 12px 34px rgba(15, 23, 42, .055);
}
</style>
