<script setup lang="ts">
import { definePageMeta, useNuxtApp } from '#imports';
import { ref, onMounted, watch } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'district'
})

const { $axios } = (useNuxtApp() as any);

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

// create form state
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

// UI state
const loadingList = ref<boolean>(false)
const creating = ref<boolean>(false)
const savingEdit = ref<boolean>(false)
const errorMessage = ref<string | null>(null)

// EDIT MODAL STATE
const showEdit = ref<boolean>(false)
const edit_id = ref<number | null>(null)
const edit_Country_Id = ref<number | ''>('')
const edit_Region_Id = ref<number | ''>('')
const edit_District_Code = ref<string>('')
const edit_District_Name = ref<string>('')
const edit_District_Name_Ar = ref<string>('')

// regions list to show inside the edit modal (depends on the chosen country in edit)
const editRegions = ref<Region[]>([])

/* ----------------------- FETCH HELPERS ----------------------- */
const fetchCountries = async () => {
  const { data } = await $axios.get('/api/geo/countries/all')
  countries.value = data
}

const fetchRegions = async () => {
  if (!Country_Id.value) { regions.value = []; return }
  const { data } = await $axios.get('/api/geo/regions/countries', {
    params: { country_id: Country_Id.value }
  })
  regions.value = data
  // ensure current Region_Id is still valid
  if (!regions.value.find(r => r.id === Region_Id.value)) Region_Id.value = ''
}

// load regions for a specific country into editRegions (used in modal)
const fetchRegionsForEdit = async (countryId: number | '') => {
  if (!countryId) { editRegions.value = []; return }
  const { data } = await $axios.get('/api/geo/regions', {
    params: { country_id: countryId }
  })
  editRegions.value = data
  // cleanup edit_Region_Id if not valid anymore
  if (!editRegions.value.find(r => r.id === edit_Region_Id.value)) {
    edit_Region_Id.value = ''
  }
}

const fetchDistricts = async () => {
  loadingList.value = true
  try {
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
  } finally {
    loadingList.value = false
  }
}

/* ----------------------- CREATE ----------------------- */
const submitForm = async () => {
  if (!Region_Id.value) {
    alert('Please select a Region')
    return
  }

  creating.value = true
  errorMessage.value = null

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
    // keep filters (Country_Id, Region_Id) as-is so page stays scoped
    await fetchDistricts()
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || 'Failed to create district.'
    errorMessage.value = msg
    alert('Error: ' + msg)
  } finally {
    creating.value = false
  }
}

/* ----------------------- EDIT ----------------------- */
const openEdit = async (d: District) => {
  errorMessage.value = null

  // preload edit form from row
  edit_id.value = d.id
  edit_District_Code.value = d.District_Code
  edit_District_Name.value = d.District_Name
  edit_District_Name_Ar.value = d.District_Name_Ar || ''

  // infer Country_Id + Region_Id from the district's region
  const regionObj = d.region
  const detectedCountryId = regionObj?.Country_Id ?? regionObj?.country?.id ?? ''
  const detectedRegionId = d.Region_Id ?? ''

  edit_Country_Id.value = detectedCountryId
  edit_Region_Id.value = detectedRegionId

  // load regions for this country into editRegions
  await fetchRegionsForEdit(edit_Country_Id.value)

  showEdit.value = true
}

const saveEdit = async () => {
  if (!edit_id.value) return
  if (!edit_Region_Id.value) {
    alert('Please select a Region')
    return
  }

  savingEdit.value = true
  errorMessage.value = null

  try {
    await $axios.put(`/api/geo/districts/${edit_id.value}`, {
      Region_Id: edit_Region_Id.value,
      District_Code: edit_District_Code.value,
      District_Name: edit_District_Name.value,
      District_Name_Ar: edit_District_Name_Ar.value || null
    })

    showEdit.value = false

    // clear edit refs
    edit_id.value = null
    edit_Country_Id.value = ''
    edit_Region_Id.value = ''
    edit_District_Code.value = ''
    edit_District_Name.value = ''
    edit_District_Name_Ar.value = ''

    await fetchDistricts()
  } catch (err: any) {
    console.error('Failed to update district:', err)
    errorMessage.value =
      err?.response?.data?.message ||
      err?.message ||
      'Failed to update district.'
    // keep modal open for correction
  } finally {
    savingEdit.value = false
  }
}

const closeEdit = () => {
  showEdit.value = false
  edit_id.value = null
  edit_Country_Id.value = ''
  edit_Region_Id.value = ''
  edit_District_Code.value = ''
  edit_District_Name.value = ''
  edit_District_Name_Ar.value = ''
  errorMessage.value = null
}

