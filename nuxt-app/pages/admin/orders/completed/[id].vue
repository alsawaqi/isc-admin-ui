<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { definePageMeta, useNuxtApp, useRoute } from '#imports'
import SignaturePad from '~/components/SignaturePad.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permission: 'order delivery',
})

const { $axios, $r2Url } = (useNuxtApp() as any)
const route = useRoute()

const orderId = computed(() => String(route.params.id || ''))

const order = ref<any>(null)
const customer = ref<any>(null)
const shipper = ref<any>(null)
const location = ref<any>(null)
const details = ref<any[]>([])
const vendorOrders = ref<any[]>([])
const transaction = ref<any>(null)
const packagesByDetail = ref<Record<number, any[]>>({})
const logs = ref<any[]>([])

const loading = ref(false)
const errorMsg = ref<string | null>(null)
const actionMsg = ref<string | null>(null)
const actionError = ref<string | null>(null)

const selected = ref<number[]>([])

const showHold = ref(false)
const showRelease = ref(false)
const showCancel = ref(false)
const showReturnRefund = ref(false)
const holdNote = ref('')
const releaseNote = ref('')
const cancelNote = ref('')
const returnRefundNote = ref('')
const holding = ref(false)
const releasing = ref(false)
const cancelling = ref(false)
const returningRefunding = ref(false)
const sigCancelRef = ref<InstanceType<typeof SignaturePad> | null>(null)
const sigReturnRefundRef = ref<InstanceType<typeof SignaturePad> | null>(null)
const returnRefundLines = ref<Record<number, { quantity: number; refund_amount: number; restock: boolean; reason: string }>>({})

const selectableDetails = computed(() => details.value.filter((line) => line.Status !== 'cancelled'))
const selectedDetails = computed(() => details.value.filter((line) => selected.value.includes(line.id)))
const selectedHeldDetails = computed(() => selectedDetails.value.filter((line) => line.Status === 'on-hold'))
const selectedHoldableDetails = computed(() => selectedDetails.value.filter((line) => !['cancelled', 'on-hold'].includes(line.Status)))
const selectedReturnRefundDetails = computed(() => selectedDetails.value.filter((line) => {
  return line.Status !== 'cancelled' && (remainingReturnQty(line) > 0 || remainingRefundAmount(line) > 0)
}))

const allVisibleSelected = computed({
  get: () => selectableDetails.value.length > 0 && selectableDetails.value.every((line) => selected.value.includes(line.id)),
  set: (checked: boolean) => {
    selected.value = checked ? selectableDetails.value.map((line) => line.id) : []
  },
})

const paymentLines = computed(() => transaction.value?.details || [])
const paymentTotal = computed(() => paymentLines.value.reduce((sum: number, line: any) => sum + Number(line.Payment_Amount || 0), 0))
const adjustmentHistory = computed(() => {
  return details.value.flatMap((line: any) => {
    return (line.adjustments || []).map((adjustment: any) => ({
      ...adjustment,
      line,
    }))
  }).sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
})
const productDiscountTotal = computed(() => Number(order.value?.Product_Discount_Amount || 0))
const loyaltyDiscount = computed(() => Number(order.value?.Loyalty_Discount_Amount || 0))
const loyaltyPoints = computed(() => Number(order.value?.Loyalty_Points_Redeemed || 0))
const shippingPrice = computed(() => Number(order.value?.Shipping_Price || 0))
const vatAmount = computed(() => Number(order.value?.VAT || order.value?.Tax || 0))
const subtotal = computed(() => Number(order.value?.Sub_Total_Price || 0))
const originalSubtotal = computed(() => Number(order.value?.Original_Sub_Total_Price || subtotal.value + productDiscountTotal.value))
const grandTotal = computed(() => Number(order.value?.Total_Price || 0))
const refundedTotal = computed(() => details.value.reduce((sum, line) => sum + lineRefundedAmount(line), 0))
const netProductTotal = computed(() => details.value.reduce((sum, line) => sum + lineNetAmount(line), 0))

const deliveryTypeLabel = computed(() => {
  if (order.value?.Delivery_Type === 'pickup') return 'Local pickup'
  if (order.value?.Delivery_Type === 'ship') return 'Ship to address'
  return order.value?.Delivery_Type || '-'
})

const fulfillmentName = computed(() => {
  if (order.value?.Delivery_Type === 'pickup') {
    return location.value?.Location_Name || location.value?.Location_Name_Ar || '-'
  }

  return shipper.value?.Shippers_Name || '-'
})

