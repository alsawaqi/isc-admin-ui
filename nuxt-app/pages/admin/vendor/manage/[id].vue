<script lang="ts" setup>
import { useNuxtApp, definePageMeta, useRoute, useRouter } from '#imports'
import { ref, reactive, computed, onMounted } from 'vue'
import { useFlashStore } from '~/stores/flashs'

const flash = useFlashStore()

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permission: 'vendors',
})

const { $axios } = useNuxtApp() as any
const route = useRoute()
const router = useRouter()
const id = Number(route.params.id)

interface VendorDoc {
  id: number; Document_Type?: string; Document_Name?: string
  File_Mime?: string | null; File_Size?: number | null; Status?: string | null
}
interface ChecklistItem { key: string; label: string; complete: boolean; required: boolean }

const vendor = ref<any | null>(null)
const isLoading = ref(true)
const saving = ref(false)

const editApproval = ref<'pending' | 'accepted' | 'under_review' | 'approved' | 'rejected'>('pending')
const editStatus = ref<'active' | 'pending' | 'suspended' | 'blocked'>('active')
const editActive = ref(true)

const badgeBase = 'tw:inline-flex tw:items-center tw:rounded-full tw:px-2.5 tw:py-0.5 tw:text-theme-xs tw:font-medium tw:capitalize'
const approvalBadgeClass = (value?: string | null) => {
  if (value === 'approved') return 'tw:bg-success-50 tw:text-success-700'
  if (value === 'rejected') return 'tw:bg-error-50 tw:text-error-700'
  if (value === 'under_review') return 'tw:bg-warning-50 tw:text-warning-700'
  if (value === 'accepted') return 'tw:bg-blue-light-50 tw:text-blue-light-700'
  return 'tw:bg-gray-100 tw:text-gray-700'
}
const statusBadgeClass = (value?: string | null) => {
  if (value === 'active') return 'tw:bg-success-50 tw:text-success-700'
  if (value === 'blocked' || value === 'suspended') return 'tw:bg-error-50 tw:text-error-700'
  if (value === 'pending') return 'tw:bg-warning-50 tw:text-warning-700'
  return 'tw:bg-gray-100 tw:text-gray-700'
}
const docLabels: Record<string, string> = {
  commercial_registration: 'Commercial Registration (CR)',
  chamber_of_commerce: 'Chamber of Commerce',
  activity_license: 'Activity License',
  rent_contract: 'Rent Contract',
}
const docLabel = (type?: string) => docLabels[type || ''] || (type || 'Document')
const formatSize = (b?: number | null) => {
  if (!b || b <= 0) return ''
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

const completeness = computed<number>(() => Number(vendor.value?.onboarding_checklist?.completeness_percent ?? vendor.value?.Onboarding_Completeness ?? 0))
const checklistItems = computed<ChecklistItem[]>(() => vendor.value?.onboarding_checklist?.items || [])

const docUrls = reactive<Record<number, string>>({})
const docBusy = reactive<Record<number, boolean>>({})
const isImage = (m?: string | null) => !!m && m.startsWith('image/')
const isPdf = (m?: string | null) => m === 'application/pdf'

const loadDocUrl = async (docId: number) => {
  docBusy[docId] = true
  try {
    const { data } = await $axios.get(`/api/admin/vendor-documents/${docId}/url`)
    if (data?.url) docUrls[docId] = data.url
  } catch { /* keep unset */ } finally { docBusy[docId] = false }
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
    editApproval.value = (vendor.value?.Approval_Status as any) || 'pending'
    editStatus.value = vendor.value?.Status || 'active'
    editActive.value = !!vendor.value?.Is_Active
    for (const d of (vendor.value?.documents || [])) loadDocUrl(d.id)
  } catch (error: any) {
    flash.error(error?.response?.data?.message || 'Failed to load vendor.')
  } finally {
    isLoading.value = false
  }
}

