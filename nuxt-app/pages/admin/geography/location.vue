<script setup lang="ts">
import { definePageMeta, useNuxtApp } from '#imports';
import { ref, onMounted, watch, reactive } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'cities'
})

const { $axios } = (useNuxtApp() as any);



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
  District_Id: number;
  City_Name: string;
  City_Code: string;
}

interface Location {
  id: number;
  City_Id: number;
  city: City;
  Location_Name: string;
  Location_Name_Ar: string;
}

const countries = ref<Country[]>([])
const regions = ref<Region[]>([])
const districts = ref<District[]>([])
const city = ref<City[]>([])
const loading = ref<boolean>(false)
const isSubmitting = ref<boolean>(false)
const isToggle = ref<boolean>(false);
const isSubmitUpdate = ref<boolean>(false);


/* ---------- table state ---------- */
 
const search = ref('')



const Country_Id = ref<number | ''>('')
const Region_Id = ref<number | ''>('')
const District_Id = ref<number | ''>('')
const City_Id = ref<number | ''>('')
const Location_Name = ref<string>('')
const Location_Name_Ar = ref<string>('')
const locations = ref<Location[]>([]);


const editLocation = reactive<Location>({
  id: 0,
  City_Id: 0,
  city: {
    id: 0,
    District_Id: 0,
    City_Name: '',
    City_Code: ''
  },
  Location_Name: '',
  Location_Name_Ar: ''


});

const table = reactive({
  page: 1,
  perPage: 10,
  search: '',
  sortBy: 'id',
  sortDir: 'desc',
})

// paginator info from backend
const pagination = ref({
  total: 0,
  from: 0,
  to: 0,
  last_page: 1,
})


const fetchCountries = async () => {
  const { data } = await $axios.get('/api/geo/countries/all')
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
  city.value = []
  if (!District_Id.value) return
  const { data } = await $axios.get(`/api/geo/cities/by-district/${District_Id.value}`)
  city.value = data
}



watch(Country_Id, async () => {
  table.page = 1
  await fetchRegions()

})
watch(Region_Id, async () => {
  table.page = 1
  await fetchDistricts()

})
watch(District_Id, async () => {
  table.page = 1
  await fetchCities()

})








const fetchlocations = async () => {

  loading.value = true;

  try {

    const { data } = await $axios.get('/api/locations', {
      params: {
        page: table.page,
        per_page: table.perPage,
        search: table.search
      }
    })
    locations.value = data.data
    pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }


    console.log('Fetched locations:', locations.value);





  } catch (error) {

  } finally {
    loading.value = false;
  }

}

watch(
  () => [table.page, table.perPage, table.search, table.sortBy, table.sortDir],
 async () => {
    await fetchlocations()
  }
)


const submitForm = async () => {

  isSubmitting.value = true;


  const payload = {
    City_Id: City_Id.value,
    Location_Name: Location_Name.value,
    Location_Name_Ar: Location_Name_Ar.value
  }



  try {
    await $axios.post('/api/locations', payload);


    City_Id.value = ''
    Location_Name.value = ''
    Location_Name_Ar.value = ''



  } catch (error) {
    console.error('Failed to create location:', error);
    alert('Failed to create location. Please try again.');
  } finally {
    await fetchlocations()
    isSubmitting.value = false;

  }
}


const TogglePopup = (location?: Location) => {
  isToggle.value = !isToggle.value;
  if (location) {
    console.log('Edit location:', location);
    editLocation.id = location.id;
    editLocation.City_Id = location.City_Id;
    editLocation.city = location.city;
    editLocation.Location_Name = location.Location_Name;
    editLocation.Location_Name_Ar = location.Location_Name_Ar;
  }
};

const TogglePopupclose = () => {
   isToggle.value = !isToggle.value;
};



const updateLocation = async () => {
  isSubmitUpdate.value = true;

  const payload = {
    City_Id: editLocation.City_Id,
    Location_Name: editLocation.Location_Name,
    Location_Name_Ar: editLocation.Location_Name_Ar
  };

  try {
    await $axios.put(`/api/locations/${editLocation.id}`, payload);
    TogglePopupclose();
    await fetchlocations();
  } catch (error) {
    console.error('Failed to update location:', error);
    alert('Failed to update location. Please try again.');
  } finally {
    isSubmitUpdate.value = false;
  }
};

const deletelocation = async (id: number) => {
  if (!confirm('Are you sure you want to delete this location?')) {
    return;
  }

  try {
    await $axios.delete(`/api/locations/${id}`);
    await fetchlocations();
  } catch (error) {
    console.error('Failed to delete location:', error);
    alert('Failed to delete location. Please try again.');
  }
};



onMounted(async () => {
  await fetchCountries()
  await fetchlocations()

})