const lineStatusCounts = computed(() => {
  return details.value.reduce((acc: Record<string, number>, line) => {
    const key = line.Status || 'unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
})

const primaryPayment = computed(() => {
  const first = paymentLines.value[0]
  if (!first) return null
  return first
})

async function load() {
  loading.value = true
  errorMsg.value = null
  actionError.value = null

  try {
    const { data } = await $axios.get(`/api/orders-placed/${orderId.value}/overview`)
    order.value = data.order
    customer.value = data.customer_contact
    shipper.value = data.shipper
    location.value = data.location
    details.value = data.details || []
    vendorOrders.value = data.vendor_orders || []
    transaction.value = data.transaction || null
    packagesByDetail.value = data.packages_by_detail || {}
    logs.value = data.logs || []
    selected.value = selected.value.filter((id) => details.value.some((line) => line.id === id && line.Status !== 'cancelled'))
  } catch (error: any) {
    errorMsg.value = error?.response?.data?.message || error?.message || 'Failed to load the completed order.'
  } finally {
    loading.value = false
  }
}

function money(value?: number | string | null) {
  return `OMR ${Number(value || 0).toFixed(3)}`
}

function fmt(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-'
}

function mediaUrl(path?: string | null) {
  if (!path) return ''
  const value = String(path)
  if (/^https?:\/\//i.test(value)) return value
  return `${String($r2Url || '').replace(/\/$/, '')}/${value.replace(/^\//, '')}`
}

function lineVendorName(line: any) {
  return line.product?.vendor?.Vendor_Name || line.product?.vendor?.Vendor_Company_Name || line.product?.Vendor_Name || 'ISC'
}

function lineSku(line: any) {
  return line.product?.Product_Code || line.product?.Product_Master_Code || line.product?.SKU || '-'
}

function categoryTrail(line: any) {
  const product = line.product || {}
  const department = product.department
  const subDepartment = product.subDepartment || product.sub_department
  const subSubDepartment = product.subSubDepartment || product.sub_sub_department

  const parts = [
    department?.Product_Department_Name || department?.Product_Department_Name_En,
    subDepartment?.Product_Sub_Department_Name || subDepartment?.Product_Sub_Department_Name_En,
    subSubDepartment?.Product_Sub_Sub_Department_Name || subSubDepartment?.Product_Sub_Sub_Department_Name_En,
  ].filter(Boolean)

  return parts.length ? parts.join(' / ') : '-'
}

function lineSubtotal(line: any) {
  return Number(line.Subtotal || Number(line.Price || 0) * Number(line.Quantity || 0))
}

function lineSoldAmount(line: any) {
  return Number(line.Sold_Amount || lineSubtotal(line))
}

function lineReturnedQty(line: any) {
  return Number(line.Returned_Quantity || 0)
}

function lineRefundedAmount(line: any) {
  return Number(line.Refunded_Amount || 0)
}

function lineNetAmount(line: any) {
  return Number(line.Net_Amount || Math.max(lineSoldAmount(line) - lineRefundedAmount(line), 0))
}

function remainingReturnQty(line: any) {
  return Math.max(Number(line.Quantity || 0) - lineReturnedQty(line), 0)
}

function remainingRefundAmount(line: any) {
  return Math.max(lineSoldAmount(line) - lineRefundedAmount(line), 0)
}

function lineDiscount(line: any) {
  return Number(line.Line_Discount_Amount || 0)
}

function productImage(line: any) {
  return mediaUrl(line.product?.Product_Image || line.product?.Image_Path || line.product?.Default_Image)
}

function statusBadgeClass(status?: string) {
  const value = String(status || '').toLowerCase()
  if (['return', 'refund', 'return_and_refund'].includes(value)) return 'bg-success'
  if (['delivered', 'completed', 'captured', 'confirmed', 'transfer_received', 'cod_collected'].includes(value)) return 'bg-success'
  if (['on-hold', 'pending', 'pending_verification', 'pending_authorization'].includes(value)) return 'bg-warning text-dark'
  if (['cancelled', 'failed', 'voided', 'returned'].includes(value)) return 'bg-danger'
  if (['packed', 'dispatched', 'shipped', 'processing'].includes(value)) return 'bg-primary'
  return 'bg-secondary'
}

function openHoldModal() {
  if (!selectedHoldableDetails.value.length) {
    actionError.value = 'Select at least one active product line to put on hold.'
    return
  }

  holdNote.value = ''
  actionError.value = null
  showHold.value = true
}

function openReleaseModal() {
  if (!selectedHeldDetails.value.length) {
    actionError.value = 'Select at least one held product line to release.'
    return
  }

  releaseNote.value = ''
  actionError.value = null
  showRelease.value = true
}

function openCancelModal() {
  if (!selectedDetails.value.length) {
    actionError.value = 'Select at least one product line to cancel.'
    return
  }

  cancelNote.value = ''
  actionError.value = null
  showCancel.value = true
}

function openReturnRefundModal() {
  if (!selectedReturnRefundDetails.value.length) {
    actionError.value = 'Select at least one eligible product line to return or refund.'
    return
  }

  const next: Record<number, { quantity: number; refund_amount: number; restock: boolean; reason: string }> = {}
  selectedReturnRefundDetails.value.forEach((line) => {
    next[line.id] = {
      quantity: 0,
      refund_amount: 0,
      restock: remainingReturnQty(line) > 0,
      reason: '',
    }
  })

  returnRefundLines.value = next
  returnRefundNote.value = ''
  actionError.value = null
  showReturnRefund.value = true
}

function closeHoldModal() {
  showHold.value = false
  holdNote.value = ''
}

function closeReleaseModal() {
  showRelease.value = false
  releaseNote.value = ''
}

function closeCancelModal() {
  showCancel.value = false
  cancelNote.value = ''
  sigCancelRef.value?.clear()
}

function closeReturnRefundModal() {
  showReturnRefund.value = false
  returnRefundNote.value = ''
  returnRefundLines.value = {}
  sigReturnRefundRef.value?.clear()
}

async function submitHold() {
  if (!selectedHoldableDetails.value.length) return

  holding.value = true
  actionError.value = null
  actionMsg.value = null

  try {
    await $axios.post(`/api/orders-placed/${orderId.value}/on-hold`, {
      selected_lines: selectedHoldableDetails.value.map((line) => line.id),
      note: holdNote.value.trim(),
    })

    actionMsg.value = 'Selected product lines were put on hold.'
    closeHoldModal()
    selected.value = []
    await load()
  } catch (error: any) {
    actionError.value = error?.response?.data?.message || 'Failed to put the selected products on hold.'
  } finally {
    holding.value = false
  }
}

async function submitRelease() {
  if (!selectedHeldDetails.value.length) return

  releasing.value = true
  actionError.value = null
  actionMsg.value = null

  try {
    await $axios.post(`/api/orders-placed/${orderId.value}/remove-hold`, {
      selected_lines: selectedHeldDetails.value.map((line) => line.id),
      restore_status: 'delivered',
      note: releaseNote.value.trim(),
    })

    actionMsg.value = 'Selected held product lines were released back to delivered.'
    closeReleaseModal()
    selected.value = []
    await load()
  } catch (error: any) {
    actionError.value = error?.response?.data?.message || 'Failed to release the selected products.'
  } finally {
    releasing.value = false
  }
}

async function submitCancellation() {
  if (!selectedDetails.value.length) {
    actionError.value = 'Select at least one product line to cancel.'
    return
  }

  if (!cancelNote.value.trim()) {
    actionError.value = 'Add a cancellation reason before confirming.'
    return
  }

  if (!sigCancelRef.value || sigCancelRef.value.isEmpty()) {
    actionError.value = 'Add the responsible person signature before cancelling.'
    return
  }

  cancelling.value = true
  actionError.value = null
  actionMsg.value = null

  try {
    const dataUrl = sigCancelRef.value.toDataURL('image/png')
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const file = new File([blob], `cancel-signature-${orderId.value}.png`, { type: 'image/png' })

    const fd = new FormData()
    fd.append('signature', file)
    fd.append('note', cancelNote.value.trim())
    fd.append('selected_lines', JSON.stringify(selectedDetails.value.map((line) => line.id)))

    await $axios.post(`/api/orders-placed/${orderId.value}/cancel`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    actionMsg.value = 'Selected product lines were cancelled.'
    closeCancelModal()
    selected.value = []
    await load()
  } catch (error: any) {
    actionError.value = error?.response?.data?.message || 'Failed to cancel the selected products.'
  } finally {
    cancelling.value = false
  }
}

async function submitReturnRefund() {
  if (!selectedReturnRefundDetails.value.length) {
    actionError.value = 'Select at least one eligible product line to return or refund.'
    return
  }

  if (!returnRefundNote.value.trim()) {
    actionError.value = 'Add a return/refund reason before confirming.'
    return
  }

  if (!sigReturnRefundRef.value || sigReturnRefundRef.value.isEmpty()) {
    actionError.value = 'Add the responsible person signature before saving the return/refund.'
    return
  }

  const items = selectedReturnRefundDetails.value.map((line) => {
    const row = returnRefundLines.value[line.id] || { quantity: 0, refund_amount: 0, restock: false, reason: '' }
    return {
      order_detail_id: line.id,
      quantity: Number(row.quantity || 0),
      refund_amount: Number(row.refund_amount || 0),
      restock: Boolean(row.restock),
      reason: row.reason?.trim() || returnRefundNote.value.trim(),
    }
  }).filter((item) => item.quantity > 0 || item.refund_amount > 0)

  if (!items.length) {
    actionError.value = 'Enter a return quantity, a refund amount, or both for at least one selected product.'
    return
  }

  const invalidLine = selectedReturnRefundDetails.value.find((line) => {
    const row = returnRefundLines.value[line.id]
    return Number(row?.quantity || 0) > remainingReturnQty(line) || Number(row?.refund_amount || 0) > remainingRefundAmount(line)
  })

  if (invalidLine) {
    actionError.value = `Return/refund exceeds the remaining quantity or amount for ${invalidLine.product?.Product_Name || 'a selected product'}.`
    return
  }

  returningRefunding.value = true
  actionError.value = null
  actionMsg.value = null

  try {
    const dataUrl = sigReturnRefundRef.value.toDataURL('image/png')
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const file = new File([blob], `return-refund-signature-${orderId.value}.png`, { type: 'image/png' })

    const fd = new FormData()
    fd.append('signature', file)
    fd.append('note', returnRefundNote.value.trim())
    fd.append('items', JSON.stringify(items))

    await $axios.post(`/api/orders-placed/${orderId.value}/return-refund`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    actionMsg.value = 'Return/refund adjustment was saved.'
    closeReturnRefundModal()
    selected.value = []
    await load()
  } catch (error: any) {
    actionError.value = error?.response?.data?.message || 'Failed to save the return/refund adjustment.'
  } finally {
    returningRefunding.value = false
  }
}

function printA5(orientation: 'portrait' | 'landscape' = 'portrait') {
  const id = 'a5-orientation-style'
  let style = document.getElementById(id) as HTMLStyleElement | null
  const css = `@page{size:A5 ${orientation}; margin:8mm;}`
  if (style) style.innerHTML = css
  else {
    style = document.createElement('style')
    style.id = id
    style.media = 'print'
    style.innerHTML = css
    document.head.appendChild(style)
  }
  window.print()
}

onMounted(load)
</script>

<template>
  <div class="dashboard-main-body completed-order-page">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <div>
        <h6 class="fw-semibold mb-1" style="color: #ef4444">Completed Order Details</h6>
        <div class="text-muted small">
          {{ order?.Order_Code || '-' }} <span class="mx-2">|</span> {{ order?.Transaction_Number || '-' }}
        </div>
      </div>

      <div class="d-flex flex-wrap gap-2">
        <NuxtLink to="/admin/orders/completed" class="btn btn-sm btn-light border">Back to completed</NuxtLink>
        <button type="button" class="btn btn-sm btn-outline-secondary" @click="printA5()">
          <iconify-icon icon="basil:printer-outline" class="me-1"></iconify-icon>
          Print
        </button>
      </div>
    </div>

    <div v-if="loading" class="card border-0 shadow-sm p-4 text-muted">Loading order details...</div>
    <div v-else-if="errorMsg" class="alert alert-danger">{{ errorMsg }}</div>

    <template v-else>
      <div v-if="actionMsg" class="alert alert-success py-2">{{ actionMsg }}</div>
      <div v-if="actionError" class="alert alert-danger py-2">{{ actionError }}</div>

      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body">
          <div class="d-flex flex-wrap align-items-start justify-content-between gap-3">
            <div>
              <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
                <h5 class="mb-0">{{ order?.Order_Code || '-' }}</h5>
                <span class="badge rounded-pill" :class="statusBadgeClass(order?.Status)">{{ order?.Status || '-' }}</span>
              </div>
              <div class="text-muted small">
                Created {{ fmt(order?.created_at) }} | Fulfillment: {{ deliveryTypeLabel }}
              </div>
            </div>

            <div class="d-flex flex-wrap gap-2">
              <button type="button" class="btn btn-sm btn-outline-warning" :disabled="!selectedHoldableDetails.length" @click="openHoldModal">
                Hold selected
              </button>
              <button type="button" class="btn btn-sm btn-outline-primary" :disabled="!selectedHeldDetails.length" @click="openReleaseModal">
                Release hold
              </button>
              <button type="button" class="btn btn-sm btn-outline-success" :disabled="!selectedReturnRefundDetails.length" @click="openReturnRefundModal">
                Return / refund selected
              </button>
              <button type="button" class="btn btn-sm btn-outline-danger" :disabled="!selectedDetails.length" @click="openCancelModal">
                Cancel selected
              </button>
            </div>
          </div>

          <div class="summary-grid mt-3">
            <div class="summary-card">
              <span>Customer</span>
              <strong>{{ customer?.Contact_Person_Name || '-' }}</strong>
              <small>{{ customer?.Telephone || '-' }}</small>
              <small>{{ customer?.Email || '-' }}</small>
            </div>
            <div class="summary-card">
              <span>Fulfillment</span>
              <strong>{{ deliveryTypeLabel }}</strong>
              <small>{{ fulfillmentName }}</small>
              <small v-if="order?.Shipping_Basis">Basis: {{ order.Shipping_Basis }}</small>
            </div>
            <div class="summary-card">
              <span>Payment</span>
              <strong class="text-capitalize">{{ primaryPayment?.Payment_Method || '-' }}</strong>
              <small>{{ primaryPayment?.Payment_Status || '-' }}</small>
              <small>{{ money(paymentTotal || grandTotal) }}</small>
            </div>
            <div class="summary-card dark">
              <span>Grand Total</span>
              <strong>{{ money(grandTotal) }}</strong>
              <small>After VAT, shipping, loyalty, and discounts</small>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3">
        <div class="col-12 col-xl-8">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-white d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div>
                <h6 class="mb-1">Products</h6>
                <div class="text-muted small">
                  {{ details.length }} line(s), {{ selected.length }} selected
                </div>
              </div>
              <div class="d-flex flex-wrap gap-2 small">
                <span v-for="(count, status) in lineStatusCounts" :key="status" class="badge rounded-pill" :class="statusBadgeClass(status)">
                  {{ status }}: {{ count }}
                </span>
              </div>
            </div>

            <div class="table-responsive">
              <table class="table align-middle mb-0 completed-lines-table">
                <thead class="table-light">
                  <tr>
                    <th style="width: 44px;">
                      <input v-model="allVisibleSelected" type="checkbox" class="form-check-input" />
                    </th>
                    <th>Product</th>
                    <th>Vendor</th>
                    <th class="text-center">Qty</th>
                    <th class="text-end">Unit</th>
                    <th class="text-end">Discount</th>
                    <th class="text-end">VAT</th>
                    <th class="text-end">Subtotal</th>
                    <th class="text-end">Returned</th>
                    <th class="text-end">Refunded</th>
                    <th class="text-end">Net</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="line in details" :key="line.id">
                    <td>
                      <input
                        v-if="line.Status !== 'cancelled'"
                        v-model="selected"
                        :value="line.id"
                        type="checkbox"
                        class="form-check-input"
                      />
                    </td>
                    <td>
                      <div class="d-flex align-items-center gap-2 product-cell">
                        <div class="product-thumb">
                          <img v-if="productImage(line)" :src="productImage(line)" alt="" />
                          <span v-else>ISC</span>
                        </div>
                        <div>
                          <div class="fw-semibold">{{ line.product?.Product_Name || '-' }}</div>
                          <div class="text-muted small">{{ lineSku(line) }}</div>
                          <div class="text-muted small">{{ categoryTrail(line) }}</div>
                        </div>
                      </div>
                    </td>
                    <td>{{ lineVendorName(line) }}</td>
                    <td class="text-center">{{ Number(line.Quantity || 0) }}</td>
                    <td class="text-end">
                      <div>{{ money(line.Discounted_Unit_Price || line.Price) }}</div>
                      <small v-if="line.Original_Unit_Price && Number(line.Original_Unit_Price) > Number(line.Discounted_Unit_Price || line.Price)" class="text-muted text-decoration-line-through">
                        {{ money(line.Original_Unit_Price) }}
                      </small>
                    </td>
                    <td class="text-end">
                      <span v-if="lineDiscount(line) > 0">{{ money(lineDiscount(line)) }}</span>
                      <span v-else class="text-muted">-</span>
                    </td>
                    <td class="text-end">{{ money(line.Vat) }}</td>
                    <td class="text-end fw-semibold">{{ money(lineSoldAmount(line)) }}</td>
                    <td class="text-end">
                      <div>{{ lineReturnedQty(line) }} / {{ Number(line.Quantity || 0) }}</div>
                      <small class="text-muted">{{ line.Return_State || 'not_returned' }}</small>
                    </td>
                    <td class="text-end">
                      <div>{{ money(lineRefundedAmount(line)) }}</div>
                      <small class="text-muted">{{ line.Refund_State || 'not_refunded' }}</small>
                    </td>
                    <td class="text-end fw-semibold">{{ money(lineNetAmount(line)) }}</td>
                    <td>
                      <span class="badge rounded-pill" :class="statusBadgeClass(line.Status)">
                        {{ line.Status || '-' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="col-12 col-xl-4">
          <div class="card border-0 shadow-sm mb-3">
            <div class="card-header bg-white">
              <h6 class="mb-0">Payment Breakdown</h6>
            </div>
            <div class="card-body">
              <div class="total-row">
                <span>Original subtotal</span>
                <strong>{{ money(originalSubtotal) }}</strong>
              </div>
              <div class="total-row">
                <span>Product discounts</span>
                <strong>- {{ money(productDiscountTotal) }}</strong>
              </div>
              <div class="total-row">
                <span>Subtotal</span>
                <strong>{{ money(subtotal) }}</strong>
              </div>
              <div class="total-row" v-if="refundedTotal > 0">
                <span>Refunded products</span>
                <strong>- {{ money(refundedTotal) }}</strong>
              </div>
              <div class="total-row" v-if="refundedTotal > 0">
                <span>Net product sales</span>
                <strong>{{ money(netProductTotal) }}</strong>
              </div>
              <div class="total-row">
                <span>VAT</span>
                <strong>{{ money(vatAmount) }}</strong>
              </div>
              <div class="total-row">
                <span>Shipping</span>
                <strong>{{ money(shippingPrice) }}</strong>
              </div>
              <div class="total-row" v-if="loyaltyDiscount > 0">
                <span>Loyalty redeemed</span>
                <strong>- {{ money(loyaltyDiscount) }}</strong>
              </div>
              <div class="total-row grand">
                <span>Grand total</span>
                <strong>{{ money(grandTotal) }}</strong>
              </div>

              <div v-if="loyaltyPoints > 0" class="small text-muted mt-2">
                {{ loyaltyPoints.toLocaleString() }} loyalty point(s) used.
              </div>
            </div>
          </div>

          <div class="card border-0 shadow-sm">
            <div class="card-header bg-white">
              <h6 class="mb-0">Fulfillment Details</h6>
            </div>
            <div class="card-body small">
              <div class="mb-2">
                <span class="text-muted d-block">Delivery type</span>
                <strong>{{ deliveryTypeLabel }}</strong>
              </div>
              <div class="mb-2">
                <span class="text-muted d-block">{{ order?.Delivery_Type === 'pickup' ? 'Pickup location' : 'Carrier' }}</span>
                <strong>{{ fulfillmentName }}</strong>
              </div>
              <div v-if="order?.Delivery_Type === 'ship'" class="mb-2">
                <span class="text-muted d-block">Shipping weight / volume</span>
                <strong>{{ Number(order?.Shipping_Weight_Kg || 0).toFixed(3) }} kg</strong>
                <span class="mx-1">/</span>
                <strong>{{ Number(order?.Shipping_Volume_Cbm || 0).toFixed(4) }} CBM</strong>
              </div>
              <div>
                <span class="text-muted d-block">Customer address/contact</span>
                <strong>{{ customer?.Contact_Person_Name || '-' }}</strong>
                <div>{{ customer?.Designation || '-' }}</div>
                <div>{{ customer?.Telephone || '-' }}</div>
                <div>{{ customer?.Email || '-' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3 mt-1">
        <div class="col-12 col-xl-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-white">
              <h6 class="mb-0">Transaction Details</h6>
            </div>
            <div class="card-body">
              <div v-if="!paymentLines.length" class="text-muted small">No payment transaction lines were found.</div>
              <div v-else class="table-responsive">
                <table class="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Method</th>
                      <th>Status</th>
                      <th class="text-end">Amount</th>
                      <th>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="line in paymentLines" :key="line.id">
                      <td class="text-capitalize">{{ line.Payment_Method || '-' }}</td>
                      <td>
                        <span class="badge rounded-pill" :class="statusBadgeClass(line.Payment_Status)">
                          {{ line.Payment_Status || '-' }}
                        </span>
                      </td>
                      <td class="text-end">{{ money(line.Payment_Amount) }}</td>
                      <td class="small">
                        <span v-if="line.Payment_Method === 'card'">{{ line.Card_Brand || 'Card' }} **** {{ line.Card_Last4 || '----' }}</span>
                        <span v-else-if="line.Payment_Method === 'transfer'">{{ line.Transfer_Reference || line.Transfer_Payer_Name || '-' }}</span>
                        <span v-else-if="line.Payment_Method === 'cod'">{{ line.COD_Note || 'Cash on delivery' }}</span>
                        <span v-else>-</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12 col-xl-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-white">
              <h6 class="mb-0">Vendor Orders</h6>
            </div>
            <div class="card-body">
              <div v-if="!vendorOrders.length" class="text-muted small">No vendor split order is linked to this order.</div>
              <div v-else class="table-responsive">
                <table class="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>Vendor Order</th>
                      <th>Status</th>
                      <th class="text-end">Total</th>
                      <th class="text-end">Refunded</th>
                      <th class="text-end">Net payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="vendorOrder in vendorOrders" :key="vendorOrder.id">
                      <td>{{ vendorOrder.vendor?.Vendor_Name || vendorOrder.vendor?.Vendor_Company_Name || '-' }}</td>
                      <td class="font-monospace">{{ vendorOrder.Vendor_Order_Code || '-' }}</td>
                      <td>
                        <span class="badge rounded-pill" :class="statusBadgeClass(vendorOrder.Status)">
                          {{ vendorOrder.Status || '-' }}
                        </span>
                      </td>
                      <td class="text-end">{{ money(vendorOrder.Total) }}</td>
                      <td class="text-end">{{ money(vendorOrder.Refunded_Amount) }}</td>
                      <td class="text-end">
                        <div>{{ money(vendorOrder.Net_Payout_Amount) }}</div>
                        <small v-if="Number(vendorOrder.Payout_Adjustment_Amount || 0) > 0" class="text-muted">
                          Adj {{ money(vendorOrder.Payout_Adjustment_Amount) }}
                        </small>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card border-0 shadow-sm mt-3">
        <div class="card-header bg-white">
          <h6 class="mb-0">Packaging Evidence</h6>
        </div>
        <div class="card-body">
          <div v-if="!details.length" class="text-muted small">No order products were found.</div>
          <div v-else class="row g-3">
            <div v-for="line in details" :key="line.id" class="col-12 col-lg-6">
              <div class="border rounded-3 p-3 h-100">
                <div class="d-flex justify-content-between gap-2 mb-2">
                  <strong>{{ line.product?.Product_Name || 'Item' }}</strong>
                  <span class="text-muted small">Line #{{ line.id }}</span>
                </div>

                <div v-if="packagesByDetail[line.id]?.length" class="d-flex flex-wrap gap-3">
                  <div v-for="pkg in packagesByDetail[line.id]" :key="pkg.id" class="package-thumb">
                    <a v-if="pkg.packed" :href="mediaUrl(pkg.packed)" target="_blank" class="thumb">
                      <img :src="mediaUrl(pkg.packed)" alt="Packed package" />
                    </a>
                    <div v-else class="thumb text-muted small">No image</div>
                    <div class="small mt-1 text-muted">By {{ pkg.packed_by || '-' }}</div>
                    <div class="small text-muted">{{ fmt(pkg.created_at) }}</div>
                  </div>
                </div>
                <div v-else class="text-muted small">No package photos uploaded for this product line.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card border-0 shadow-sm mt-3">
        <div class="card-header bg-white">
          <h6 class="mb-0">Return / Refund History</h6>
        </div>
        <div class="card-body">
          <div v-if="!adjustmentHistory.length" class="text-muted small">No return or refund adjustments yet.</div>
          <div v-else class="table-responsive">
            <table class="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Type</th>
                  <th class="text-end">Qty</th>
                  <th class="text-end">Refund</th>
                  <th class="text-end">Restock</th>
                  <th>Reason</th>
                  <th>Actor</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="adjustment in adjustmentHistory" :key="adjustment.id">
                  <td>
                    <div class="fw-semibold">{{ adjustment.line?.product?.Product_Name || '-' }}</div>
                    <div class="text-muted small">Line #{{ adjustment.Orders_Placed_Details_Id }}</div>
                  </td>
                  <td>
                    <span class="badge rounded-pill" :class="statusBadgeClass(adjustment.Adjustment_Type)">
                      {{ adjustment.Adjustment_Type || '-' }}
                    </span>
                  </td>
                  <td class="text-end">{{ Number(adjustment.Quantity || 0) }}</td>
                  <td class="text-end">{{ money(adjustment.Amount) }}</td>
                  <td class="text-end">{{ Number(adjustment.Restock_Quantity || 0) }}</td>
                  <td class="small">{{ adjustment.Reason || '-' }}</td>
                  <td>{{ adjustment.Actor_Name || '-' }}</td>
                  <td class="small">{{ fmt(adjustment.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card border-0 shadow-sm mt-3">
        <div class="card-header bg-white">
          <h6 class="mb-0">Process Timeline</h6>
        </div>
        <div class="card-body">
          <div v-if="!logs.length" class="text-muted small">No process logs yet.</div>
          <div v-else class="timeline">
            <div v-for="log in logs" :key="log.id" class="timeline-item">
              <div class="timeline-dot" :class="statusBadgeClass(log.status)"></div>
              <div class="timeline-card border rounded-3 p-3">
                <div class="d-flex flex-wrap align-items-start justify-content-between gap-2">
                  <div>
                    <div class="fw-semibold">
                      {{ log.step_code || '-' }}
                      <span v-if="log.detail_id" class="text-muted small ms-2">Line #{{ log.detail_id }}</span>
                    </div>
                    <div class="text-muted small">
                      {{ log.actor?.name || '-' }} | {{ fmt(log.created_at) }}
                    </div>
                  </div>
                  <span class="badge rounded-pill" :class="statusBadgeClass(log.status)">
                    {{ log.status || '-' }}
                  </span>
                </div>
                <div v-if="log.notes" class="small mt-2">{{ log.notes }}</div>
                <a v-if="log.signature?.url" :href="mediaUrl(log.signature.url)" target="_blank" class="small d-inline-block mt-2">
                  View signature
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>

  <div v-if="showHold" class="sig-modal-backdrop">
    <div class="sig-modal" role="dialog" aria-modal="true">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="mb-0">Put selected products on hold</h6>
        <button type="button" class="btn btn-sm btn-light" @click="closeHoldModal">X</button>
      </div>
      <p class="small text-muted mb-2">{{ selectedHoldableDetails.length }} product line(s) will be moved to on-hold.</p>
      <label class="form-label fw-semibold">Reason / Notes</label>
      <textarea v-model="holdNote" class="form-control" rows="4" placeholder="Reason for holding these products"></textarea>
      <div class="d-flex justify-content-end gap-2 mt-3">
        <button type="button" class="btn btn-sm btn-secondary" @click="closeHoldModal">Close</button>
        <button type="button" class="btn btn-sm btn-warning" :disabled="holding" @click="submitHold">
          <span v-if="holding" class="spinner-border spinner-border-sm me-1"></span>
          Confirm Hold
        </button>
      </div>
    </div>
  </div>

  <div v-if="showRelease" class="sig-modal-backdrop">
    <div class="sig-modal" role="dialog" aria-modal="true">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="mb-0">Release selected held products</h6>
        <button type="button" class="btn btn-sm btn-light" @click="closeReleaseModal">X</button>
      </div>
      <p class="small text-muted mb-2">{{ selectedHeldDetails.length }} held product line(s) will return to delivered.</p>
      <label class="form-label fw-semibold">Notes</label>
      <textarea v-model="releaseNote" class="form-control" rows="4" placeholder="Optional release note"></textarea>
      <div class="d-flex justify-content-end gap-2 mt-3">
        <button type="button" class="btn btn-sm btn-secondary" @click="closeReleaseModal">Close</button>
        <button type="button" class="btn btn-sm btn-primary" :disabled="releasing" @click="submitRelease">
          <span v-if="releasing" class="spinner-border spinner-border-sm me-1"></span>
          Release Hold
        </button>
      </div>
    </div>
  </div>

  <div v-if="showReturnRefund" class="sig-modal-backdrop">
    <div class="sig-modal return-refund-modal" role="dialog" aria-modal="true">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="mb-0">Return / refund selected products</h6>
        <button type="button" class="btn btn-sm btn-light" @click="closeReturnRefundModal">X</button>
      </div>

      <p class="small text-muted mb-3">
        {{ selectedReturnRefundDetails.length }} product line(s) are eligible. Use quantity for physical returns, refund amount for money adjustment, or both.
      </p>

      <div class="return-refund-lines">
        <div v-for="line in selectedReturnRefundDetails" :key="line.id" class="return-refund-line">
          <div>
            <div class="fw-semibold">{{ line.product?.Product_Name || '-' }}</div>
            <div class="text-muted small">
              Remaining: {{ remainingReturnQty(line) }} item(s), {{ money(remainingRefundAmount(line)) }}
            </div>
          </div>

          <div class="row g-2 mt-2">
            <div class="col-6 col-md-3">
              <label class="form-label small text-muted">Return qty</label>
              <input
                v-model.number="returnRefundLines[line.id].quantity"
                type="number"
                min="0"
                :max="remainingReturnQty(line)"
                class="form-control form-control-sm"
              />
            </div>
            <div class="col-6 col-md-3">
              <label class="form-label small text-muted">Refund OMR</label>
              <input
                v-model.number="returnRefundLines[line.id].refund_amount"
                type="number"
                min="0"
                step="0.001"
                :max="remainingRefundAmount(line)"
                class="form-control form-control-sm"
              />
            </div>
            <div class="col-12 col-md-3 d-flex align-items-end">
              <div class="form-check">
                <input
                  :id="`restock-${line.id}`"
                  v-model="returnRefundLines[line.id].restock"
                  type="checkbox"
                  class="form-check-input"
                  :disabled="remainingReturnQty(line) <= 0"
                />
                <label class="form-check-label small" :for="`restock-${line.id}`">Restock returned qty</label>
              </div>
            </div>
            <div class="col-12 col-md-3">
              <label class="form-label small text-muted">Line reason</label>
              <input
                v-model="returnRefundLines[line.id].reason"
                type="text"
                class="form-control form-control-sm"
                placeholder="Optional"
              />
            </div>
          </div>
        </div>
      </div>

      <label class="form-label fw-semibold mt-3">Return/refund reason</label>
      <textarea v-model="returnRefundNote" class="form-control" rows="3" placeholder="Main reason for this return or refund"></textarea>

      <label class="form-label fw-semibold mt-3">Responsible signature</label>
      <SignaturePad ref="sigReturnRefundRef" :height="180" :lineWidth="2" penColor="#111" backgroundColor="#fff" />

      <div class="d-flex justify-content-end gap-2 mt-3">
        <button type="button" class="btn btn-sm btn-secondary" @click="closeReturnRefundModal">Close</button>
        <button type="button" class="btn btn-sm btn-success" :disabled="returningRefunding" @click="submitReturnRefund">
          <span v-if="returningRefunding" class="spinner-border spinner-border-sm me-1"></span>
          Save Return / Refund
        </button>
      </div>
    </div>
  </div>

  <div v-if="showCancel" class="sig-modal-backdrop">
    <div class="sig-modal" role="dialog" aria-modal="true">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="mb-0">Cancel selected products</h6>
        <button type="button" class="btn btn-sm btn-light" @click="closeCancelModal">X</button>
      </div>
      <p class="small text-muted mb-2">{{ selectedDetails.length }} product line(s) will be cancelled.</p>
      <SignaturePad ref="sigCancelRef" :height="200" :lineWidth="2" penColor="#111" backgroundColor="#fff" />
      <label class="form-label fw-semibold mt-3">Cancellation reason</label>
      <textarea v-model="cancelNote" class="form-control" rows="4" placeholder="Brief reason for cancellation"></textarea>
      <div class="d-flex justify-content-end gap-2 mt-3">
        <button type="button" class="btn btn-sm btn-secondary" @click="closeCancelModal">Close</button>
        <button type="button" class="btn btn-sm btn-danger" :disabled="cancelling" @click="submitCancellation">
          <span v-if="cancelling" class="spinner-border spinner-border-sm me-1"></span>
          Confirm Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.completed-order-page {
  color: #172033;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  border: 1px solid #e5eaf2;
  border-radius: 8px;
  padding: 14px;
  min-height: 112px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-card span,
.summary-card small {
  color: #667085;
}

.summary-card strong {
  font-size: 16px;
}

.summary-card.dark {
  background: #0f172a;
  border-color: #0f172a;
  color: #fff;
}

.summary-card.dark span,
.summary-card.dark small {
  color: #cbd5e1;
}

.completed-lines-table {
  min-width: 1240px;
}

.product-cell {
  min-width: 280px;
}

.product-thumb {
  width: 42px;
  height: 42px;
  border: 1px solid #e5eaf2;
  border-radius: 8px;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.product-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.total-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #eef2f7;
}

.total-row.grand {
  border-bottom: 0;
  margin-top: 6px;
  padding: 12px;
  border-radius: 8px;
  color: #fff;
  background: #0f172a;
}

.package-thumb .thumb {
  width: 140px;
  height: 100px;
  border: 1px solid #e5eaf2;
  border-radius: 8px;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.package-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.timeline {
  position: relative;
  margin-left: 12px;
  padding-left: 22px;
}

.timeline:before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 5px;
  width: 2px;
  background: #e5eaf2;
}

.timeline-item {
  position: relative;
  margin-bottom: 14px;
}

.timeline-dot {
  position: absolute;
  left: -21px;
  top: 12px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 2px #e5eaf2;
}

.timeline-card {
  background: #fff;
}

.sig-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, .58);
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.sig-modal {
  width: min(640px, 100%);
  max-height: calc(100vh - 32px);
  overflow: auto;
  background: #fff;
  border-radius: 8px;
  padding: 18px;
  box-shadow: 0 24px 80px rgba(15, 23, 42, .28);
}

.return-refund-modal {
  width: min(920px, 100%);
}

.return-refund-lines {
  display: grid;
  gap: 12px;
}

.return-refund-line {
  border: 1px solid #e5eaf2;
  border-radius: 8px;
  padding: 12px;
  background: #f8fafc;
}

@media (max-width: 1199px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 575px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
