<script setup lang="ts">
export interface ContactRow {
  Shippers_Contact_Name: string
  Shippers_Contact_Position?: string | null
  Shippers_Contact_Office_No?: string | null
  Shippers_Contact_GSM_No?: string | null
  Shippers_Contact_Email_Address?: string | null
  Shippers_Is_Primary?: boolean
}

/**
 * Two-way binding to the parent with v-model:
 * <ShipperFormContacts v-model="contacts" />
 */
const rows = defineModel<ContactRow[]>({ default: [] })

const addRow = () => {
  const isFirst = rows.value.length === 0
  rows.value.push({
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
  // keep exactly one primary if any rows remain
  if (wasPrimary && rows.value.length > 0) {
    rows.value.forEach((r, idx) => (r.Shippers_Is_Primary = idx === 0))
  }
}

// Ensure exactly one primary — simple, explicit, no watchers
const setPrimary = (i: number) => {
  rows.value.forEach((r, idx) => (r.Shippers_Is_Primary = idx === i))
}
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
          <input v-model="rows[i].Shippers_Contact_Name" class="form-control radius-8"/>
        </div>
        <div class="col-sm-4 mb-12">
          <label class="form-label text-sm">Position</label>
          <input v-model="rows[i].Shippers_Contact_Position" class="form-control radius-8"/>
        </div>
        <div class="col-sm-4 mb-12">
          <label class="form-label text-sm">Email</label>
          <input v-model="rows[i].Shippers_Contact_Email_Address" type="email" class="form-control radius-8"/>
        </div>

        <div class="col-sm-4 mb-12">
          <label class="form-label text-sm">Office No</label>
          <input v-model="rows[i].Shippers_Contact_Office_No" class="form-control radius-8"/>
        </div>
        <div class="col-sm-4 mb-12">
          <label class="form-label text-sm">GSM No</label>
          <input v-model="rows[i].Shippers_Contact_GSM_No" class="form-control radius-8"/>
        </div>
        <div class="col-sm-4 mb-12 d-flex align-items-center">
          <div class="form-check">
            <!-- keep one primary: clicking sets this one as primary -->
            <input
              type="checkbox"
              :checked="r.Shippers_Is_Primary === true"
              @change="setPrimary(i)"
              :id="'p-'+i"
              class="form-check-input"
            />
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
