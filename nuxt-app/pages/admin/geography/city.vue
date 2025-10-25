<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'cities'
})

import { ref, onMounted, watch } from 'vue'
const { $axios } = useNuxtApp()

interface Country {
  id: number;
  Country_Name: string;
}
interface Region {
  id: number;
  Country_Id: number;
  Region_Name: string;
}
interface District {
  id: number;
  Region_Id: number;
  District_Name: string;
  District_Code: string;
}
interface City {
  id: number;
  City_Code?: string;
  City_Name: string;
  City_Name_Ar?: string;
  District_Id: number;
  district?: {
    District_Name: string;
    region?: {
      id: number;
      Region_Name: string;
      country?: { Country_Name: string; id?: number };
    }
  }
}

/* ---------- main lists ---------- */
const countries = ref<Country[]>([])
const regions = ref<Region[]>([])
const districts = ref<District[]>([])
const cities = ref<City[]>([])

/* ---------- create form state ---------- */
const Country_Id = ref<number | ''>('')
const Region_Id = ref<number | ''>('')
const District_Id = ref<number | ''>('')

const City_Code = ref<string>('')
const City_Name = ref<string>('')
const City_Name_Ar = ref<string>('')

/* ---------- table state ---------- */
const perPage = ref(20)
const page = ref(1)
const total = ref(0)
const search = ref('')

/* ---------- ui state ---------- */
const loadingList = ref<boolean>(false)
const creating = ref<boolean>(false)
const savingEdit = ref<boolean>(false)
const errorMessage = ref<string | null>(null)

/* ---------- edit modal state ---------- */
const showEdit = ref<boolean>(false)
const edit_id = ref<number | null>(null)
const edit_Country_Id = ref<number | ''>('')
const edit_Region_Id = ref<number | ''>('')
const edit_District_Id = ref<number | ''>('')

const edit_City_Code = ref<string>('')
const edit_City_Name = ref<string>('')
const edit_City_Name_Ar = ref<string>('')

/* lists for modal cascading dropdowns */
const editRegions = ref<Region[]>([])
const editDistricts = ref<District[]>([])

/* ---------- API helpers ---------- */
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
  loadingList.value = true
  try {
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
  } finally {
    loadingList.value = false
  }
}

/* ---------- CREATE ---------- */
const submitForm = async () => {
  if (!District_Id.value) {
    alert('Please select a District')
    return
  }

  creating.value = true
  errorMessage.value = null

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
    const msg = error?.response?.data?.message || error?.message || 'Failed to create city.'
    errorMessage.value = msg
    alert('Error: ' + msg)
  } finally {
    creating.value = false
  }
}

/* ---------- EDIT MODAL HELPERS ---------- */
const fetchRegionsForEdit = async (countryId: number | '') => {
  editRegions.value = []
  editDistricts.value = []
  edit_Region_Id.value = ''
  edit_District_Id.value = ''
  if (!countryId) return
  const { data } = await $axios.get(`/api/geo/regions/by-country/${countryId}`)
  editRegions.value = data
}

const fetchDistrictsForEdit = async (regionId: number | '') => {
  editDistricts.value = []
  edit_District_Id.value = ''
  if (!regionId) return
  const { data } = await $axios.get(`/api/geo/districts/by-region/${regionId}`)
  editDistricts.value = data
}

/* ---------- OPEN EDIT ---------- */
const openEdit = async (c: City) => {
  errorMessage.value = null

  // derive country_id, region_id, district_id from nested relations (best effort)
  const currentDistrictId = c.District_Id ?? ''
  const currentRegionId =
    c.district?.region ? c.district.region.id ?? '' : ''
  const currentCountryId =
    c.district?.region?.country ? (c.district.region.country as any).id ?? '' : ''

  edit_id.value = c.id
  edit_City_Code.value = c.City_Code || ''
  edit_City_Name.value = c.City_Name
  edit_City_Name_Ar.value = c.City_Name_Ar || ''

  // set these first so watchers/loads work
  edit_Country_Id.value = currentCountryId
  edit_Region_Id.value = currentRegionId
  edit_District_Id.value = currentDistrictId

  // load dropdown data
  await fetchRegionsForEdit(edit_Country_Id.value)
  // after regions are loaded, if we still have an existing region, keep it
  edit_Region_Id.value = currentRegionId || ''
  await fetchDistrictsForEdit(edit_Region_Id.value)
  // after districts are loaded, re-assert district
  edit_District_Id.value = currentDistrictId || ''

  showEdit.value = true
}