const saveManage = async () => {
  if (!vendor.value) return
  saving.value = true
  try {
    if (editApproval.value !== (vendor.value.Approval_Status || 'pending')) {
      await $axios.patch(`/api/vendors/${id}/approval`, {
        approval_status: editApproval.value,
        note: editApproval.value === 'approved' ? 'Approved from manage vendors.' : null,
      })
    }
    await $axios.put(`/api/vendors/${id}`, {
      Vendor_Name: vendor.value.Vendor_Name,
      Status: editStatus.value,
      Is_Active: editActive.value,
    })
    flash.success('Vendor updated.')
    router.push('/admin/vendor/manage')
  } catch (error: any) {
    flash.error(error?.response?.data?.message || 'Failed to update vendor.')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="ta tw:min-h-full tw:bg-gray-50 tw:p-4 tw:md:p-6">
    <!-- Header -->
    <div class="tw:mb-6 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3">
      <div class="tw:flex tw:items-center tw:gap-4">
        <span class="tw:flex tw:h-12 tw:w-12 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-xl tw:bg-brand-50 tw:text-brand-600"><iconify-icon icon="solar:shop-linear" class="tw:text-2xl"></iconify-icon></span>
        <div>
          <p class="tw:text-xl tw:font-semibold tw:text-gray-800">{{ vendor?.Vendor_Name || 'Vendor' }}</p>
          <div class="tw:mt-1 tw:flex tw:flex-wrap tw:items-center tw:gap-2">
            <span class="tw:text-theme-sm tw:text-gray-500">{{ vendor?.Vendor_Code || '—' }}</span>
            <span v-if="vendor" :class="[badgeBase, approvalBadgeClass(vendor.Approval_Status)]">{{ (vendor.Approval_Status || 'pending').replace('_', ' ') }}</span>
            <span v-if="vendor" :class="[badgeBase, statusBadgeClass(vendor.Status)]">{{ vendor.Status }}</span>
          </div>
        </div>
      </div>
      <NuxtLink to="/admin/vendor/manage"
        class="tw:inline-flex tw:items-center tw:gap-1.5 tw:rounded-lg tw:bg-white tw:px-4 tw:py-2.5 tw:text-theme-sm tw:font-medium tw:text-gray-700 tw:shadow-theme-xs tw:ring-1 tw:ring-inset tw:ring-gray-300 tw:transition tw:hover:bg-gray-50">
        <iconify-icon icon="solar:arrow-left-linear"></iconify-icon> Back to vendors
      </NuxtLink>
    </div>

    <div v-if="isLoading" class="tw:flex tw:items-center tw:justify-center tw:gap-2 tw:py-16 tw:text-theme-sm tw:text-gray-500">
      <span class="tw:h-5 tw:w-5 tw:animate-spin tw:rounded-full tw:border-2 tw:border-gray-300 tw:border-t-brand-500"></span> Loading…
    </div>

    <div v-else-if="!vendor" class="tw:rounded-2xl tw:border tw:border-gray-200 tw:bg-white tw:p-12 tw:text-center tw:text-theme-sm tw:text-gray-500 tw:shadow-theme-xs">Vendor not found.</div>

    <template v-else>
      <!-- Completion -->
      <div class="tw:mb-6 tw:rounded-2xl tw:border tw:border-gray-200 tw:bg-white tw:p-5 tw:shadow-theme-xs tw:md:p-6" v-if="vendor.onboarding_checklist">
        <div class="tw:mb-2 tw:flex tw:items-center tw:justify-between">
          <p class="tw:text-theme-sm tw:font-semibold tw:text-gray-800">Profile completion</p>
          <p class="tw:text-theme-sm tw:font-semibold tw:text-gray-800">{{ completeness }}%</p>
        </div>
        <div class="tw:mb-4 tw:h-2 tw:overflow-hidden tw:rounded-full tw:bg-gray-100">
          <div class="tw:h-full tw:rounded-full" :class="completeness >= 100 ? 'tw:bg-success-500' : completeness >= 60 ? 'tw:bg-warning-500' : 'tw:bg-error-500'" :style="{ width: completeness + '%' }"></div>
        </div>
        <div class="tw:grid tw:grid-cols-1 tw:gap-2 tw:sm:grid-cols-2 tw:lg:grid-cols-3">
          <div class="tw:flex tw:items-center tw:gap-2" v-for="item in checklistItems" :key="item.key">
            <iconify-icon :icon="item.complete ? 'solar:check-circle-bold' : 'solar:close-circle-linear'" :class="item.complete ? 'tw:text-success-500' : 'tw:text-gray-400'" class="tw:text-lg"></iconify-icon>
            <span class="tw:text-theme-sm" :class="item.complete ? 'tw:text-gray-700' : 'tw:text-gray-400'">{{ item.label }}</span>
            <span v-if="item.required && !item.complete" :class="badgeBase" class="tw:bg-warning-50 tw:text-warning-700 tw:ml-auto">required</span>
          </div>
        </div>
      </div>

      <!-- Info cards -->
      <div class="tw:grid tw:grid-cols-1 tw:gap-4 tw:lg:grid-cols-2">
        <div class="tw:rounded-2xl tw:border tw:border-gray-200 tw:bg-white tw:shadow-theme-xs">
          <div class="tw:border-b tw:border-gray-100 tw:px-5 tw:py-4"><p class="tw:text-base tw:font-semibold tw:text-gray-800">Business profile</p></div>
          <div class="tw:grid tw:grid-cols-1 tw:gap-3 tw:p-5 tw:sm:grid-cols-2">
            <div><p class="tw:text-theme-xs tw:text-gray-500">Company name</p><p class="tw:mt-1 tw:text-theme-sm tw:font-medium tw:text-gray-800">{{ vendor.Vendor_Name || '-' }}</p></div>
            <div><p class="tw:text-theme-xs tw:text-gray-500">Trade name</p><p class="tw:mt-1 tw:text-theme-sm tw:font-medium tw:text-gray-800">{{ vendor.Trade_Name || '-' }}</p></div>
            <div><p class="tw:text-theme-xs tw:text-gray-500">Business type</p><p class="tw:mt-1 tw:text-theme-sm tw:font-medium tw:text-gray-800">{{ vendor.Business_Type || '-' }}</p></div>
            <div><p class="tw:text-theme-xs tw:text-gray-500">CR number</p><p class="tw:mt-1 tw:text-theme-sm tw:font-medium tw:text-gray-800">{{ vendor.CR_Number || '-' }}</p></div>
            <div><p class="tw:text-theme-xs tw:text-gray-500">VAT number</p><p class="tw:mt-1 tw:text-theme-sm tw:font-medium tw:text-gray-800">{{ vendor.VAT_Number || '-' }}</p></div>
          </div>
        </div>

        <div class="tw:rounded-2xl tw:border tw:border-gray-200 tw:bg-white tw:shadow-theme-xs">
          <div class="tw:border-b tw:border-gray-100 tw:px-5 tw:py-4"><p class="tw:text-base tw:font-semibold tw:text-gray-800">Contact</p></div>
          <div class="tw:grid tw:grid-cols-1 tw:gap-3 tw:p-5 tw:sm:grid-cols-2">
            <div><p class="tw:text-theme-xs tw:text-gray-500">Email</p><p class="tw:mt-1 tw:text-theme-sm tw:font-medium tw:text-gray-800">{{ vendor.Email_1 || '-' }}</p></div>
            <div><p class="tw:text-theme-xs tw:text-gray-500">Phone</p><p class="tw:mt-1 tw:text-theme-sm tw:font-medium tw:text-gray-800">{{ vendor.Phone_No || '-' }}</p></div>
            <div><p class="tw:text-theme-xs tw:text-gray-500">Contact person</p><p class="tw:mt-1 tw:text-theme-sm tw:font-medium tw:text-gray-800">{{ vendor.Contact_Person_Name || '-' }}</p></div>
            <div><p class="tw:text-theme-xs tw:text-gray-500">Title</p><p class="tw:mt-1 tw:text-theme-sm tw:font-medium tw:text-gray-800">{{ vendor.Contact_Person_Title || '-' }}</p></div>
            <div><p class="tw:text-theme-xs tw:text-gray-500">Contact email</p><p class="tw:mt-1 tw:text-theme-sm tw:font-medium tw:text-gray-800">{{ vendor.Contact_Person_Email || '-' }}</p></div>
            <div><p class="tw:text-theme-xs tw:text-gray-500">Contact phone</p><p class="tw:mt-1 tw:text-theme-sm tw:font-medium tw:text-gray-800">{{ vendor.Contact_Person_Phone || '-' }}</p></div>
          </div>
        </div>

        <div class="tw:rounded-2xl tw:border tw:border-gray-200 tw:bg-white tw:shadow-theme-xs">
          <div class="tw:border-b tw:border-gray-100 tw:px-5 tw:py-4"><p class="tw:text-base tw:font-semibold tw:text-gray-800">Address</p></div>
          <div class="tw:grid tw:grid-cols-1 tw:gap-3 tw:p-5 tw:sm:grid-cols-2">
            <div class="tw:sm:col-span-2"><p class="tw:text-theme-xs tw:text-gray-500">Address line 1</p><p class="tw:mt-1 tw:text-theme-sm tw:font-medium tw:text-gray-800">{{ vendor.Address_Line1 || '-' }}</p></div>
            <div class="tw:sm:col-span-2"><p class="tw:text-theme-xs tw:text-gray-500">Address line 2</p><p class="tw:mt-1 tw:text-theme-sm tw:font-medium tw:text-gray-800">{{ vendor.Address_Line2 || '-' }}</p></div>
            <div><p class="tw:text-theme-xs tw:text-gray-500">Postal code</p><p class="tw:mt-1 tw:text-theme-sm tw:font-medium tw:text-gray-800">{{ vendor.Postal_Code || '-' }}</p></div>
            <div><p class="tw:text-theme-xs tw:text-gray-500">P.O. Box</p><p class="tw:mt-1 tw:text-theme-sm tw:font-medium tw:text-gray-800">{{ vendor.PO_Box || '-' }}</p></div>
          </div>
        </div>

        <div class="tw:rounded-2xl tw:border tw:border-gray-200 tw:bg-white tw:shadow-theme-xs">
          <div class="tw:border-b tw:border-gray-100 tw:px-5 tw:py-4"><p class="tw:text-base tw:font-semibold tw:text-gray-800">Bank &amp; payout</p></div>
          <div class="tw:grid tw:grid-cols-1 tw:gap-3 tw:p-5 tw:sm:grid-cols-2">
            <div><p class="tw:text-theme-xs tw:text-gray-500">Bank name</p><p class="tw:mt-1 tw:text-theme-sm tw:font-medium tw:text-gray-800">{{ vendor.Bank_Name || '-' }}</p></div>
            <div><p class="tw:text-theme-xs tw:text-gray-500">Account name</p><p class="tw:mt-1 tw:text-theme-sm tw:font-medium tw:text-gray-800">{{ vendor.Bank_Account_Name || '-' }}</p></div>
            <div><p class="tw:text-theme-xs tw:text-gray-500">Account number</p><p class="tw:mt-1 tw:text-theme-sm tw:font-medium tw:text-gray-800">{{ vendor.Bank_Account_Number || '-' }}</p></div>
            <div><p class="tw:text-theme-xs tw:text-gray-500">IBAN</p><p class="tw:mt-1 tw:text-theme-sm tw:font-medium tw:text-gray-800">{{ vendor.Bank_IBAN || '-' }}</p></div>
            <div><p class="tw:text-theme-xs tw:text-gray-500">SWIFT</p><p class="tw:mt-1 tw:text-theme-sm tw:font-medium tw:text-gray-800">{{ vendor.Bank_Swift_Code || '-' }}</p></div>
            <div><p class="tw:text-theme-xs tw:text-gray-500">Payout</p><p class="tw:mt-1 tw:text-theme-sm tw:font-medium tw:text-gray-800">{{ vendor.Payout_Method || '-' }} / {{ vendor.Payout_Status || 'not_configured' }}</p></div>
          </div>
        </div>
      </div>

      <!-- Documents -->
      <div class="tw:mt-6 tw:rounded-2xl tw:border tw:border-gray-200 tw:bg-white tw:shadow-theme-xs">
        <div class="tw:border-b tw:border-gray-100 tw:px-5 tw:py-4"><p class="tw:text-base tw:font-semibold tw:text-gray-800">Uploaded documents</p></div>
        <div class="tw:p-5">
          <p v-if="!vendor.documents || !vendor.documents.length" class="tw:text-theme-sm tw:text-gray-400">No documents uploaded.</p>
          <div v-else class="tw:grid tw:grid-cols-1 tw:gap-4 tw:sm:grid-cols-2 tw:xl:grid-cols-4">
            <div v-for="d in (vendor.documents as VendorDoc[])" :key="d.id" class="tw:rounded-xl tw:border tw:border-gray-200 tw:p-3">
              <div class="tw:mb-2 tw:flex tw:items-start tw:justify-between tw:gap-2">
                <div>
                  <p class="tw:text-theme-xs tw:font-semibold tw:text-gray-800">{{ docLabel(d.Document_Type) }}</p>
                  <p class="tw:text-gray-400" style="font-size:.7rem">{{ d.Document_Name }} <span v-if="formatSize(d.File_Size)">· {{ formatSize(d.File_Size) }}</span></p>
                </div>
                <span v-if="d.Status" :class="[badgeBase, approvalBadgeClass(d.Status)]">{{ (d.Status || '').replace('_', ' ') }}</span>
              </div>
              <div class="tw:mb-2 tw:h-40 tw:overflow-hidden tw:rounded-lg tw:border tw:border-gray-100 tw:bg-gray-50">
                <img v-if="isImage(d.File_Mime) && docUrls[d.id]" :src="docUrls[d.id]" alt="" class="tw:h-full tw:w-full tw:object-cover" />
                <iframe v-else-if="isPdf(d.File_Mime) && docUrls[d.id]" :src="docUrls[d.id]" class="tw:h-full tw:w-full tw:border-0"></iframe>
                <div v-else class="tw:flex tw:h-full tw:flex-col tw:items-center tw:justify-center tw:gap-1 tw:text-gray-400">
                  <iconify-icon icon="solar:document-text-linear" class="tw:text-2xl"></iconify-icon>
                  <span class="tw:text-theme-xs">{{ docBusy[d.id] ? 'Loading…' : 'No inline preview' }}</span>
                </div>
              </div>
              <button type="button" :disabled="docBusy[d.id]" @click="openDocument(d.id)"
                class="tw:inline-flex tw:w-full tw:items-center tw:justify-center tw:gap-1.5 tw:rounded-lg tw:bg-white tw:px-3 tw:py-2 tw:text-theme-xs tw:font-medium tw:text-gray-700 tw:shadow-theme-xs tw:ring-1 tw:ring-inset tw:ring-gray-300 tw:transition tw:hover:bg-gray-50 tw:disabled:opacity-50">
                <iconify-icon icon="solar:eye-linear"></iconify-icon> Open / Download
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Update vendor -->
      <div class="tw:mt-6 tw:rounded-2xl tw:border tw:border-gray-200 tw:bg-white tw:shadow-theme-xs">
        <div class="tw:border-b tw:border-gray-100 tw:px-5 tw:py-4">
          <p class="tw:text-base tw:font-semibold tw:text-gray-800">Update vendor</p>
          <p class="tw:text-theme-xs tw:text-gray-500">Change approval, account status and portal access.</p>
        </div>
        <div class="tw:p-5">
          <div class="tw:grid tw:grid-cols-1 tw:gap-4 tw:sm:grid-cols-3">
            <div>
              <label class="tw:mb-1.5 tw:block tw:text-theme-sm tw:font-medium tw:text-gray-700">Approval</label>
              <select v-model="editApproval" class="tw:h-11 tw:w-full tw:rounded-lg tw:border tw:border-gray-300 tw:bg-white tw:px-4 tw:text-theme-sm tw:text-gray-800 tw:shadow-theme-xs tw:focus:border-brand-300 tw:focus:outline-hidden tw:focus:ring-3 tw:focus:ring-brand-500/10">
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="under_review">Under review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label class="tw:mb-1.5 tw:block tw:text-theme-sm tw:font-medium tw:text-gray-700">Status</label>
              <select v-model="editStatus" class="tw:h-11 tw:w-full tw:rounded-lg tw:border tw:border-gray-300 tw:bg-white tw:px-4 tw:text-theme-sm tw:text-gray-800 tw:shadow-theme-xs tw:focus:border-brand-300 tw:focus:outline-hidden tw:focus:ring-3 tw:focus:ring-brand-500/10">
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <div>
              <label class="tw:mb-1.5 tw:block tw:text-theme-sm tw:font-medium tw:text-gray-700">Portal access</label>
              <label class="tw:flex tw:h-11 tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-lg tw:border tw:border-gray-300 tw:bg-white tw:px-4 tw:shadow-theme-xs">
                <input type="checkbox" v-model="editActive" class="tw:h-4 tw:w-4 tw:rounded tw:border-gray-300 tw:text-brand-500 tw:focus:ring-brand-500/20" />
                <span class="tw:text-theme-sm tw:text-gray-700">{{ editActive ? 'Enabled' : 'Disabled' }}</span>
              </label>
            </div>
          </div>
          <div class="tw:mt-5 tw:flex tw:items-center tw:justify-end tw:gap-3">
            <NuxtLink to="/admin/vendor/manage" class="tw:inline-flex tw:items-center tw:justify-center tw:rounded-lg tw:bg-white tw:px-4 tw:py-2.5 tw:text-theme-sm tw:font-medium tw:text-gray-700 tw:shadow-theme-xs tw:ring-1 tw:ring-inset tw:ring-gray-300 tw:transition tw:hover:bg-gray-50">Cancel</NuxtLink>
            <button type="button" :disabled="saving" @click="saveManage"
              class="tw:inline-flex tw:items-center tw:justify-center tw:gap-2 tw:rounded-lg tw:bg-brand-500 tw:px-4 tw:py-2.5 tw:text-theme-sm tw:font-medium tw:text-white tw:shadow-theme-xs tw:transition tw:hover:bg-brand-600 tw:focus-visible:outline-none tw:focus-visible:ring-3 tw:focus-visible:ring-brand-500/20 tw:disabled:cursor-not-allowed tw:disabled:opacity-50">
              <span v-if="saving" class="tw:h-4 tw:w-4 tw:animate-spin tw:rounded-full tw:border-2 tw:border-white/40 tw:border-t-white"></span>
              Save changes
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
