<script setup lang="ts">
import { computed } from 'vue'

/**
 * Small vendor contact-info modal (public info only — no bank/financial fields).
 * Shown when staff clicks a vendor owner badge so they can notify the vendor
 * to bring the product for packing.
 */
const props = defineProps<{
  vendor: any
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const title = computed(() => props.vendor?.Vendor_Name || props.vendor?.Trade_Name || 'Vendor')

const contactPerson = computed(() => {
  const name = props.vendor?.Contact_Person_Name
  const role = props.vendor?.Contact_Person_Title
  if (!name && !role) return ''
  if (name && role) return `${name} — ${role}`
  return name || role
})

const rows = computed(() => {
  const v = props.vendor || {}
  return [
    { label: 'Vendor Code', value: v.Vendor_Code },
    { label: 'Trade Name', value: v.Trade_Name },
    { label: 'Contact Person', value: contactPerson.value },
    { label: 'Phone', value: v.Phone_No },
    { label: 'Contact Person Phone', value: v.Contact_Person_Phone },
    { label: 'Email', value: v.Email_1 },
    { label: 'Contact Person Email', value: v.Contact_Person_Email },
  ].filter((row) => row.value !== null && row.value !== undefined && String(row.value).trim() !== '')
})
</script>

<template>
  <div class="vendor-modal-backdrop" @click.self="emit('close')">
    <div class="vendor-modal" role="dialog" aria-modal="true" :aria-label="`Vendor information: ${title}`">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="mb-0 d-flex align-items-center gap-2">
          <iconify-icon icon="solar:shop-2-outline" class="fs-5 text-warning" aria-hidden="true"></iconify-icon>
          {{ title }}
        </h6>
        <button type="button" class="btn btn-sm btn-light" aria-label="Close" @click="emit('close')">×</button>
      </div>

      <table v-if="rows.length" class="table table-sm align-middle mb-0">
        <tbody>
          <tr v-for="row in rows" :key="row.label">
            <td class="text-muted text-nowrap" style="width: 40%;">{{ row.label }}</td>
            <td class="fw-semibold">{{ row.value }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="text-muted small">&mdash;</div>

      <div class="d-flex justify-content-end mt-3">
        <button type="button" class="btn btn-sm btn-secondary" @click="emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vendor-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, .5);
  z-index: 1060;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.vendor-modal {
  width: min(480px, 100%);
  max-height: calc(100vh - 32px);
  overflow: auto;
  background: #fff;
  border-radius: 8px;
  padding: 18px;
  box-shadow: 0 24px 80px rgba(15, 23, 42, .28);
}
</style>
