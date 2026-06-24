<script setup lang="ts">
import { definePageMeta, useNuxtApp } from '#imports'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useFlashStore } from '~/stores/flashs'

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permission: 'vendor requests',
})

const { $axios, $r2Url } = useNuxtApp() as any
const route = useRoute()
const flash = useFlashStore()

const requestId = Number(route.params.id)

interface VendorSummary {
  Vendor_Code?: string | null
  Vendor_Name?: string | null
  Trade_Name?: string | null
}

interface MasterProduct {
  id?: number
  Product_Code?: string | null
  Product_Name?: string | null
  Product_Name_Ar?: string | null
  Product_Description?: string | null
  Product_Price?: number | string | null
  Product_Cost?: number | string | null
  Product_Stock?: number | string | null
  Weight_Kg?: number | string | null
  Length_Cm?: number | string | null
  Width_Cm?: number | string | null
  Height_Cm?: number | string | null
  Volume_Cbm?: number | string | null
  volume_type?: string | null
  [key: string]: any
}

interface FieldChange {
  key: string
  label: string
  current_value: any
  requested_value: any
}

interface SpecChange {
  description_id: number
  value_id: number
  description: string
  value: string
  current_value_id?: number | null
  current_value?: string | null
}

interface ImageChange {
  id?: number
  Image_Path?: string | null
  Image_Type?: string | null
  Image_Size?: number | string | null
  Image_Extension?: string | null
}

interface ImageSummary {
  added_count: number
  removed_count: number
  new_images: ImageChange[]
  remove_image_ids: number[]
  removed_images: ImageChange[]
}

interface UpdateRequestDetail {
  id: number
  Status: string
  Comment?: string | null
  Action_At?: string | null
  Requested_Changes_Json?: Record<string, any> | null
  Requested_Change_Details?: FieldChange[]
  Requested_Specifications_Display?: SpecChange[]
  Image_Update_Summary?: ImageSummary
  vendor?: VendorSummary | null
  master_product?: MasterProduct | null
}

const loading = ref(false)
const actionBusy = ref(false)
const error = ref<string | null>(null)
const detail = ref<UpdateRequestDetail | null>(null)
const approveNote = ref('')
const rejectReason = ref('')
const showReject = ref(false)

const openStatuses = ['requested', 'pending', 'under_review', 'needs_changes']

const isActionable = computed(() =>
  openStatuses.includes(String(detail.value?.Status || '').toLowerCase())
)

const fieldChanges = computed<FieldChange[]>(() => {
  if (detail.value?.Requested_Change_Details?.length) {
    return detail.value.Requested_Change_Details
  }

  const changes = detail.value?.Requested_Changes_Json || {}
  return Object.entries(changes)
    .filter(([key]) => !['specifications', 'image_updates'].includes(key))
    .map(([key, value]) => ({
      key,
      label: key.replace(/_/g, ' '),
      current_value: detail.value?.master_product?.[key],
      requested_value: value,
    }))
})

const specChanges = computed(() => detail.value?.Requested_Specifications_Display || [])

const imageSummary = computed<ImageSummary>(() => detail.value?.Image_Update_Summary || {
  added_count: 0,
  removed_count: 0,
  new_images: [],
  remove_image_ids: [],
  removed_images: [],
})

const totalChangeCount = computed(() =>
  fieldChanges.value.length + specChanges.value.length + imageSummary.value.added_count + imageSummary.value.removed_count
)

const statusBadge = computed(() => {
  const status = String(detail.value?.Status || '').toLowerCase()
  if (status === 'approved') return 'bg-success'
  if (status === 'rejected') return 'bg-danger'
  if (openStatuses.includes(status)) return 'bg-warning text-dark'
  return 'bg-secondary'
})

function displayValue(value: any) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(3)
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function dateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-'
}

function imageUrl(path?: string | null) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path

  const base = String($r2Url || '').replace(/\/$/, '')
  return base ? `${base}/${String(path).replace(/^\//, '')}` : path
}

async function fetchDetail() {
  loading.value = true
  error.value = null

  try {
    const { data } = await $axios.get(`/api/admin/product-update-requests/${requestId}`)
    detail.value = data.data
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Failed to load product update request.'
  } finally {
    loading.value = false
  }
}

async function approveRequest() {
  if (!detail.value || !isActionable.value) return

  const ok = await flash.confirm({
    title: 'Approve product update?',
    message: `Apply these changes to "${detail.value.master_product?.Product_Name || 'this product'}"?`,
    confirmText: 'Approve and apply',
    cancelText: 'Cancel',
  })
  if (!ok) return

  actionBusy.value = true
  try {
    await $axios.post(`/api/admin/product-update-requests/${requestId}/approve`, {
      note: approveNote.value.trim() || null,
    })
    flash.success('Vendor product update approved and applied.')
    approveNote.value = ''
    await fetchDetail()
  } catch (e: any) {
    flash.error(e?.response?.data?.message || 'Failed to approve update request.')
  } finally {
    actionBusy.value = false
  }
}

