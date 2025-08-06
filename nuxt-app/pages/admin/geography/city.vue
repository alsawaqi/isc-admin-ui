<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'cities'
})

import { ref, onMounted, watch } from 'vue'
const  { $axios } = useNuxtApp()

interface City {
  id: number
  City_Code: string
  City_Name: string
  City_Name_Ar: string
  State_Id: number
  state?: {
    State_Name: string,
    country?: { Country_Name: string }
  }
}

interface Country {
  id: number
  Country_Name: string
}

interface State {
  id: number
  Country_Id: number
  State_Name: string
}

const cities = ref<City[]>([])
const countries = ref<Country[]>([])
const states = ref<State[]>([])

const City_Code = ref('')
const Country_Id = ref<number | ''>('')
const State_Id = ref<number | ''>('')
const City_Name = ref('')
const City_Name_Ar = ref('')

const fetchCities = async () => {
  let response = await $axios.get('/api/cities')
  cities.value = response.data
}

const fetchCountries = async () => {
    let response = await $axios.get('/api/states/countries');
    countries.value = response.data
}

 

const submitForm = async () => {
  try {
    await $axios.post('/api/cities', {
      
      State_Id: State_Id.value,
      City_Name: City_Name.value,
      
    })

    alert('City created successfully')

    City_Code.value = ''
    State_Id.value = ''
    Country_Id.value = ''
    City_Name.value = ''
    City_Name_Ar.value = ''

    await fetchCities()
  } catch (error: any) {
    alert('Error: ' + (error?.response?.data?.message || error?.message))
  }
}


watch(Country_Id, async () => {
  State_Id.value = ''
  states.value = []

  if (Country_Id.value) {
    let response = await $axios.get(`/api/states/by-country/${Country_Id.value}`)
    states.value = response.data
  }
})

onMounted(async () => {
  await fetchCountries()
  await fetchCities()
})

watch(Country_Id, () => {
  State_Id.value = ''
  
})
</script>

<template> 
<div class="dashboard-main-body">

    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 class="fw-semibold mb-0" style="color: #f97316">Create City</h6>
        <ul class="d-flex align-items-center gap-2">
            <li class="fw-medium">
                <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
                    <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
                    Dashboard
                </a>
            </li>
            <li>-</li>
            <li class="fw-medium">Create City</li>
        </ul>
    </div>


      <div class="card h-100 p-0 radius-12 overflow-hidden">
        <div class="card-body p-40">
            <form @submit.prevent="submitForm()"  class="row g-4">
                <div class="row">


                    <div class="col-sm-12">

                    <div class="mb-20"> 
                             <label class="block text-sm font-medium text-gray-700 mb-1">Country</label>
                              <select
                                                    v-model="Country_Id"
                                                    class="form-control radius-8 w-full"
                                                >
                                                    <option value="">-- Select Country --</option>
                                                    <option
                                                    v-for="country in countries"
                                                    :key="country.id"
                                                    :value="country.id"
                                                    >
                                                    {{ country.Country_Name }}
                                                    </option>
                            </select>
                    </div>


                    <div class="mb-20">
                        <label class="block text-sm font-medium text-gray-700 mb-1">State</label>
                        <select
                            v-model="State_Id"
                            class="form-control radius-8 w-full"
                        >
                            <option value="">-- Select State --</option>
                            <option
                                v-for="state in states"
                                :key="state.id"
                                :value="state.id"
                            >
                                {{ state.State_Name }}
                            </option>
                        </select>
                    </div>


                    <div class="mb-20">
                           <label class="block text-sm font-medium text-gray-700 mb-1">City Name</label>
                           <input type="text" v-model="City_Name" class="form-control radius-8 w-full" />
                        </div>

                    
                   </div>
                   <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
                        <button type="reset" class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8">
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
   

</div>


 <div class="dashboard-main-body">
            <div class="col-lg-12">
                <div class="card">
                    <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
                        <div class="d-flex flex-wrap align-items-center gap-3">
                            <div class="d-flex align-items-center gap-2">
                                <span>Show</span>
                                <select class="form-select form-select-sm w-auto">
                                    <option>10</option>
                                    <option>15</option>
                                    <option>20</option>
                                </select>

                                <select class="form-select form-select-sm w-auto">
                                    <option>status</option>
                                    <option>Paid</option>
                                    <option>Pending</option>
                                </select>
                            </div>
                            <div class="icon-field">
                                <input type="text" name="#0" class="form-control form-control-sm w-auto" placeholder="Search">
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
            <th class="p-3 text-left">#</th>
           
            <th class="p-3 text-left">City Name</th>
        
            <th class="p-3 text-left">State</th>
            <th class="p-3 text-left">Country</th>
            <th class="p-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(city, index) in cities" :key="city.id" class="border-t">
            <td>{{ index + 1 }}</td>
           
            <td>{{ city.City_Name }}</td>
         
            <td>{{ city.state?.State_Name }}</td>
            <td>{{ city.state?.country?.Country_Name }}</td>
            <td>
              <button class="text-blue-600 hover:underline text-sm">Edit</button>
              <button class="text-red-600 hover:underline text-sm ml-4">Delete</button>
            </td>
          </tr>
        </tbody>
        </table>
                    </div>

                </div>

            </div>
    </div>
 
</template>