/* ---------- SAVE EDIT ---------- */
const saveEdit = async () => {
  if (!edit_id.value) return
  if (!edit_District_Id.value) {
    alert('Please select a District')
    return
  }

  savingEdit.value = true
  errorMessage.value = null

  try {
    await $axios.put(`/api/geo/cities/${edit_id.value}`, {
      District_Id: edit_District_Id.value,
      City_Code: edit_City_Code.value || null,
      City_Name: edit_City_Name.value,
      City_Name_Ar: edit_City_Name_Ar.value || null
    })

    showEdit.value = false

    // clear edit refs
    edit_id.value = null
    edit_Country_Id.value = ''
    edit_Region_Id.value = ''
    edit_District_Id.value = ''
    edit_City_Code.value = ''
    edit_City_Name.value = ''
    edit_City_Name_Ar.value = ''
    editRegions.value = []
    editDistricts.value = []

    await fetchCities()
  } catch (error: any) {
    console.error('Failed to update city:', error)
    errorMessage.value =
      error?.response?.data?.message ||
      error?.message ||
      'Failed to update city.'
    // keep modal open to let user fix
  } finally {
    savingEdit.value = false
  }
}

/* ---------- CLOSE EDIT ---------- */
const closeEdit = () => {
  showEdit.value = false
  edit_id.value = null
  edit_Country_Id.value = ''
  edit_Region_Id.value = ''
  edit_District_Id.value = ''
  edit_City_Code.value = ''
  edit_City_Name.value = ''
  edit_City_Name_Ar.value = ''
  editRegions.value = []
  editDistricts.value = []
  errorMessage.value = null
}

/* ---------- DELETE ---------- */
const deleteCity = async (id: number) => {
  const yes = confirm('Are you sure you want to delete this city?')
  if (!yes) return
  await $axios.delete(`/api/geo/cities/${id}`)
  await fetchCities()
}

/* ---------- WATCHERS: main form + table ---------- */
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

/* ---------- WATCHERS: edit modal cascading ---------- */
watch(edit_Country_Id, async (newCountry) => {
  await fetchRegionsForEdit(newCountry)
})
watch(edit_Region_Id, async (newRegion) => {
  await fetchDistrictsForEdit(newRegion)
})

/* ---------- INIT ---------- */
onMounted(async () => {
  await fetchCountries()
  await fetchCities()
})
</script>

