<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'district'
})

import { ref, onMounted, watch } from 'vue'
const { $axios } = useNuxtApp()

interface Country {
  id: number
  Country_Name: string
}

interface Region {
  id: number
  Region_Name: string
  Country_Id: number
  country?: Country
}

interface District {
  id: number
  Region_Id: number
  District_Code: string
  District_Name: string
  District_Name_Ar?: string
  region?: Region
}

const countries = ref<Country[]>([])
const regions = ref<Region[]>([])
const districts = ref<District[]>([])

const Country_Id = ref<number | ''>('')
const Region_Id = ref<number | ''>('')

const District_Code = ref<string>('')
const District_Name = ref<string>('')
const District_Name_Ar = ref<string>('')

// table state
const search = ref<string>('')
const perPage = ref<number>(20)
const page = ref<number>(1)
const total = ref<number>(0)

const fetchCountries = async () => {
  const { data } = await $axios.get('/api/geo/countries')
  countries.value = data
}

const fetchRegions = async () => {
  if (!Country_Id.value) { regions.value = []; return }
  const { data } = await $axios.get('/api/geo/regions', { params: { country_id: Country_Id.value } })
  regions.value = data
  // if selected Region_Id is not in the new list, reset it
  if (!regions.value.find(r => r.id === Region_Id.value)) Region_Id.value = ''
}

const fetchDistricts = async () => {
  const { data } = await $axios.get('/api/geo/districts', {
    params: {
      country_id: Country_Id.value || undefined,
      region_id: Region_Id.value || undefined,
      search: search.value || undefined,
      per_page: perPage.value,
      page: page.value
    }
  })
  districts.value = data.data
  total.value = data.total
}

const submitForm = async () => {
  if (!Region_Id.value) { alert('Please select a Region'); return }
  try {
    await $axios.post('/api/geo/districts', {
      Region_Id: Region_Id.value,
      District_Code: District_Code.value,
      District_Name: District_Name.value,
      District_Name_Ar: District_Name_Ar.value || null
    })
    alert('District created successfully')
    // reset
    District_Code.value = ''
    District_Name.value = ''
    District_Name_Ar.value = ''
    await fetchDistricts()
  } catch (err: any) {
    alert('Error: ' + (err?.response?.data?.message || err?.message))
  }
}

// reactive reloads
watch(Country_Id, async () => {
  await fetchRegions()
  page.value = 1
  await fetchDistricts()
})
watch(Region_Id, async () => {
  page.value = 1
  await fetchDistricts()
})
watch([search, perPage, page], fetchDistricts)

onMounted(async () => {
  await fetchCountries()
  await fetchRegions()
  await fetchDistricts()
})
</script>

<template>
  <div class="dashboard-main-body">
    <!-- Header -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #f97316">Create District</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">Create District</li>
      </ul>
    </div>

    <!-- Form -->
    <div class="card h-100 p-0 radius-12 overflow-hidden mb-24">
      <div class="card-body p-40">
        <form @submit.prevent="submitForm" class="row g-4">
          <div class="row">
            <div class="col-sm-6">
              <div class="mb-20">
                <label class="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select v-model="Country_Id" class="form-control radius-8 w-full">
                  <option value="">-- Select Country --</option>
                  <option v-for="c in countries" :key="c.id" :value="c.id">{{ c.Country_Name }}</option>
                </select>
              </div>
            </div>

            <div class="col-sm-6">
              <div class="mb-20">
                <label class="block text-sm font-medium text-gray-700 mb-1">Region</label>
                <select v-model="Region_Id" class="form-control radius-8 w-full" :disabled="!Country_Id">
                  <option value="">-- Select Region --</option>
                  <option v-for="r in regions" :key="r.id" :value="r.id">{{ r.Region_Name }}</option>
                </select>
              </div>
            </div>

             

            <div class="col-sm-6">
              <div class="mb-20">
                <label class="block text-sm font-medium text-gray-700 mb-1">District Name</label>
                <input type="text" v-model="District_Name" class="form-control radius-8 w-full" />
              </div>
            </div>

            <div class="col-sm-6">
              <div class="mb-20">
                <label class="block text-sm font-medium text-gray-700 mb-1">District Name (Ar)</label>
                <input type="text" v-model="District_Name_Ar" class="form-control radius-8 w-full" />
              </div>
            </div>

            <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
              <button type="reset" class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8"
                @click="
                  District_Code=''; District_Name=''; District_Name_Ar=''; Region_Id=''; Country_Id='';
                  fetchRegions(); fetchDistricts();
                ">
                Reset
              </button>
              <button type="submit" class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8">
                Save Change
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div class="d-flex flex-wrap align-items-center gap-3">
          <div class="icon-field">
            <input v-model="search" type="text" class="form-control form-control-sm w-auto" placeholder="Search districts/code">
            <span class="icon"><iconify-icon icon="ion:search-outline" /></span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span>Show</span>
            <select v-model.number="perPage" class="form-select form-select-sm w-auto">
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
            </select>
          </div>
        </div>
        <div>
          <button class="btn btn-sm btn-outline-primary me-2" @click="page = Math.max(1, page-1)">Prev</button>
          <button class="btn btn-sm btn-outline-primary" @click="page = page+1" :disabled="districts.length < perPage">Next</button>
        </div>
      </div>

      <div class="card-body">
        <table class="table bordered-table mb-0">
          <thead>
            <tr>
              <th>Country</th>
              <th>Region</th>
              <th>District Code</th>
              <th>District Name</th>
              <th>District (Ar)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in districts" :key="d.id">
                <td>{{ d.region?.country?.Country_Name ?? '-' }}</td>
              <td>{{ d.region?.Region_Name || regions.find(r => r.id === d.Region_Id)?.Region_Name }}</td>
              <td>{{ d.District_Code }}</td>
              <td>{{ d.District_Name }}</td>
              <td>{{ d.District_Name_Ar }}</td>
              <td>
                <!-- Hook up edit/delete as needed -->
                <button class="btn btn-sm btn-danger" @click="async () => { await $axios.delete(`/api/geo/districts/${d.id}`); await fetchDistricts(); }">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>