async function rejectRequest() {
  if (!detail.value || !isActionable.value) return

  if (rejectReason.value.trim().length < 3) {
    flash.warning('Please write a rejection reason.')
    return
  }

  actionBusy.value = true
  try {
    await $axios.post(`/api/admin/product-update-requests/${requestId}/reject`, {
      reason: rejectReason.value.trim(),
    })
    flash.success('Vendor product update rejected.')
    showReject.value = false
    rejectReason.value = ''
    await fetchDetail()
  } catch (e: any) {
    flash.error(e?.response?.data?.message || 'Failed to reject update request.')
  } finally {
    actionBusy.value = false
  }
}

onMounted(fetchDetail)
</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <div>
        <h6 class="fw-semibold mb-1" style="color:#ef4444">
          Product Update Review #{{ requestId }}
        </h6>
        <div class="text-muted small">
          Review requested changes before applying them to the live product.
        </div>
      </div>

      <NuxtLink to="/admin/products-temp" class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1">
        <iconify-icon icon="solar:arrow-left-linear" />
        Back to Product Requests
      </NuxtLink>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="loading" class="alert alert-info">Loading update request...</div>

    <div v-if="detail" class="row g-3">
      <div class="col-12 col-xl-8">
        <div class="card radius-12 overflow-hidden h-100">
          <div class="card-header d-flex flex-wrap align-items-start justify-content-between gap-3">
            <div>
              <div class="fw-semibold fs-6">{{ detail.master_product?.Product_Name || '-' }}</div>
              <div class="text-muted small font-monospace">{{ detail.master_product?.Product_Code || '-' }}</div>
            </div>
            <span class="badge rounded-pill" :class="statusBadge">
              {{ detail.Status }}
            </span>
          </div>

          <div class="card-body">
            <div class="row g-3">
              <div class="col-12 col-md-6">
                <div class="text-muted small">Vendor</div>
                <div class="fw-semibold">{{ detail.vendor?.Vendor_Name || '-' }}</div>
                <div class="text-muted small font-monospace">{{ detail.vendor?.Vendor_Code || '-' }}</div>
                <div v-if="detail.vendor?.Trade_Name" class="text-muted small">{{ detail.vendor.Trade_Name }}</div>
              </div>

              <div class="col-6 col-md-3">
                <div class="text-muted small">Current Price</div>
                <div class="fw-semibold">{{ displayValue(detail.master_product?.Product_Price) }}</div>
              </div>

              <div class="col-6 col-md-3">
                <div class="text-muted small">Current Stock</div>
                <div class="fw-semibold">{{ displayValue(detail.master_product?.Product_Stock) }}</div>
              </div>

              <div class="col-12 col-md-4">
                <div class="text-muted small">Requested At</div>
                <div class="fw-semibold">{{ dateTime(detail.Action_At) }}</div>
              </div>

              <div class="col-12 col-md-4">
                <div class="text-muted small">Total Changes</div>
                <div class="fw-semibold">{{ totalChangeCount }}</div>
              </div>

              <div class="col-12 col-md-4">
                <div class="text-muted small">Live Product ID</div>
                <div class="fw-semibold font-monospace">#{{ detail.master_product?.id || '-' }}</div>
              </div>

              <div v-if="detail.Comment" class="col-12">
                <div class="border rounded-3 p-3 bg-light">
                  <div class="text-muted small mb-1">Latest admin/vendor note</div>
                  <div>{{ detail.Comment }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-xl-4">
        <div class="card radius-12 overflow-hidden h-100">
          <div class="card-header">
            <div class="fw-semibold">Admin Decision</div>
            <div class="text-muted small">Approval applies the requested changes to the live product.</div>
          </div>
          <div class="card-body">
            <label class="form-label fw-semibold small">Approval note</label>
            <textarea
              v-model="approveNote"
              rows="4"
              class="form-control"
              :disabled="!isActionable || actionBusy"
              placeholder="Optional note for this approval..."
            />

            <div class="d-flex flex-wrap gap-2 mt-16">
              <button
                class="btn btn-success d-inline-flex align-items-center gap-1"
                :disabled="!isActionable || actionBusy"
                @click="approveRequest"
              >
                <iconify-icon icon="solar:check-circle-linear" />
                {{ actionBusy ? 'Processing...' : 'Approve and Apply' }}
              </button>

              <button
                class="btn btn-outline-danger d-inline-flex align-items-center gap-1"
                :disabled="!isActionable || actionBusy"
                @click="showReject = true"
              >
                <iconify-icon icon="solar:close-circle-linear" />
                Reject
              </button>
            </div>

            <div v-if="!isActionable" class="alert alert-secondary mt-16 mb-0 small">
              This request has already been finalized.
            </div>
          </div>
        </div>
      </div>

      <div class="col-12">
        <div class="card radius-12 overflow-hidden">
          <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div>
              <div class="fw-semibold">Requested Field Changes</div>
              <div class="text-muted small">Compare current live values with the values submitted by the vendor.</div>
            </div>
            <span class="badge bg-primary">{{ fieldChanges.length }} field(s)</span>
          </div>

          <div class="card-body">
            <div v-if="fieldChanges.length" class="table-responsive rounded-3 border">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th style="width: 16rem;">Field</th>
                    <th>Current Live Value</th>
                    <th>Requested Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="change in fieldChanges" :key="change.key">
                    <td class="fw-semibold">{{ change.label }}</td>
                    <td class="text-muted text-break">{{ displayValue(change.current_value) }}</td>
                    <td class="fw-semibold text-break">{{ displayValue(change.requested_value) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-else class="text-muted small py-3">
              No basic product fields were changed.
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-xl-6">
        <div class="card radius-12 overflow-hidden h-100">
          <div class="card-header d-flex align-items-center justify-content-between">
            <div class="fw-semibold">Specification Changes</div>
            <span class="badge bg-info">{{ specChanges.length }} item(s)</span>
          </div>

          <div class="card-body">
            <div v-if="specChanges.length" class="d-grid gap-2">
              <div v-for="spec in specChanges" :key="`${spec.description_id}-${spec.value_id}`" class="border rounded-3 p-3">
                <div class="fw-semibold">{{ spec.description }}</div>
                <div class="row g-2 mt-1">
                  <div class="col-12 col-md-6">
                    <div class="text-muted small">Current</div>
                    <div>{{ spec.current_value || '-' }}</div>
                  </div>
                  <div class="col-12 col-md-6">
                    <div class="text-muted small">Requested</div>
                    <div class="fw-semibold">{{ spec.value }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="text-muted small py-3">
              No specification updates were submitted.
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-xl-6">
        <div class="card radius-12 overflow-hidden h-100">
          <div class="card-header d-flex align-items-center justify-content-between">
            <div class="fw-semibold">Image Changes</div>
            <span class="badge bg-warning text-dark">
              {{ imageSummary.added_count }} added, {{ imageSummary.removed_count }} removed
            </span>
          </div>

          <div class="card-body">
            <div v-if="imageSummary.added_count || imageSummary.removed_count" class="row g-3">
              <div v-if="imageSummary.new_images.length" class="col-12">
                <div class="fw-semibold mb-2">Images to Add</div>
                <div class="row g-2">
                  <div v-for="(img, idx) in imageSummary.new_images" :key="`new-${idx}`" class="col-6 col-md-4">
                    <img
                      v-if="img.Image_Path"
                      :src="imageUrl(img.Image_Path)"
                      class="w-100 rounded-3 border"
                      style="height: 96px; object-fit: cover;"
                      alt="Requested new product image"
                    />
                    <div class="small text-muted text-break mt-1">{{ img.Image_Path || '-' }}</div>
                  </div>
                </div>
              </div>

              <div v-if="imageSummary.removed_images.length || imageSummary.remove_image_ids.length" class="col-12">
                <div class="fw-semibold mb-2">Images to Remove</div>
                <div v-if="imageSummary.removed_images.length" class="row g-2">
                  <div v-for="img in imageSummary.removed_images" :key="`remove-${img.id}`" class="col-6 col-md-4">
                    <img
                      v-if="img.Image_Path"
                      :src="imageUrl(img.Image_Path)"
                      class="w-100 rounded-3 border opacity-75"
                      style="height: 96px; object-fit: cover;"
                      alt="Product image marked for removal"
                    />
                    <div class="small text-muted font-monospace mt-1">#{{ img.id }}</div>
                  </div>
                </div>
                <div v-else class="small text-muted">
                  Image IDs: {{ imageSummary.remove_image_ids.join(', ') }}
                </div>
              </div>
            </div>

            <div v-else class="text-muted small py-3">
              No image changes were submitted.
            </div>
          </div>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div
        v-if="showReject"
        class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
        style="background: rgba(15, 23, 42, 0.55); z-index: 2050;"
      >
        <div class="bg-white radius-12 shadow-lg p-24" style="width: min(520px, calc(100vw - 2rem));">
          <div class="d-flex align-items-start justify-content-between gap-3 mb-16">
            <div>
              <h6 class="fw-semibold mb-1">Reject Product Update</h6>
              <div class="text-muted small">{{ detail?.master_product?.Product_Name || 'Product update' }}</div>
            </div>
            <button type="button" class="btn-close" :disabled="actionBusy" @click="showReject = false" />
          </div>

          <label class="form-label text-sm fw-semibold">Reason for vendor</label>
          <textarea
            v-model="rejectReason"
            rows="4"
            class="form-control"
            placeholder="Explain why this product update cannot be accepted..."
          />

          <div class="d-flex justify-content-end gap-2 mt-16">
            <button class="btn btn-outline-secondary" :disabled="actionBusy" @click="showReject = false">
              Cancel
            </button>
            <button class="btn btn-danger" :disabled="actionBusy" @click="rejectRequest">
              {{ actionBusy ? 'Rejecting...' : 'Reject Request' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
