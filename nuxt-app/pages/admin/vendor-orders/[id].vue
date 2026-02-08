<script setup lang="ts">
import { definePageMeta, useNuxtApp } from "#imports"
import { ref, onMounted, computed } from "vue"
import { useRoute } from "vue-router"

definePageMeta({
  layout: "admin",
  middleware: ["permission"],
  permissions: "orders",
})

const { $axios } = useNuxtApp() as any
const route = useRoute()
const id = Number(route.params.id)

const loading = ref(false)
const error = ref<string | null>(null)

const data = ref<any | null>(null)
const vendorOrder = computed(() => data.value?.vendor_order)
const order = computed(() => data.value?.order)
const items = computed(() => data.value?.items || [])

const formType = ref<"percent" | "fixed">("percent")
const formValue = ref<number>(0)

const busy = ref(false)
const saveError = ref<string | null>(null)
const saveSuccess = ref<string | null>(null)

const baseSubtotal = computed(() => Number(vendorOrder.value?.Sub_Total || 0))
const computedAmount = computed(() => {
  const base = baseSubtotal.value
  const v = Number(formValue.value || 0)
  if (formType.value === "percent") return Math.round((base * v / 100) * 1000) / 1000
  return Math.round(v * 1000) / 1000
})

const fetchDetails = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await $axios.get(`/api/admin/vendor-orders/${id}`)
    data.value = res.data.data

    // preload existing commission
    if (data.value?.vendor_order?.Commission_Type) {
      formType.value = data.value.vendor_order.Commission_Type
      formValue.value = Number(data.value.vendor_order.Commission_Value || 0)
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message || "Failed to load vendor order."
  } finally {
    loading.value = false
  }
}

const saveCommission = async () => {
  saveError.value = null
  saveSuccess.value = null

  if (formValue.value < 0) {
    saveError.value = "Commission value must be >= 0"
    return
  }
  if (computedAmount.value > baseSubtotal.value) {
    saveError.value = "Commission cannot exceed vendor subtotal."
    return
  }

  busy.value = true
  try {
    await $axios.post(`/api/admin/vendor-orders/${id}/commission`, {
      commission_type: formType.value,
      commission_value: formValue.value,
    })
    saveSuccess.value = "Commission saved ✅"
    await fetchDetails()
  } catch (e: any) {
    saveError.value = e?.response?.data?.message || "Failed to save commission."
  } finally {
    busy.value = false
  }
}

onMounted(fetchDetails)
</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <div>
        <h6 class="fw-semibold mb-1">Vendor Order #{{ id }}</h6>
        <div class="text-muted small">
          Order: <span class="font-monospace">{{ vendorOrder?.Orders_Placed_Id }}</span>
          • Vendor: <span class="font-monospace">{{ vendorOrder?.Vendor_Id }}</span>
        </div>
      </div>

      <NuxtLink to="/admin/vendor-orders" class="btn btn-sm btn-outline-secondary">
        ← Back
      </NuxtLink>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="loading" class="alert alert-info">Loading...</div>

    <div v-if="data" class="row g-3">
      <!-- Left: Details -->
      <div class="col-12 col-lg-7">
        <div class="card radius-12 overflow-hidden">
          <div class="card-header d-flex align-items-center justify-content-between">
            <div class="fw-semibold">Vendor Order Summary</div>
            <span class="badge bg-secondary">{{ vendorOrder?.Status }}</span>
          </div>

          <div class="card-body">
            <div class="row g-3">
              <div class="col-6">
                <div class="text-muted small">Vendor Order Code</div>
                <div class="font-monospace">{{ vendorOrder?.Vendor_Order_Code || "-" }}</div>
              </div>

              <div class="col-6">
                <div class="text-muted small">Order Code</div>
                <div class="font-monospace">{{ order?.Order_Code || "-" }}</div>
              </div>

              <div class="col-4">
                <div class="text-muted small">Sub Total</div>
                <div>{{ Number(vendorOrder?.Sub_Total || 0).toFixed(3) }}</div>
              </div>

              <div class="col-4">
                <div class="text-muted small">VAT</div>
                <div>{{ Number(vendorOrder?.VAT || 0).toFixed(3) }}</div>
              </div>

              <div class="col-4">
                <div class="text-muted small">Total</div>
                <div class="fw-semibold">{{ Number(vendorOrder?.Total || 0).toFixed(3) }}</div>
              </div>

              <div class="col-12"><hr /></div>

              <div class="col-12">
                <div class="fw-semibold mb-2">Items</div>
                <div class="table-responsive">
                  <table class="table table-sm align-middle mb-0">
                    <thead class="table-light">
                      <tr>
                        <th>Product</th>
                        <th class="text-end">Qty</th>
                        <th class="text-end">Price</th>
                        <th class="text-end">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="it in items" :key="it.id">
                        <td>
                          <div class="fw-semibold">{{ it.Product_Name || ("#"+it.Products_Id) }}</div>
                          <div class="text-muted small font-monospace">{{ it.Product_Sku || "" }}</div>
                        </td>
                        <td class="text-end">{{ it.Quantity }}</td>
                        <td class="text-end">{{ Number(it.Price || 0).toFixed(3) }}</td>
                        <td class="text-end">{{ Number(it.Subtotal || 0).toFixed(3) }}</td>
                      </tr>
                      <tr v-if="items.length === 0">
                        <td colspan="4" class="text-center text-muted py-3">No items.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <!-- Right: Commission -->
      <div class="col-12 col-lg-5">
        <div class="card radius-12 overflow-hidden">
          <div class="card-header">
            <div class="fw-semibold">Set Commission</div>
            <div class="text-muted small">Percent or fixed amount</div>
          </div>

          <div class="card-body">
            <div v-if="saveError" class="alert alert-danger">{{ saveError }}</div>
            <div v-if="saveSuccess" class="alert alert-success">{{ saveSuccess }}</div>

            <div class="mb-3">
              <label class="form-label small">Commission Type</label>
              <select v-model="formType" class="form-select">
                <option value="percent">percent (%)</option>
                <option value="fixed">fixed (amount)</option>
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label small">Commission Value</label>
              <input v-model.number="formValue" type="number" min="0" step="0.001" class="form-control" />
              <div class="text-muted small mt-1">
                Base (vendor subtotal): <b>{{ baseSubtotal.toFixed(3) }}</b>
              </div>
            </div>

            <div class="p-3 rounded-3 border bg-light">
              <div class="d-flex justify-content-between">
                <span class="text-muted">Calculated Amount</span>
                <span class="fw-semibold">{{ computedAmount.toFixed(3) }}</span>
              </div>
            </div>

            <div class="d-flex justify-content-end mt-3">
              <button class="btn btn-primary" @click="saveCommission" :disabled="busy">
                {{ busy ? "Saving..." : "Save Commission" }}
              </button>
            </div>

            <div class="text-muted small mt-3">
             
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
