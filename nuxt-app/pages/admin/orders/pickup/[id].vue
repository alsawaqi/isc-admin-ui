<script setup lang="ts">
import { definePageMeta, navigateTo, useNuxtApp, useRoute } from '#imports'
import { computed, onMounted, ref } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permission: 'order pickup',
})

const { $axios } = useNuxtApp() as any
const route = useRoute()
const Orders_Id = computed(() => String(route.params.id || ''))

const orders = ref<any>({ orderlist: [] })
const submitting = ref(false)

const getorders = async () => {
  try {
    const { data } = await $axios.get(`/api/orders-placed/${Orders_Id.value}`)
    orders.value = data
  } catch (error) {
    console.error('Failed to fetch pickup order details:', error)
  }
}

const completePickup = async () => {
  submitting.value = true
  try {
    await $axios.post(`/api/orders-placed/${Orders_Id.value}/pickup-complete`)
    navigateTo('/admin/orders/orderspickup')
  } catch (error: any) {
    console.error('Failed to complete pickup order:', error?.response?.data ?? error)
    alert(error?.response?.data?.message || 'Failed to complete pickup order.')
  } finally {
    submitting.value = false
  }
}

const printA5 = () => {
  const id = 'a5-pickup-print-style'
  let style = document.getElementById(id) as HTMLStyleElement | null
  const css = '@page{size:A5 portrait; margin:8mm;}'
  if (style) {
    style.innerHTML = css
  } else {
    style = document.createElement('style')
    style.id = id
    style.media = 'print'
    style.innerHTML = css
    document.head.appendChild(style)
  }
  window.print()
}

onMounted(getorders)
</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
      <div>
        <h6 class="fw-semibold mb-1">Pickup Order - Collection</h6>
        <div class="small text-muted">
          Invoice <span class="fw-semibold">#{{ orders.Transaction_Number || '-' }}</span>
          <span class="ms-2">Issued: {{ orders.created_at || '-' }}</span>
        </div>
      </div>
      <ul class="d-flex align-items-center gap-2 small mb-0">
        <li class="fw-medium">
          <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon fs-5"></iconify-icon>
            Dashboard
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium text-muted">Pickup</li>
      </ul>
    </div>

    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white border-0 py-3 no-print">
        <div class="d-flex flex-wrap align-items-center justify-content-end gap-2">
          <button type="button" class="btn btn-sm btn-danger d-inline-flex align-items-center gap-1" @click="printA5">
            <iconify-icon icon="basil:printer-outline" class="fs-5"></iconify-icon>
            Print
          </button>
          <button
            type="button"
            class="btn btn-sm btn-outline-success"
            :disabled="submitting"
            @click.prevent="completePickup"
          >
            <span v-if="submitting" class="spinner-border spinner-border-sm me-1"></span>
            Confirm Collected
          </button>
        </div>
      </div>

      <div class="card-body py-4">
        <div id="invoice" class="mx-auto" style="max-width: 980px;">
          <div class="border rounded-3 overflow-hidden">
            <div class="p-4 border-bottom bg-light">
              <div class="d-flex justify-content-between align-items-start gap-3">
                <div>
                  <h3 class="h5 mb-1">
                    Pickup Invoice <span class="text-muted">#{{ orders.Transaction_Number }}</span>
                  </h3>
                  <div class="small text-muted">Date Issued: {{ orders.created_at || '-' }}</div>
                </div>
                <div class="text-end">
                  <span class="badge rounded-pill bg-info text-dark">{{ orders.Status || '-' }}</span>
                </div>
              </div>
            </div>

            <div class="p-4">
              <div class="row g-3 mb-3">
                <div class="col-md-7">
                  <h6 class="text-uppercase text-muted small mb-2">Customer</h6>
                  <div class="border rounded-3 p-3">
                    <div class="fw-semibold">{{ orders.customer_contact?.Contact_Person_Name || '-' }}</div>
                    <div class="small text-muted">{{ orders.customer_contact?.Designation || '-' }}</div>
                    <div class="small text-muted">{{ orders.customer_contact?.Telephone || '-' }}</div>
                  </div>
                </div>
                <div class="col-md-5">
                  <h6 class="text-uppercase text-muted small mb-2">Pickup Location</h6>
                  <div class="border rounded-3 p-3">
                    <div class="fw-semibold">
                      {{ orders.location?.Location_Name || orders.location?.Location_Name_Ar || '-' }}
                    </div>
                    <div class="small text-muted">{{ orders.location?.Location_Code || 'Location code not recorded' }}</div>
                  </div>
                </div>
              </div>

              <div class="table-responsive rounded-3 border">
                <table class="table table-hover table-striped align-middle mb-0">
                  <thead class="table-light">
                    <tr class="text-muted text-uppercase small">
                      <th style="width:56px;">SL.</th>
                      <th>Items</th>
                      <th class="text-center" style="width:90px;">Qty</th>
                      <th class="text-end" style="width:140px;">Unit Price</th>
                      <th class="text-end" style="width:140px;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(order, index) in orders.orderlist" :key="order.id">
                      <td class="text-muted">{{ index + 1 }}</td>
                      <td class="fw-semibold">{{ order.product?.Product_Name || '-' }}</td>
                      <td class="text-center">{{ order.Quantity }}</td>
                      <td class="text-end">OMR {{ Number(order.Price || 0).toFixed(3) }}</td>
                      <td class="text-end">OMR {{ Number(order.Subtotal || 0).toFixed(3) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="d-flex flex-wrap justify-content-between align-items-center mt-3">
                <div class="small text-muted">Confirm only after the customer has collected the order.</div>
                <div class="fs-6">
                  <span class="text-muted me-2">Total:</span>
                  <span class="fw-semibold">OMR {{ Number(orders.Total_Price || 0).toFixed(3) }}</span>
                </div>
              </div>
            </div>

            <div class="px-4 py-3 bg-light border-top small text-muted d-flex justify-content-between flex-wrap gap-2">
              <div>Pickup order record generated electronically.</div>
              <div>ISC</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  .no-print {
    display: none !important;
  }
}
</style>
