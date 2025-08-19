<script setup lang="ts">
import { ref, watch } from 'vue'

export interface ContactRow {
  Shippers_Contact_Name: string
  Shippers_Contact_Position?: string | null
  Shippers_Contact_Office_No?: string | null
  Shippers_Contact_GSM_No?: string | null
  Shippers_Contact_Email_Address?: string | null
  Shippers_Is_Primary?: boolean
}

const props = defineProps<{ modelValue: ContactRow[] }>()
const emit = defineEmits<{ 'update:modelValue':[ContactRow[]] }>()
const rows = ref<ContactRow[]>(JSON.parse(JSON.stringify(props.modelValue || [])))

watch(() => props.modelValue, v => rows.value = JSON.parse(JSON.stringify(v || [])))
watch(rows, v => emit('update:modelValue', v), { deep: true })

const addRow = () => rows.value.push({
  Shippers_Contact_Name: '',
  Shippers_Contact_Position: '',
  Shippers_Contact_Office_No: '',
  Shippers_Contact_GSM_No: '',
  Shippers_Contact_Email_Address: '',
  Shippers_Is_Primary: rows.value.length === 0 // first one default primary
})
const removeRow = (i:number) => rows.value.splice(i,1)
</script>

<template>
  <div>
    <div class="d-flex justify-content-end mb-12">
      <button type="button" class="btn btn-primary" @click="addRow">Add Contact</button>
    </div>

    <div v-if="rows.length === 0" class="text-muted">No contacts added.</div>

    <div v-for="(r,i) in rows" :key="i" class="border p-3 radius-8 mb-12">
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
            <input type="checkbox" v-model="r.Shippers_Is_Primary" :id="'p-'+i" class="form-check-input"/>
            <label class="form-check-label" :for="'p-'+i">Primary</label>
          </div>
        </div>
      </div>

      <div class="d-flex justify-content-end">
        <button type="button" class="btn btn-danger" @click="removeRow(i)">Remove</button>
      </div>
    </div>
  </div>
</template>
