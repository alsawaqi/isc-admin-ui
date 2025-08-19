<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'

export interface ContactRow {
  Shippers_Contact_Name: string
  Shippers_Contact_Position?: string | null
  Shippers_Contact_Office_No?: string | null
  Shippers_Contact_GSM_No?: string | null
  Shippers_Contact_Email_Address?: string | null
  Shippers_Is_Primary?: boolean
}

type RowUI = ContactRow & { _uid: string }

const props = defineProps<{ modelValue: ContactRow[] }>()
const emit = defineEmits<{ 'update:modelValue':[ContactRow[]] }>()

// --- helpers ---
const uid = () => Math.random().toString(36).slice(2, 10)
const toUI = (arr: ContactRow[] = []): RowUI[] =>
  arr.map(r => ({ _uid: uid(), ...r }))
const toPayload = (arr: RowUI[]): ContactRow[] =>
  arr.map(({ _uid, ...rest }) => rest)

// --- local state (stable keys) ---
const rows = ref<RowUI[]>(toUI(props.modelValue))

// --- debounce + guard ---
let t: ReturnType<typeof setTimeout> | null = null
const syncingFromParent = ref(false)
const DEBOUNCE = 200

// Sync when parent replaces modelValue (no deep watch to avoid storms)
watch(() => props.modelValue, (v) => {
  syncingFromParent.value = true
  // keep existing rows when possible? we just rebuild with fresh uids to be safe
  rows.value = toUI(v || [])
  syncingFromParent.value = false
}, { deep: false })

// Enforce a single Primary checkbox
watch(rows, (arr) => {
  // Find last checked primary; if multiple, keep the most recent true and unset others
  const primaryIndexes = arr
    .map((r, i) => [r.Shippers_Is_Primary === true, i] as const)
    .filter(([isP]) => isP)
    .map(([, i]) => i)

  if (primaryIndexes.length > 1) {
    const keep = primaryIndexes[primaryIndexes.length - 1]
    arr.forEach((r, i) => { if (i !== keep) r.Shippers_Is_Primary = false })
  }
}, { deep: true })

// Debounced emit to parent (no feedback during sync)
watch(rows, (v) => {
  if (syncingFromParent.value) return
  if (t) clearTimeout(t)
  t = setTimeout(() => {
    emit('update:modelValue', toPayload(v))
  }, DEBOUNCE)
}, { deep: true, flush: 'post' })

onBeforeUnmount(() => { if (t) clearTimeout(t) })

// --- actions ---
const addRow = () => {
  const isFirst = rows.value.length === 0
  rows.value.push({
    _uid: uid(),
    Shippers_Contact_Name: '',
    Shippers_Contact_Position: '',
    Shippers_Contact_Office_No: '',
    Shippers_Contact_GSM_No: '',
    Shippers_Contact_Email_Address: '',
    Shippers_Is_Primary: isFirst
  })
}

const removeRow = (i: number) => {
  const wasPrimary = rows.value[i]?.Shippers_Is_Primary
  rows.value.splice(i, 1)
  // If we removed the primary, set the first row (if any) as primary
  if (wasPrimary && rows.value.length > 0) {
    rows.value.forEach((r, idx) => { r.Shippers_Is_Primary = idx === 0 })
  }
}
</script>

<template>
  <div>
    <div class="d-flex justify-content-end mb-12">
      <button type="button" class="btn btn-primary" @click="addRow">Add Contact</button>
    </div>

    <div v-if="rows.length === 0" class="text-muted">No contacts added.</div>

    <div v-for="(r,i) in rows" :key="r._uid" class="border p-3 radius-8 mb-12">
      <div class="row">
        <div class="col-sm-4 mb-12">
          <label class="form-label text-sm">Contact Name <span class="text-danger-600">*</span></label>
          <input v-model="r.Shippers_Contact_Name" class="form-control radius-8"/>
        </div>
        <div class="col-sm-4 mb-12">
          <label class="form-label text-sm">Position</label>
          <input v-model="r.Shippers_Contact_Position" class="form-control radius-8"/>
        </div>
        <div class="col-sm-4 mb-12">
          <label class="form-label text-sm">Email</label>
          <input v-model="r.Shippers_Contact_Email_Address" type="email" class="form-control radius-8"/>
        </div>

        <div class="col-sm-4 mb-12">
          <label class="form-label text-sm">Office No</label>
          <input v-model="r.Shippers_Contact_Office_No" class="form-control radius-8"/>
        </div>
        <div class="col-sm-4 mb-12">
          <label class="form-label text-sm">GSM No</label>
          <input v-model="r.Shippers_Contact_GSM_No" class="form-control radius-8"/>
        </div>
        <div class="col-sm-4 mb-12 d-flex align-items-center">
          <div class="form-check">
            <input type="checkbox" v-model="r.Shippers_Is_Primary" :id="'p-'+r._uid" class="form-check-input"/>
            <label class="form-check-label" :for="'p-'+r._uid">Primary</label>
          </div>
        </div>
      </div>

      <div class="d-flex justify-content-end">
        <button type="button" class="btn btn-danger" @click="removeRow(i)">Remove</button>
      </div>
    </div>
  </div>
</template>