<template>
  <div class="dashboard-main-body">
    <!-- Header -->
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

    <!-- Create Form -->
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
            <input type="text" v-model="City_Name_Ar" class="form-control radius-8 w-full" dir="auto" />
          </div>

          <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
            <button
              type="reset"
              class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8"
              @click="
                Country_Id=''; Region_Id=''; District_Id='';
                City_Code=''; City_Name=''; City_Name_Ar='';
                fetchRegions(); fetchDistricts(); fetchCities();
              "
            >
              Reset
            </button>

            <button
              type="submit"
              class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"
              :disabled="creating"
            >
              <span v-if="creating">Saving...</span>
              <span v-else>Save Change</span>
            </button>
          </div>

          <div v-if="errorMessage" class="alert alert-danger py-8 px-12 mt-3" role="alert">
            {{ errorMessage }}
          </div>
        </form>
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div class="d-flex flex-wrap align-items-center gap-3">
          <div class="icon-field">
            <input
              v-model="search"
              type="text"
              class="form-control form-control-sm w-auto"
              placeholder="Search city/code"
            />
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
          <button
            class="btn btn-sm btn-outline-primary me-2"
            @click="page = Math.max(1, page - 1)"
          >
            Prev
          </button>

          <button
            class="btn btn-sm btn-outline-primary"
            @click="page = page + 1"
            :disabled="cities.length < perPage"
          >
            Next
          </button>
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
              <th class="text-end">Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loadingList">
              <td colspan="8" class="text-center py-24 text-muted">
                Loading...
              </td>
            </tr>

            <tr v-for="(c, i) in cities" :key="c.id">
              <td>{{ i + 1 }}</td>
              <td>{{ c.district?.region?.country?.Country_Name ?? '-' }}</td>
              <td>{{ c.district?.region?.Region_Name ?? '-' }}</td>
              <td>{{ c.district?.District_Name ?? '-' }}</td>
              <td>{{ c.City_Code || '-' }}</td>
              <td>{{ c.City_Name }}</td>
              <td>{{ c.City_Name_Ar || '-' }}</td>
              <td class="text-end">
                <a
                  href="javascript:void(0)"
                  class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center me-1"
                  title="Edit"
                  @click="openEdit(c)"
                >
                  <iconify-icon icon="lucide:edit"></iconify-icon>
                </a>

                <a
                  href="javascript:void(0)"
                  class="w-32-px h-32-px bg-danger-light text-danger-600 rounded-circle d-inline-flex align-items-center justify-content-center"
                  title="Delete"
                  @click="deleteCity(c.id)"
                >
                  <iconify-icon icon="iconamoon:trash-light"></iconify-icon>
                </a>
              </td>
            </tr>

            <tr v-if="!loadingList && cities.length === 0">
              <td colspan="8" class="text-center py-24 text-muted">
                No Cities Found
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- EDIT MODAL WITH FADE+SCALE -->
    <transition name="fade-scale" appear>
      <div
        v-if="showEdit"
        class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
        style="background:rgba(0,0,0,0.5); z-index:1050;"
      >
        <div
          class="bg-white radius-12 shadow p-24"
          style="min-width:320px; max-width:480px; width:100%; position:relative;"
        >
          <!-- header -->
          <div class="d-flex justify-content-between align-items-start mb-16">
            <div>
              <h5 class="fw-semibold mb-4">Edit City</h5>
              <small class="text-muted d-block">Update city details</small>
            </div>
            <button
              type="button"
              class="btn-close"
              aria-label="Close"
              @click="closeEdit"
            ></button>
          </div>

          <!-- body -->
          <div>
            <!-- Country -->
            <div class="mb-16">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Country <span class="text-danger-600">*</span>
              </label>
              <select
                v-model="edit_Country_Id"
                class="form-control radius-8 w-full"
              >
                <option value="">-- Select Country --</option>
                <option
                  v-for="c in countries"
                  :key="c.id"
                  :value="c.id"
                >
                  {{ c.Country_Name }}
                </option>
              </select>
            </div>

            <!-- Region -->
            <div class="mb-16">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Region <span class="text-danger-600">*</span>
              </label>
              <select
                v-model="edit_Region_Id"
                class="form-control radius-8 w-full"
                :disabled="!edit_Country_Id"
              >
                <option value="">-- Select Region --</option>
                <option
                  v-for="r in editRegions"
                  :key="r.id"
                  :value="r.id"
                >
                  {{ r.Region_Name }}
                </option>
              </select>
            </div>

            <!-- District -->
            <div class="mb-16">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                District <span class="text-danger-600">*</span>
              </label>
              <select
                v-model="edit_District_Id"
                class="form-control radius-8 w-full"
                :disabled="!edit_Region_Id"
              >
                <option value="">-- Select District --</option>
                <option
                  v-for="d in editDistricts"
                  :key="d.id"
                  :value="d.id"
                >
                  {{ d.District_Name }}
                </option>
              </select>
            </div>

            <!-- City Code -->
            <div class="mb-16">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                City Code
              </label>
              <input
                type="text"
                class="form-control radius-8 w-full"
                v-model="edit_City_Code"
                placeholder="Optional short code"
              />
            </div>

            <!-- City Name -->
            <div class="mb-16">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                City Name
              </label>
              <input
                type="text"
                class="form-control radius-8 w-full"
                v-model="edit_City_Name"
              />
            </div>

            <!-- City Name Arabic -->
            <div class="mb-16">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                City Name (Ar)
              </label>
              <input
                type="text"
                class="form-control radius-8 w-full"
                v-model="edit_City_Name_Ar"
                dir="auto"
              />
            </div>

            <div v-if="errorMessage" class="alert alert-danger py-8 px-12" role="alert">
              {{ errorMessage }}
            </div>
          </div>

          <!-- footer -->
          <div class="d-flex justify-content-end gap-2 mt-24">
            <button
              type="button"
              class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-24 py-12 radius-8"
              @click="closeEdit"
            >
              Cancel
            </button>

            <button
              type="button"
              class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"
              :disabled="savingEdit"
              @click="saveEdit"
            >
              <span v-if="savingEdit">Saving...</span>
              <span v-else>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