/* ----------------------- DELETE ----------------------- */
const deleteDistrict = async (id: number) => {
  const yes = confirm('Are you sure you want to delete this district?')
  if (!yes) return

  await $axios.delete(`/api/geo/districts/${id}`)
  await fetchDistricts()
}

/* ----------------------- WATCHERS ----------------------- */
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

// When user changes country in edit modal, reload regions list for edit modal
watch(edit_Country_Id, async (newCountryId) => {
  await fetchRegionsForEdit(newCountryId)
  // if current selected edit_Region_Id isn't valid anymore, it will be cleaned in fetchRegionsForEdit
})

/* ----------------------- INIT ----------------------- */
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
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <select v-model="Country_Id" class="form-control radius-8 w-full">
                  <option value="">-- Select Country --</option>
                  <option v-for="c in countries" :key="c.id" :value="c.id">
                    {{ c.Country_Name }}
                  </option>
                </select>
              </div>
            </div>

            <div class="col-sm-6">
              <div class="mb-20">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Region
                </label>
                <select
                  v-model="Region_Id"
                  class="form-control radius-8 w-full"
                  :disabled="!Country_Id"
                >
                  <option value="">-- Select Region --</option>
                  <option v-for="r in regions" :key="r.id" :value="r.id">
                    {{ r.Region_Name }}
                  </option>
                </select>
              </div>
            </div>

            <div class="col-sm-6">
              <div class="mb-20">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  District Code
                </label>
                <input
                  type="text"
                  v-model="District_Code"
                  class="form-control radius-8 w-full"
                  placeholder="e.g. 101 / A1 / etc."
                />
              </div>
            </div>

            <div class="col-sm-6">
              <div class="mb-20">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  District Name
                </label>
                <input
                  type="text"
                  v-model="District_Name"
                  class="form-control radius-8 w-full"
                />
              </div>
            </div>

            <div class="col-sm-6">
              <div class="mb-20">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  District Name (Ar)
                </label>
                <input
                  type="text"
                  v-model="District_Name_Ar"
                  class="form-control radius-8 w-full"
                  dir="auto"
                />
              </div>
            </div>

            <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
              <button
                type="reset"
                class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8"
                @click="
                  District_Code=''; District_Name=''; District_Name_Ar='';
                  Region_Id=''; Country_Id='';
                  fetchRegions(); fetchDistricts();
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
              placeholder="Search districts/code"
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
            @click="page = Math.max(1, page-1)"
          >
            Prev
          </button>

          <button
            class="btn btn-sm btn-outline-primary"
            @click="page = page+1"
            :disabled="districts.length < perPage"
          >
            Next
          </button>
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
              <th class="text-end">Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loadingList">
              <td colspan="6" class="text-center py-24 text-muted">
                Loading...
              </td>
            </tr>

            <tr
              v-for="d in districts"
              :key="d.id"
            >
              <td>{{ d.region?.country?.Country_Name ?? '-' }}</td>
              <td>{{ d.region?.Region_Name }}</td>
              <td>{{ d.District_Code }}</td>
              <td>{{ d.District_Name }}</td>
              <td>{{ d.District_Name_Ar }}</td>
              <td class="text-end">
                <a
                  href="javascript:void(0)"
                  class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center me-1"
                  title="Edit"
                  @click="openEdit(d)"
                >
                  <iconify-icon icon="lucide:edit"></iconify-icon>
                </a>

                <a
                  href="javascript:void(0)"
                  class="w-32-px h-32-px bg-danger-light text-danger-600 rounded-circle d-inline-flex align-items-center justify-content-center"
                  title="Delete"
                  @click="deleteDistrict(d.id)"
                >
                  <iconify-icon icon="iconamoon:trash-light"></iconify-icon>
                </a>
              </td>
            </tr>

            <tr v-if="!loadingList && districts.length === 0">
              <td colspan="6" class="text-center py-24 text-muted">
                No Districts Found
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
              <h5 class="fw-semibold mb-4">Edit District</h5>
              <small class="text-muted d-block">Update location and names</small>
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

            <!-- District Code -->
            <div class="mb-16">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                District Code
              </label>
              <input
                type="text"
                class="form-control radius-8 w-full"
                v-model="edit_District_Code"
                placeholder="e.g. 101 / A1 / etc."
              />
            </div>

            <!-- District Name -->
            <div class="mb-16">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                District Name
              </label>
              <input
                type="text"
                class="form-control radius-8 w-full"
                v-model="edit_District_Name"
              />
            </div>

            <!-- District Name Arabic -->
            <div class="mb-16">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                District Name (Ar)
              </label>
              <input
                type="text"
                class="form-control radius-8 w-full"
                v-model="edit_District_Name_Ar"
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
