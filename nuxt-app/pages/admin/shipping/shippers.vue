<script setup lang="ts">
import { definePageMeta, useNuxtApp } from '#imports'
import { ref, onMounted, watch } from 'vue'
import { useFlashStore } from '~/stores/flashs'

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'shipping.shippers'
})



interface Shipper {
  id: number
  Shippers_Code: string
  Shippers_Name: string
  Shippers_Address?: string
  Shippers_Office_No?: string
  Shippers_GSM_No?: string
  Shippers_Email_Address?: string
  Shippers_Official_Website_Address?: string
  Shippers_GPS_Location?: string
  Shippers_Scope: string
  Shippers_Type: string
  Shippers_Rate_Mode: string
  Shippers_Is_Active: boolean
  created_at?: string
  contacts_count?: number
}


const { $axios } = (useNuxtApp() as any)
const flash = useFlashStore()

const shippers = ref<Shipper[]>([])

const Shippers_Code = ref('')
const Shippers_Name = ref('')
const Shippers_Email_Address = ref('')
const Shippers_Type = ref('')
const Shippers_Scope = ref('local')
const Shippers_Rate_Mode = ref('weight')
const Shippers_Is_Active = ref(true)

const perPage = ref(20)
const page = ref(1)
const total = ref(0)
const search = ref('')

// fetch list
const fetchShippers = async () => {
  const { data } = await $axios.get('/api/v1/shipping/shippers', {
    params: { per_page: perPage.value, page: page.value, search: search.value || undefined }
  })
  shippers.value = data.data || data
  total.value = data.total ?? shippers.value.length
}

// submit new shipper
const submitForm = async () => {
  try {
    await $axios.post('/api/v1/shipping/shippers', {
      Shippers_Code: Shippers_Code.value,
      Shippers_Name: Shippers_Name.value,
      Shippers_Email_Address: Shippers_Email_Address.value,
      Shippers_Type: Shippers_Type.value,
      Shippers_Scope: Shippers_Scope.value,
      Shippers_Rate_Mode: Shippers_Rate_Mode.value,
      Shippers_Is_Active: Shippers_Is_Active.value
    })
    alert('Shipper created successfully!')
    Shippers_Code.value = ''
    Shippers_Name.value = ''
    Shippers_Email_Address.value = ''
    Shippers_Type.value = ''
    Shippers_Scope.value = 'local'
    Shippers_Rate_Mode.value = 'weight'
    Shippers_Is_Active.value = true
    await fetchShippers()
  } catch (err: any) {
    alert('Error: ' + (err?.response?.data?.message || err?.message))
  }
}

// toggle active
const toggleActive = async (id: number) => {
  await $axios.post(`/api/v1/shipping/shippers/${id}/toggle`)
  await fetchShippers()
}

// delete
const deleteShipper = async (id: number) => {
     const ok = await flash.confirm({
    title: 'Delete shipper?',
    message: `Are you sure you want to delete this shipper? This cannot be undone.`,
    confirmText: 'Yes, delete',
    cancelText: 'No, cancel',
  })
  if (!ok) return;
 
  await $axios.delete(`/api/v1/shipping/shippers/${id}`)
  flash.success('Shipper deleted successfully.')
  await fetchShippers()
}

watch([perPage, page, search], fetchShippers)
onMounted(fetchShippers)
</script>

<template>
  <div class="dashboard-main-body">

    <!-- Header -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color:#ef4444">Shippers</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">Shippers</li>
      </ul>
    </div>



    <!-- Table -->
    <div class="card">
      <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div class="d-flex flex-wrap align-items-center gap-3">
          <div class="d-flex align-items-center gap-2">
            <span>Show</span>
            <select v-model.number="perPage" class="form-select form-select-sm w-auto">
              <option :value="10">10</option>
              <option :value="15">15</option>
              <option :value="20">20</option>
            </select>
          </div>
          <div class="icon-field">
            <input v-model="search" type="text" class="form-control form-control-sm w-auto"
              placeholder="Search shipper">
            <span class="icon">
              <iconify-icon icon="ion:search-outline"></iconify-icon>
            </span>
          </div>
        </div>
      </div>

      <div class="card-body">
        <table class="table bordered-table mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>Code</th>
              <th>Name</th>
              <th>Email</th>
              <th>Scope</th>
              <th>Type</th>
              <th>Rate Mode</th>
              <th>Active</th>
              <th>Contacts</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, i) in shippers" :key="s.id">
              <td>{{ (page - 1) * perPage + i + 1 }}</td>
              <td>{{ s.Shippers_Code }}</td>
              <td>{{ s.Shippers_Name }}</td>
              <td>{{ s.Shippers_Email_Address }}</td>
              <td>{{ s.Shippers_Scope }}</td>
              <td>{{ s.Shippers_Type }}</td>
              <td>{{ s.Shippers_Rate_Mode }}</td>
              <td>
                <span :class="s.Shippers_Is_Active ? 'text-success' : 'text-danger'">
                  {{ s.Shippers_Is_Active ? 'Yes' : 'No' }}
                </span>
              </td>
              <td>{{ s.contacts_count || 0 }}</td>
              <td>
                <NuxtLink :to="`/admin/shipping/${s.id}`"
                  class="w-32-px h-32-px bg-primary-light text-primary-600 rounded-circle d-inline-flex align-items-center justify-content-center">
                  <iconify-icon icon="iconamoon:eye-light"></iconify-icon>
                </NuxtLink>
                <a href="javascript:void(0)"
                  class="w-32-px h-32-px bg-danger-light text-danger-600 rounded-circle d-inline-flex align-items-center justify-content-center"
                  @click="deleteShipper(s.id)">
                  <iconify-icon icon="iconamoon:trash-light"></iconify-icon>
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
