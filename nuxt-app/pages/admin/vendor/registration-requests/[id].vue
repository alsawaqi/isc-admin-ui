<script lang="ts" setup>
import { useNuxtApp, definePageMeta, useRoute, useRouter } from '#imports'
import { ref, reactive, computed, onMounted } from 'vue'
import { useFlashStore } from '~/stores/flashs'

const flash = useFlashStore()

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permission: 'vendor registration requests',
})

const { $axios } = useNuxtApp() as any
const route = useRoute()
const router = useRouter()
const id = Number(route.params.id)

interface VendorDoc {
  id: number
  Document_Type?: string
  Document_Name?: string
  File_Mime?: string | null
  File_Size?: number | null
  Status?: string | null
  Review_Note?: string | null
}
interface ChecklistItem { key: string; label: string; complete: boolean; required: boolean; missing?: boolean }

const vendor = ref<any | null>(null)
const isLoading = ref(true)
const acting = ref(false)

// reject modal
const showReject = ref(false)
const rejectNote = ref('')
const isRejecting = ref(false)

const approvalBadgeClass = (value?: string | null) => {
  if (value === 'approved') return 'bg-success'
  if (value === 'rejected') return 'bg-danger'
  if (value === 'under_review') return 'bg-warning text-dark'
  if (value === 'accepted') return 'bg-info text-dark'
  return 'bg-secondary'
}
const formatDate = (value?: string | null) => {
  if (!value) return '-'
  const d = new Date(value)
  return isNaN(d.getTime()) ? value : d.toLocaleString()
}
const formatSize = (b?: number | null) => {
  if (!b || b <= 0) return ''
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

const docLabels: Record<string, string> = {
  commercial_registration: 'Commercial Registration (CR)',
  chamber_of_commerce: 'Chamber of Commerce',
  activity_license: 'Activity License',
  rent_contract: 'Rent Contract',
}
const docLabel = (type?: string) => docLabels[type || ''] || (type || 'Document')

const status = computed<string>(() => String(vendor.value?.Approval_Status || 'pending'))
const checklist = computed(() => vendor.value?.onboarding_checklist || null)
const completeness = computed<number>(() => Number(checklist.value?.completeness_percent ?? vendor.value?.Onboarding_Completeness ?? 0))
const checklistItems = computed<ChecklistItem[]>(() => checklist.value?.items || [])

const canAccept = computed(() => status.value === 'pending')
const canApprove = computed(() => status.value === 'under_review')
const canReject = computed(() => ['pending', 'accepted', 'under_review'].includes(status.value))

// document preview URLs (presigned, fetched on load)
const docUrls = reactive<Record<number, string>>({})
const docBusy = reactive<Record<number, boolean>>({})
const isImage = (m?: string | null) => !!m && m.startsWith('image/')
const isPdf = (m?: string | null) => m === 'application/pdf'

const loadDocUrl = async (docId: number) => {
  docBusy[docId] = true
  try {
    const { data } = await $axios.get(`/api/admin/vendor-documents/${docId}/url`)
    if (data?.url) docUrls[docId] = data.url
  } catch {
    // leave unset; user can use the Open button which retries
  } finally {
    docBusy[docId] = false
  }
}
const openDocument = async (docId: number) => {
  if (!docUrls[docId]) await loadDocUrl(docId)
  if (docUrls[docId]) window.open(docUrls[docId], '_blank', 'noopener')
  else flash.error('Document URL unavailable.')
}

const load = async () => {
  isLoading.value = true
  try {
    const { data } = await $axios.get(`/api/vendors/${id}`)
    vendor.value = data.data
    for (const d of (vendor.value?.documents || [])) loadDocUrl(d.id)
  } catch (error: any) {
    flash.error(error?.response?.data?.message || 'Failed to load vendor.')
  } finally {
    isLoading.value = false
  }
}

const backToList = () => router.push('/admin/vendor/registration-requests')

const accept = async () => {
  const ok = await flash.confirm({
    title: 'Accept registration?',
    message: `Accept "${vendor.value?.Vendor_Name}"? They'll be able to log in and complete their full profile.`,
    confirmText: 'Yes, accept', cancelText: 'Cancel',
  })
  if (!ok) return
  acting.value = true
  try {
    await $axios.patch(`/api/vendors/${id}/approval`, { approval_status: 'accepted', note: 'Accepted from registration request.' })
    flash.success(`${vendor.value?.Vendor_Name} accepted — they can now log in and complete their profile.`)
    backToList()
  } catch (error: any) {
    flash.error(error?.response?.data?.message || 'Failed to accept registration.')
  } finally {
    acting.value = false
  }
}

const approve = async () => {
  const ok = await flash.confirm({
    title: 'Approve vendor?',
    message: `Approve "${vendor.value?.Vendor_Name}"? They will get full access to add products.`,
    confirmText: 'Yes, approve', cancelText: 'Cancel',
  })
  if (!ok) return
  acting.value = true
  try {
    await $axios.patch(`/api/vendors/${id}/approval`, { approval_status: 'approved', note: 'Approved from registration request.' })
    flash.success(`${vendor.value?.Vendor_Name} approved.`)
    backToList()
  } catch (error: any) {
    flash.error(error?.response?.data?.message || 'Failed to approve vendor.')
  } finally {
    acting.value = false
  }
}

const confirmReject = async () => {
  isRejecting.value = true
  try {
    await $axios.patch(`/api/vendors/${id}/approval`, { approval_status: 'rejected', note: rejectNote.value || null })
    flash.success(`${vendor.value?.Vendor_Name} rejected.`)
    backToList()
  } catch (error: any) {
    flash.error(error?.response?.data?.message || 'Failed to reject vendor.')
  } finally {
    isRejecting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="dashboard-main-body vendor-admin-page">
    <!-- Header -->
    <div class="vendor-hero d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <div class="d-flex align-items-center gap-3">
        <span class="vendor-stat-icon bg-primary-50 text-primary-600"><iconify-icon icon="solar:shop-2-linear" /></span>
        <div>
          <h5 class="fw-semibold mb-1">{{ vendor?.Vendor_Name || 'Vendor request' }}</h5>
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <span class="text-muted small font-monospace">{{ vendor?.Vendor_Code || '—' }}</span>
            <span class="badge" :class="approvalBadgeClass(status)">{{ status }}</span>
          </div>
        </div>
      </div>
      <NuxtLink to="/admin/vendor/registration-requests" class="btn btn-sm btn-outline-secondary">
        <iconify-icon icon="solar:arrow-left-linear" class="me-1" /> Back to requests
      </NuxtLink>
    </div>

    <div v-if="isLoading" class="text-center py-48">
      <div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div>
    </div>

    <div v-else-if="!vendor" class="card vendor-table-card">
      <div class="card-body text-center text-muted py-48">Vendor request not found.</div>
    </div>

    <template v-else>
      <!-- Onboarding completion -->
      <div class="card vendor-table-card mb-24" v-if="checklist">
        <div class="card-body">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
            <div class="fw-semibold">Profile completion</div>
            <div class="fw-semibold">{{ completeness }}%</div>
          </div>
          <div class="progress mb-3" style="height: 10px;">
            <div class="progress-bar" :class="completeness >= 100 ? 'bg-success' : completeness >= 60 ? 'bg-warning' : 'bg-danger'"
                 role="progressbar" :style="{ width: completeness + '%' }"></div>
          </div>
          <div class="row g-2">
            <div class="col-md-6 col-lg-4" v-for="item in checklistItems" :key="item.key">
              <div class="d-flex align-items-center gap-2">
                <iconify-icon :icon="item.complete ? 'solar:check-circle-bold' : 'solar:close-circle-linear'"
                              :class="item.complete ? 'text-success' : 'text-muted'" class="text-lg" />
                <span :class="item.complete ? '' : 'text-muted'">{{ item.label }}</span>
                <span v-if="item.required && !item.complete" class="badge bg-warning text-dark ms-auto">required</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3">
        <!-- Business / Tax -->
        <div class="col-lg-6">
          <div class="card vendor-table-card h-100">
            <div class="card-header"><div class="fw-semibold">Business profile</div></div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-md-6"><div class="text-muted small">Company name</div><div class="fw-medium">{{ vendor.Vendor_Name || '-' }}</div></div>
                <div class="col-md-6"><div class="text-muted small">Trade name</div><div class="fw-medium">{{ vendor.Trade_Name || '-' }}</div></div>
                <div class="col-md-6"><div class="text-muted small">Business type</div><div class="fw-medium">{{ vendor.Business_Type || '-' }}</div></div>
                <div class="col-md-6"><div class="text-muted small">CR number</div><div class="fw-medium">{{ vendor.CR_Number || '-' }}</div></div>
                <div class="col-md-6"><div class="text-muted small">VAT number</div><div class="fw-medium">{{ vendor.VAT_Number || '-' }}</div></div>
                <div class="col-md-6"><div class="text-muted small">Submitted</div><div class="fw-medium">{{ formatDate(vendor.Submitted_For_Approval_At) }}</div></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Contact -->
        <div class="col-lg-6">
          <div class="card vendor-table-card h-100">
            <div class="card-header"><div class="fw-semibold">Contact</div></div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-md-6"><div class="text-muted small">Email</div><div class="fw-medium">{{ vendor.Email_1 || '-' }}</div></div>
                <div class="col-md-6"><div class="text-muted small">Phone</div><div class="fw-medium">{{ vendor.Phone_No || '-' }}</div></div>
                <div class="col-md-6"><div class="text-muted small">Contact person</div><div class="fw-medium">{{ vendor.Contact_Person_Name || '-' }}</div></div>
                <div class="col-md-6"><div class="text-muted small">Title</div><div class="fw-medium">{{ vendor.Contact_Person_Title || '-' }}</div></div>
                <div class="col-md-6"><div class="text-muted small">Contact email</div><div class="fw-medium">{{ vendor.Contact_Person_Email || '-' }}</div></div>
                <div class="col-md-6"><div class="text-muted small">Contact phone</div><div class="fw-medium">{{ vendor.Contact_Person_Phone || '-' }}</div></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Address -->
        <div class="col-lg-6">
          <div class="card vendor-table-card h-100">
            <div class="card-header"><div class="fw-semibold">Address</div></div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-md-12"><div class="text-muted small">Address line 1</div><div class="fw-medium">{{ vendor.Address_Line1 || '-' }}</div></div>
                <div class="col-md-12"><div class="text-muted small">Address line 2</div><div class="fw-medium">{{ vendor.Address_Line2 || '-' }}</div></div>
                <div class="col-md-6"><div class="text-muted small">Postal code</div><div class="fw-medium">{{ vendor.Postal_Code || '-' }}</div></div>
                <div class="col-md-6"><div class="text-muted small">P.O. Box</div><div class="fw-medium">{{ vendor.PO_Box || '-' }}</div></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bank / Payout -->
        <div class="col-lg-6">
          <div class="card vendor-table-card h-100">
            <div class="card-header"><div class="fw-semibold">Bank &amp; payout</div></div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-md-6"><div class="text-muted small">Bank name</div><div class="fw-medium">{{ vendor.Bank_Name || '-' }}</div></div>
                <div class="col-md-6"><div class="text-muted small">Account name</div><div class="fw-medium">{{ vendor.Bank_Account_Name || '-' }}</div></div>
                <div class="col-md-6"><div class="text-muted small">Account number</div><div class="fw-medium">{{ vendor.Bank_Account_Number || '-' }}</div></div>
                <div class="col-md-6"><div class="text-muted small">IBAN</div><div class="fw-medium">{{ vendor.Bank_IBAN || '-' }}</div></div>
                <div class="col-md-6"><div class="text-muted small">SWIFT</div><div class="fw-medium">{{ vendor.Bank_Swift_Code || '-' }}</div></div>
                <div class="col-md-6"><div class="text-muted small">Payout</div><div class="fw-medium">{{ vendor.Payout_Method || '-' }} / {{ vendor.Payout_Status || 'not_configured' }}</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Documents with inline preview -->
      <div class="card vendor-table-card mt-24">
        <div class="card-header"><div class="fw-semibold">Uploaded documents</div></div>
        <div class="card-body">
          <div v-if="!vendor.documents || !vendor.documents.length" class="text-muted">No documents uploaded.</div>
          <div v-else class="row g-3">
            <div class="col-md-6 col-xl-3" v-for="d in (vendor.documents as VendorDoc[])" :key="d.id">
              <div class="doc-card">
                <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
                  <div>
                    <div class="fw-semibold small">{{ docLabel(d.Document_Type) }}</div>
                    <div class="text-muted" style="font-size:.72rem">{{ d.Document_Name }} <span v-if="formatSize(d.File_Size)">· {{ formatSize(d.File_Size) }}</span></div>
                  </div>
                  <span v-if="d.Status" class="badge" :class="approvalBadgeClass(d.Status)">{{ d.Status }}</span>
                </div>

                <div class="doc-preview mb-2">
                  <img v-if="isImage(d.File_Mime) && docUrls[d.id]" :src="docUrls[d.id]" alt="" />
                  <iframe v-else-if="isPdf(d.File_Mime) && docUrls[d.id]" :src="docUrls[d.id]"></iframe>
                  <div v-else class="doc-preview-fallback">
                    <iconify-icon icon="solar:document-text-linear" class="text-xl" />
                    <span v-if="docBusy[d.id]" class="small text-muted">Loading…</span>
                    <span v-else class="small text-muted">No inline preview</span>
                  </div>
                </div>

                <button type="button" class="btn btn-sm btn-outline-primary w-100" :disabled="docBusy[d.id]" @click="openDocument(d.id)">
                  <iconify-icon icon="solar:eye-linear" class="me-1" /> Open / Download
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action bar -->
      <div class="card vendor-table-card mt-24" v-if="canAccept || canApprove || canReject">
        <div class="card-body d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div class="text-muted small">
            <template v-if="canAccept">Accept to let this vendor log in and complete their full profile.</template>
            <template v-else-if="canApprove">This vendor submitted their completed profile. Approve to grant full access to add products.</template>
            <template v-else>Awaiting the vendor to complete and submit their profile.</template>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <button v-if="canReject" type="button" class="btn btn-outline-danger" :disabled="acting" @click="showReject = true">Reject</button>
            <button v-if="canAccept" type="button" class="btn btn-success" :disabled="acting" @click="accept">
              <span v-if="acting" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Accept
            </button>
            <button v-if="canApprove" type="button" class="btn btn-success" :disabled="acting" @click="approve">
              <span v-if="acting" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Approve
            </button>
          </div>
        </div>
      </div>

      <div v-if="vendor.Approval_Note" class="alert alert-light border mt-16 mb-0"><strong>Note:</strong> {{ vendor.Approval_Note }}</div>
    </template>

    <!-- REJECT MODAL -->
    <transition name="fade-scale" appear>
      <div v-if="showReject" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
        style="background: rgba(0,0,0,0.5); z-index:1050;">
        <div class="bg-white radius-12 shadow p-24" style="min-width: 320px; max-width: 480px; width: 100%;">
          <div class="d-flex justify-content-between align-items-start mb-16">
            <div>
              <h5 class="fw-semibold mb-4">Reject registration</h5>
              <small class="text-muted d-block">{{ vendor?.Vendor_Name }}</small>
            </div>
            <button type="button" class="btn-close" aria-label="Close" @click="showReject = false"></button>
          </div>
          <div class="mb-3">
            <label class="form-label fw-semibold text-sm">Reason (optional)</label>
            <textarea v-model="rejectNote" rows="3" class="form-control radius-8" placeholder="Let the vendor know why (stored on the record)."></textarea>
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-outline-secondary" @click="showReject = false">Cancel</button>
            <button type="button" class="btn btn-danger" :disabled="isRejecting" @click="confirmReject">
              <span v-if="isRejecting" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Reject
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
  padding: 1.25rem; border: 1px solid #e5e7eb; border-radius: 12px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 10px 30px rgba(15, 23, 42, .05);
}
.vendor-stat-icon {
  width: 44px; height: 44px; border-radius: 50%; display: inline-flex;
  align-items: center; justify-content: center; font-size: 1.25rem; flex: 0 0 auto;
}
.vendor-table-card { border: 1px solid #e5e7eb; box-shadow: 0 12px 34px rgba(15, 23, 42, .055); }

.doc-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: .75rem; height: 100%; background: #fff; }
.doc-preview { height: 160px; border: 1px solid #eef2f7; border-radius: 8px; overflow: hidden; background: #f8fafc; }
.doc-preview img { width: 100%; height: 100%; object-fit: cover; }
.doc-preview iframe { width: 100%; height: 100%; border: 0; }
.doc-preview-fallback { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .25rem; color: #94a3b8; }
</style>