</script>
<template>

  <div class="dashboard-main-body">


    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #f97316">Create Location</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg" />
            Dashboard
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">Create Location</li>
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
            <label class="block text-sm font-medium text-gray-700 mb-1">City</label>
            <select v-model="City_Id" class="form-control radius-8 w-full" :disabled="!District_Id">
              <option value="">-- Select City --</option>
              <option v-for="c in city" :key="c.id" :value="c.id">{{ c.City_Name }}</option>
            </select>
          </div>

          <div class="col-sm-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Location Name (EN)</label>
            <input type="text" v-model="Location_Name" class="form-control radius-8 w-full"
              placeholder="Enter Location Name in English" :disabled="!City_Id" />
          </div>
          <div class="col-sm-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Location Name (AR)</label>
            <input type="text" v-model="Location_Name_Ar" class="form-control radius-8 w-full"
              placeholder="Enter Location Name in Arabic" :disabled="!City_Id" />
          </div>



          <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
            <button type="reset"
              class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8">
              Reset
            </button>

            <button type="submit" class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"
              :disabled="isSubmitting">
              <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true">


                {{ isSubmitting ? 'Submitting...' : 'Submit' }}
              </span>

              {{ !isSubmitting ? 'Submit' : '' }}


            </button>
          </div>





        </form>


      </div>
    </div>







  </div>



  <div class="dashboard-main-body">



    <div class="col-lg-12">
      <div class="card">
        <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div class="d-flex flex-wrap align-items-center gap-3">
            <div class="d-flex align-items-center gap-2">
              <span>Show</span>
              <select v-model.number="table.perPage" class="form-select form-select-sm w-auto">
                <option :value="10">10</option>
                <option :value="15">15</option>
                <option :value="20">20</option>
              </select>


            </div>
            <div class="icon-field">
              <input type="text" class="form-control form-control-sm w-auto" placeholder="Search"
                v-model="table.search" />
              <span class="icon">
                <iconify-icon icon="ion:search-outline"></iconify-icon>
              </span>
            </div>
          </div>
          <div class="d-flex flex-wrap align-items-center gap-3">


          </div>
        </div>
        <div class="card-body">




          <div class="spinner-border" role="status" v-if="loading">
            <span class="sr-only">Loading...</span>
          </div>


          <table class="table bordered-table mb-0" v-else>
            <thead>
              <tr>
                <th scope="col">
                  <div class="form-check style-check d-flex align-items-center">
                   
                    <label class="form-check-label" for="checkAll">
                      S.L
                    </label>
                  </div>
                </th>

                <th scope="col" style="cursor:pointer">
                  City

                </th>

                <th scope="col" style="cursor:pointer">
                  Location Name

                </th>


                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>



              <tr v-for="(location, index) in locations" :key="location.id">
                <td scope="row">
                  <div class="form-check style-check d-flex align-items-center">
                    <label class="form-check-label" :for="'check' + location.id">
                      {{ index + 1 + (pagination.from - 1) }}
                    </label>
                  </div>
                </td>
                <td>{{ location.city?.City_Name }}</td>
                <td>{{ location.Location_Name }}</td>
                <td>
                  <a href="javascript:void(0)" @click.prevent="TogglePopup(location)"
                    class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center">
                    <iconify-icon icon="lucide:edit"></iconify-icon>
                  </a>
                  <a @click.prevent="deletelocation(location.id)"
                    class="w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center">
                    <iconify-icon icon="mingcute:delete-2-line"></iconify-icon>
                  </a>
                </td>

              </tr>



            </tbody>
          </table>

          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-24">
            <span>
              Showing {{ pagination.from || 0 }} to {{ pagination.to || 0 }} of {{ pagination.total || 0 }} entries
            </span>
            <ul class="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
              <!-- Prev -->
              <li class="page-item" :class="{ disabled: table.page === 1 }">
                <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                  href="javascript:void(0)" @click="table.page > 1 && (table.page -= 1)">
                  <iconify-icon icon="ep:d-arrow-left" class="text-xl"></iconify-icon>
                </a>
              </li>

              <!-- Page numbers -->
              <li v-for="p in pagination.last_page" :key="p" class="page-item">
                <a href="javascript:void(0)" @click="table.page = p" :class="[
                  'page-link fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px',
                  p === table.page
                    ? 'bg-primary-600 text-white'
                    : 'bg-primary-50 text-secondary-light'
                ]">
                  {{ p }}
                </a>
              </li>

              <!-- Next -->
              <li class="page-item" :class="{ disabled: table.page === pagination.last_page }">
                <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                  href="javascript:void(0)" @click="table.page < pagination.last_page && (table.page += 1)">
                  <iconify-icon icon="ep:d-arrow-right" class="text-xl"></iconify-icon>
                </a>
              </li>
            </ul>

          </div>


        </div>
      </div>
    </div>


  </div>


  <!-- Popup / Modal -->
  <transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0"
    enter-to-class="opacity-100" leave-active-class="transition-opacity duration-150" leave-from-class="opacity-100"
    leave-to-class="opacity-0">
  
      <div v-if="isToggle" class="modal-backdrop" @click.self="TogglePopupclose">

     

      <div class="modal-card" role="dialog" aria-modal="true">
        <!-- Header -->
        <div class="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
          <h6 class="fw-semibold mb-0">Edit </h6>
          <button type="button"  class="btn btn-sm btn-outline-secondary" @click.self="TogglePopupclose">
            ✕
          </button>
        </div>

        <!-- Body (your form) -->
        <form @submit.prevent="updateLocation" class="space-y-3">
          <div class="mb-3">
            <label class="form-label fw-semibold text-sm">Name<span class="text-danger">*</span></label>
            <input type="text" class="form-control radius-8" placeholder="Enter department name"
              v-model="editLocation.Location_Name" required />
          </div>

          <div class="mb-3">
            <label class="form-label fw-semibold text-sm">Name (Arabic)<span class="text-danger">*</span></label>
            <input type="text" class="form-control radius-8" placeholder="Enter department name"
              v-model="editLocation.Location_Name_Ar" required />
          </div>





          <!-- Actions -->
          <div class="d-flex align-items-center justify-content-end gap-2">
            <button type="button" class="btn btn-outline-secondary" @click="TogglePopupclose">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="isSubmitUpdate">
              <span v-if="isSubmitUpdate" class="spinner-border spinner-border-sm me-1" role="status"
                aria-hidden="true"></span>
              Save
            </button>
          </div>
        </form>
      </div>

       </div>
    
  </transition>


</template>


<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.5);
  display: grid;
  place-items: center;
  z-index: 1050;
}

.modal-card {
  width: min(640px, 92vw);
  max-height: 90vh;
  overflow: auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, .18);
  padding: 20px;
}
</style>
