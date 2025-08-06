<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'countries',
})

import { ref, onMounted } from 'vue'
const { $axios } = useNuxtApp()

interface Country {
  id: number | string;
  Country_Code: string;
  Country_Name: string;
  Country_Name_Ar: string;
  Created_By?: string;
  Created_Date?: string;
  created_at?: string;
  updated_at?: string;
}

const countries = ref<Country[]>([])
 
const Country_Code = ref('')
const Country_Name = ref('')
const Country_Name_Ar = ref('')


const countryNameToCode: { [key: string]: string } = {
  afghanistan: 'AF',
  albania: 'AL',
  algeria: 'DZ',
  andorra: 'AD',
  angola: 'AO',
  argentina: 'AR',
  australia: 'AU',
  austria: 'AT',
  bangladesh: 'BD',
  bahrain: 'BH',
  belarus: 'BY',
  belgium: 'BE',
  brazil: 'BR',
  canada: 'CA',
  china: 'CN',
  egypt: 'EG',
  france: 'FR',
  germany: 'DE',
  india: 'IN',
  indonesia: 'ID',
  italy: 'IT',
  japan: 'JP',
  kenya: 'KE',
  kuwait: 'KW',
  malaysia: 'MY',
  morocco: 'MA',
  netherlands: 'NL',
  nigeria: 'NG',
  oman: 'OM',
  pakistan: 'PK',
  philippines: 'PH',
  qatar: 'QA',
  russia: 'RU',
  "saudi arabia": 'SA',
  singapore: 'SG',
  "south africa": 'ZA',
  "south korea": 'KR',
  spain: 'ES',
  "sri lanka": 'LK',
  sweden: 'SE',
  switzerland: 'CH',
  syria: 'SY',
  tanzania: 'TZ',
  thailand: 'TH',
  tunisia: 'TN',
  turkey: 'TR',
  uae: 'AE',
  uk: 'GB',
  "united arab emirates": 'AE',
  "united kingdom": 'GB',
  "united states": 'US',
  usa: 'US',
  vietnam: 'VN',
  yemen: 'YE'
  
}

const countryCode = (countryname: any) => {
  const name = countryname.trim().toLowerCase()
  return countryNameToCode[name] || null
}



const fetchCountries = async ():Promise <void> => {
  try {
    const response = await $axios.get('/api/countries')
    countries.value = response.data
  } catch (error) {
    console.error('Failed to fetch countries:', error)
  }finally {
  

  
  }
}

const submitForm = async () => {
  try {
    await $axios.post('/api/countries', {
      Country_Code: Country_Code.value,
      Country_Name: Country_Name.value,
      Country_Name_Ar: Country_Name_Ar.value,
    })

    alert('Country created successfully')

    // Clear form
    Country_Code.value = ''
    Country_Name.value = ''
    Country_Name_Ar.value = ''

  
  } catch (error: any) {
    alert('Failed to create country: ' + (error?.response?.data?.message || error?.message))
  }finally {
    // Refresh the list of countries
    await fetchCountries()
  }
}

onMounted(async () => {
   await fetchCountries()
})
</script>

<template> 
<div class="dashboard-main-body">

       <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
              <h6 class="fw-semibold mb-0" style="color: #ef4444">Country</h6>
              <ul class="d-flex align-items-center gap-2">
                  <li class="fw-medium">
                      <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
                          <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
                          Dashboard
                      </a>
                  </li>
                  <li>-</li>
                  <li class="fw-medium">Country</li>
              </ul>
          </div>

            <div class="card h-100 p-0 radius-12 overflow-hidden">
                    <div class="card-body p-40">
                        <form @submit.prevent="submitForm()"  class="row g-4">
                            <div class="row">

                                <div class="col-sm-12">


                                    

                                    <div class="mb-20">
                                        <label for="address" class="form-label fw-semibold text-primary-light text-sm mb-8"> Name <span class="text-danger-600">*</span></label>
                                        <input type="text" class="form-control radius-8" id="address" v-model="Country_Name" placeholder="Enter Your Name">
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
                                    <th scope="col">
                                        <div class="form-check style-check d-flex align-items-center">
                                            <input class="form-check-input" type="checkbox" value="" id="checkAll">
                                            <label class="form-check-label" for="checkAll">
                                                S.L
                                            </label>
                                        </div>
                                    </th>

                                    <th scope="col">Name</th>


                                    <th scope="col">Action</th>
                                </tr>
                            </thead>


                            <tbody>
                                <tr v-for="(country, index) in countries" :key="country.id">
                                    <td>
                                        <div class="form-check style-check d-flex align-items-center">
                                            <input class="form-check-input" type="checkbox" :value="country.id" :id="'check' + index">
                                            <label class="form-check    -label" :for="'check' + index">
                                                {{ index + 1 }}
                                            </label>
                                        </div>
                                    </td> 

                                    <td>
                                         <div class="d-flex align-items-center">
                                                <div v-if="countryCode(country.Country_Name)" class="flex items-center gap-2">
                                                <img
                                                    :src="(() => {

                                                        const code = 
                                                             countryCode(country.Country_Name); return code ? `https://flagcdn.com/24x18/${code.toLowerCase()}.png` : '/logo.jpg' 
                                                             
                                                             })()"
                                                    :alt="country.Country_Name + ' flag'"
                                                    width="24"
                                                    height="18"
                                                />
                                                </div>
                                                <div v-else> <img
                                                    src="/logo.jpg"
                                                    alt="isc"
                                                    width="54"
                                                    height="40"
                                                /></div>
                                                <span class="text-md fw-semibold ms-3">{{ country.Country_Name }}</span>
                                            </div>
                                    </td>


                                    <td>
                                        <a href="javascript:void(0)" class="w-32-px h-32-px bg-primary-light text-primary-600 rounded-circle d-inline-flex align-items-center justify-content-center">
                                            <iconify-icon icon="iconamoon:eye-light"></iconify-icon>
                                        </a>
                                        
                                        <a href="javascript:void(0)" class="w-32-px h-32-px bg-danger-light text-danger-600 rounded-circle d-inline-flex align-items-center justify-content-center">
                                            <iconify-icon icon="iconamoon:trash-light"></iconify-icon>
                                        </a>
                                    </td>
                                </tr>
                            </tbody>


                        </table>
            </div>







     </div>
   </div>
 </div>
  
</template>