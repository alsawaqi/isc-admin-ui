<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'region'
})

import { ref, onMounted } from 'vue'
const { $axios } = useNuxtApp()

interface Country {
  id: number
  Country_Name: string
}

interface Region {
  id: number
  Region_Code: string
  Region_Name: string
  Region_Name_Ar: string
  Country_Id: number
  created_at?: string
  country?: { Country_Name: string }
}

const regions = ref<Region[]>([])
const countries = ref<Country[]>([])

const Region_Code = ref<string>('')
const Region_Name = ref<string>('')
const Region_Name_Ar = ref<string>('')
const Country_Id = ref<number | ''>('')

const fetchCountries = async () => {
 let response = await $axios.get('/api/regions/countries')
  countries.value = response.data
}

const fetchRegions = async () => {
  let response = await $axios.get('/api/regions')
  regions.value = response.data
}



const submitForm = async () => {
  try {
    await $axios.post('/api/regions', {
      Region_Code: Region_Code.value,
      Country_Id: Country_Id.value,
      Region_Name: Region_Name.value,
      Region_Name_Ar: Region_Name_Ar.value,
    })

    alert('Region created successfully')

    // Reset form
    Region_Code.value = ''
    Country_Id.value = ''
    Region_Name.value = ''
    Region_Name_Ar.value = ''

    await fetchRegions()
  } catch (error: any) {
    alert('Error: ' + (error?.response?.data?.message || error?.message))
  }
}

onMounted(async () => {
  await fetchCountries()
  await fetchRegions()
})
</script>

<template>
<div class="dashboard-main-body">

     <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 class="fw-semibold mb-0" style="color: #f97316">Create Region</h6>
        <ul class="d-flex align-items-center gap-2">
            <li class="fw-medium">
                <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
                    <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
                    Dashboard
                </a>
            </li>
            <li>-</li>
            <li class="fw-medium">Create Region</li>
        </ul>
         </div>


           <div class="card h-100 p-0 radius-12 overflow-hidden">
                <div class="card-body p-40">
                    <form @submit.prevent="submitForm()"  class="row g-4">
                        <div class="row">

                            <div class="col-sm-12">



                                <div class="mb-20">


                                    <label class="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                        <select v-model="Country_Id" class="form-control radius-8 w-full">
                                        <option value="">-- Select Country --</option>
                                        <option v-for="country in countries" :key="country.id" :value="country.id">
                                            {{ country.Country_Name }}
                                        </option>
                                        </select>



                                </div>


                                

                                <div class="mb-20">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Region Name</label>
                                <input type="text" v-model="Region_Name" class="form-control radius-8 w-full" />
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
                                    <th>Country</th>
                                
                                    <th>Region Name</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody> 
                                <tr v-for="state in regions" :key="state.id">
                                    <td>{{ state.country?.Country_Name }}</td>

                                    <td>{{ state.Region_Name }}</td>
                                    <td>
                                        <button   class="btn btn-sm btn-primary">Edit</button>
                                        <button  class="btn btn-sm btn-danger">Delete</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                </div>

            </div>
    </div>


</div>




</template>