<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'cities'
})

import { ref, onMounted, watch } from 'vue'
const { $axios } = useNuxtApp()

interface Country { id: number; Country_Name: string }
interface Region { id: number; Country_Id: number; Region_Name: string }
interface District { id: number; Region_Id: number; District_Name: string; District_Code: string }

interface City {
  id: number
  City_Code?: string
  City_Name: string
  City_Name_Ar?: string
  District_Id: number
  district?: {
    District_Name: string
    region?: {
      Region_Name: string
      country?: { Country_Name: string }
    }
  }
}

const countries = ref<Country[]>([])
const regions = ref<Region[]>([])
const districts = ref<District[]>([])
const cities = ref<City[]>([])

const Country_Id = ref<number | ''>('')
const Region_Id = ref<number | ''>('')
const District_Id = ref<number | ''>('')

const City_Code = ref<string>('')
const City_Name = ref<string>('')
const City_Name_Ar = ref<string>('')

const perPage = ref(20)
const page = ref(1)
const total = ref(0)
const search = ref('')

const fetchCountries = async () => {
  const { data } = await $axios.get('/api/geo/countries')
  countries.value = data
}

const fetchRegions = async () => {
  regions.value = []
  districts.value = []
  Region_Id.value = ''
  District_Id.value = ''
  if (!Country_Id.value) return
  const { data } = await $axios.get(`/api/geo/regions/by-country/${Country_Id.value}`)
  regions.value = data
}

const fetchDistricts = async () => {
  districts.value = []
  District_Id.value = ''
  if (!Region_Id.value) return
  const { data } = await $axios.get(`/api/geo/districts/by-region/${Region_Id.value}`)
  districts.value = data
}

const fetchCities = async () => {
  const { data } = await $axios.get('/api/geo/cities', {
    params: {
      country_id: Country_Id.value || undefined,
      region_id: Region_Id.value || undefined,
      district_id: District_Id.value || undefined,
      search: search.value || undefined,
      per_page: perPage.value,
      page: page.value
    }
  })
  cities.value = data.data
  total.value = data.total
}

const submitForm = async () => {
  if (!District_Id.value) { alert('Please select a District'); return }
  try {
    await $axios.post('/api/geo/cities', {
      District_Id: District_Id.value,
      City_Code: City_Code.value || null,
      City_Name: City_Name.value,
      City_Name_Ar: City_Name_Ar.value || null
    })
    alert('City created successfully')
    City_Code.value = ''
    City_Name.value = ''
    City_Name_Ar.value = ''
    await fetchCities()
  } catch (error: any) {
    alert('Error: ' + (error?.response?.data?.message || error?.message))
  }
}

// watchers for cascade + table
watch(Country_Id, async () => {
  page.value = 1
  await fetchRegions()
  await fetchCities()
})
watch(Region_Id, async () => {
  page.value = 1
  await fetchDistricts()
  await fetchCities()
})
watch(District_Id, async () => {
  page.value = 1
  await fetchCities()
})
watch([search, perPage, page], fetchCities)

onMounted(async () => {
  await fetchCountries()
  await fetchCities()
})
</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #f97316">Create City</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg" />
            Dashboard
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">Create City</li>
      </ul>
    </div>

    <div class="card h-100 p-0 radius-12 overflow-hidden mb-24">
      <div class="card-body p-40">
        <form @submit.prevent="submitForm" class="row g-4">
          <div class="col-sm-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <select v-model="Country_Id" class="form-control radius-8 w-full">
              <option value="">-- Select Country --</option>
              <option v-for="c in countries" :key="c.id" :value="c.id">{{ c.Country_Name }}</option>
            </select>
          </div>

          <div class="col-sm-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Region</label>
            <select v-model="Region_Id" class="form-control radius-8 w-full" :disabled="!Country_Id">
              <option value="">-- Select Region --</option>
              <option v-for="r in regions" :key="r.id" :value="r.id">{{ r.Region_Name }}</option>
            </select>
          </div>

          <div class="col-sm-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">District</label>
            <select v-model="District_Id" class="form-control radius-8 w-full" :disabled="!Region_Id">
              <option value="">-- Select District --</option>
              <option v-for="d in districts" :key="d.id" :value="d.id">{{ d.District_Name }}</option>
            </select>
          </div>

          <div class="col-sm-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">City Code (optional)</label>
            <input type="text" v-model="City_Code" class="form-control radius-8 w-full" />
          </div>

          <div class="col-sm-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">City Name</label>
            <input type="text" v-model="City_Name" class="form-control radius-8 w-full" />
          </div>

          <div class="col-sm-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">City Name (Ar)</label>
            <input type="text" v-model="City_Name_Ar" class="form-control radius-8 w-full" />
          </div>

          <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
            <button type="reset"
              class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8"
              @click="
                Country_Id=''; Region_Id=''; District_Id='';
                City_Code=''; City_Name=''; City_Name_Ar='';
                fetchRegions(); fetchDistricts(); fetchCities();
              ">
              Reset
            </button>
            <button type="submit" class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8">
              Save Change
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="card">
      <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div class="d-flex flex-wrap align-items-center gap-3">
          <div class="icon-field">
            <input v-model="search" type="text" class="form-control form-control-sm w-auto" placeholder="Search city/code" />
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
          <button class="btn btn-sm btn-outline-primary me-2" @click="page = Math.max(1, page - 1)">Prev</button>
          <button class="btn btn-sm btn-outline-primary" @click="page = page + 1" :disabled="cities.length < perPage">Next</button>
        </div>
      </div>

      <div class="card-body">
        <table class="table bordered-table mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>Country</th>
              <th>Region</th>
              <th>District</th>
              <th>City Code</th>
              <th>City Name</th>
              <th>City (Ar)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(c, i) in cities" :key="c.id">
              <td>{{ i + 1 }}</td>
              <td>{{ c.district?.region?.country?.Country_Name ?? '-' }}</td>
              <td>{{ c.district?.region?.Region_Name ?? '-' }}</td>
              <td>{{ c.district?.District_Name ?? '-' }}</td>
              <td>{{ c.City_Code || '-' }}</td>
              <td>{{ c.City_Name }}</td>
              <td>{{ c.City_Name_Ar || '-' }}</td>
              <td>
                <!-- Hook your edit modal here -->
                <button class="btn btn-sm btn-danger"
                        @click="async () => { await $axios.delete(`/api/geo/cities/${c.id}`); await fetchCities(); }">
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>
