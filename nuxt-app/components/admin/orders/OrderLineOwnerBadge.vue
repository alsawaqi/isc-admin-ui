<script setup lang="ts">
import { computed } from 'vue'

/**
 * Shows who owns an order line's product:
 * - vendor product (product.vendor loaded)  -> clickable warning badge with the vendor name (emits `view`)
 * - vendor product but vendor not loaded    -> plain "Vendor #<id>" badge (no modal)
 * - product deleted but line has Vendor_Id  -> plain "Vendor #<id>" badge (no modal)
 * - company product (no Vendor_Id anywhere) -> neutral "ISC" badge
 */
const props = defineProps<{
  line: any
}>()

const emit = defineEmits<{
  (e: 'view', vendor: any): void
}>()

const vendor = computed(() => props.line?.product?.vendor || null)

const vendorId = computed(() => {
  return props.line?.product?.Vendor_Id ?? props.line?.Vendor_Id ?? null
})

const isVendorLine = computed(() => Boolean(vendor.value || vendorId.value))

const vendorLabel = computed(() => {
  if (vendor.value) return vendor.value.Vendor_Name || vendor.value.Trade_Name || `Vendor #${vendor.value.id}`
  return `Vendor #${vendorId.value}`
})
</script>

<template>
  <button
    v-if="isVendorLine && vendor"
    type="button"
    class="badge rounded-pill bg-warning text-dark border-0 owner-badge owner-badge-clickable"
    :title="`View ${vendorLabel} contact info`"
    @click.stop="emit('view', vendor)"
  >
    <iconify-icon icon="solar:shop-2-outline" class="me-1" aria-hidden="true"></iconify-icon>
    {{ vendorLabel }}
  </button>
  <span
    v-else-if="isVendorLine"
    class="badge rounded-pill bg-warning text-dark owner-badge"
  >
    <iconify-icon icon="solar:shop-2-outline" class="me-1" aria-hidden="true"></iconify-icon>
    {{ vendorLabel }}
  </span>
  <span v-else class="badge rounded-pill bg-secondary owner-badge">ISC</span>
</template>

<style scoped>
.owner-badge {
  font-weight: 600;
  white-space: nowrap;
}

.owner-badge-clickable {
  cursor: pointer;
}

.owner-badge-clickable:hover {
  filter: brightness(0.94);
  text-decoration: underline;
}
</style>
