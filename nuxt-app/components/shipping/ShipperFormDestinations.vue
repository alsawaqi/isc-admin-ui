<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useGeoApi } from '@/services/geoApi'

// What parent (wizard) stores per row (names + flags)
export interface DestinationRow {
  Shippers_Destination_Country?: string | null
  Shippers_Destination_Region?: string | null
  Shippers_Destination_District?: string | null
  Shippers_Destination_Rate_Applicability?: 'weight'|'volume'|'both'|'special'|''|null
  Shippers_Destination_Country_Preference?: string | null
  Shippers_Destination_Region_Preference?: string | null
  Shippers_Destination_District_Preference?: string | null
  Shippers_Destination_Rate_Volume?: boolean
  Shippers_Destination_Rate_Weight?: boolean
  Shippers_Destination_Rate_Applicable?: boolean
}

// Lookup DTOs
interface Country { id:number; Country_Name:string }
interface Region  { id:number; Country_Id:number; Region_Name:string }
interface District{ id:number; Region_Id:number; District_Name:string }

const props = defineProps<{ modelValue: DestinationRow[] }>()
const emit  = defineEmits<{ 'update:modelValue':[DestinationRow[]] }>()

const rows = ref<DestinationRow[]>(JSON.parse(JSON.stringify(props.modelValue || [])))
watch(() => props.modelValue, v => rows.value = JSON.parse(JSON.stringify(v || [])))
watch(rows, v => emit('update:modelValue', v), { deep:true })

// Global caches
const countries = ref<Country[]>([])
const regionsMap   = ref<Record<number, Region[]>>({})     // key: countryId
const districtsMap = ref<Record<string, District[]>>({})   // key: `${countryId}-${regionId}`

// Per-row selections (IDs), while we store names in rows[]
type Sel = { countryId:number|''; regionId:number|''; districtId:number|'' }
const selections = ref<Sel[]>([])

const ensureSelRows = () => {
  while (selections.value.length < rows.value.length) selections.value.push({countryId:'', regionId:'', districtId:''})
  if (selections.value.length > rows.value.length) selections.value.splice(rows.value.length)
}

// API
const { listCountries, listRegions, listDistricts } = useGeoApi()

const loadCountries = async () => {
  const { data } = await listCountries()
  countries.value = data
}

const loadRegions = async (countryId:number) => {
  if (!countryId) return
  if (regionsMap.value[countryId]) return
  const { data } = await listRegions(countryId)
  regionsMap.value[countryId] = data
}

const loadDistricts = async (countryId:number, regionId:number) => {
  if (!countryId || !regionId) return
  const key = `${countryId}-${regionId}`
  if (districtsMap.value[key]) return
  const { data } = await listDistricts({ country_id: countryId, region_id: regionId })
  districtsMap.value[key] = data
}

// When select changes: set names into row and fetch next level
const onCountryChange = async (i:number) => {
  const sel = selections.value[i]
  rows.value[i].Shippers_Destination_Country =
    countries.value.find(c => c.id === sel.countryId)?.Country_Name || null

  // reset lower levels
  sel.regionId = ''
  sel.districtId = ''
  rows.value[i].Shippers_Destination_Region = null
  rows.value[i].Shippers_Destination_District = null

  if (sel.countryId) await loadRegions(sel.countryId as number)
}

const onRegionChange = async (i:number) => {
  const sel = selections.value[i]
  const regions = regionsMap.value[sel.countryId as number] || []
  rows.value[i].Shippers_Destination_Region =
    regions.find(r => r.id === sel.regionId)?.Region_Name || null

  // reset district
  sel.districtId = ''
  rows.value[i].Shippers_Destination_District = null

  if (sel.countryId && sel.regionId) {
    await loadDistricts(sel.countryId as number, sel.regionId as number)
  }
}

const onDistrictChange = (i:number) => {
  const sel = selections.value[i]
  const key = `${sel.countryId}-${sel.regionId}`
  const ds = districtsMap.value[key] || []
  rows.value[i].Shippers_Destination_District =
    ds.find(d => d.id === sel.districtId)?.District_Name || null
}

// UI helpers
const addRow = () => {
  rows.value.push({
    Shippers_Destination_Country: '',
    Shippers_Destination_Region: '',
    Shippers_Destination_District: '',
    Shippers_Destination_Rate_Applicability: '',
    Shippers_Destination_Country_Preference: '',
    Shippers_Destination_Region_Preference: '',
    Shippers_Destination_District_Preference: '',
    Shippers_Destination_Rate_Volume: false,
    Shippers_Destination_Rate_Weight: false,
    Shippers_Destination_Rate_Applicable: true
  })
  ensureSelRows()
}

const removeRow = (i:number) => {
  rows.value.splice(i,1)
  selections.value.splice(i,1)
}

onMounted(async () => {
  await loadCountries()
  ensureSelRows()
})
</script>

<template>
  <div>
    <div class="d-flex justify-content-end mb-12">
      <button type="button" class="btn btn-primary" @click="addRow">Add Destination</button>
    </div>

    <div v-if="rows.length === 0" class="text-muted">No destinations added.</div>

    <div v-for="(r,i) in rows" :key="i" class="border p-3 radius-8 mb-12">
      <div class="row">
        <!-- Country -->
        <div class="col-sm-4 mb-12">
          <label class="form-label text-sm">Country</label>
          <select v-model="selections[i].countryId" class="form-control radius-8" @change="onCountryChange(i)">
            <option value="">-- Select Country --</option>
            <option v-for="c in countries" :key="c.id" :value="c.id">{{ c.Country_Name }}</option>
          </select>
        </div>

        <!-- Region -->
        <div class="col-sm-4 mb-12">
          <label class="form-label text-sm">Region</label>
          <select v-model="selections[i].regionId" class="form-control radius-8"
                  :disabled="!selections[i].countryId" @change="onRegionChange(i)">
            <option value="">-- Select Region --</option>
            <option
              v-for="rg in (regionsMap[selections[i].countryId as number] || [])"
              :key="rg.id" :value="rg.id">
              {{ rg.Region_Name }}
            </option>
          </select>
        </div>

        <!-- District -->
        <div class="col-sm-4 mb-12">
          <label class="form-label text-sm">District</label>
          <select v-model="selections[i].districtId" class="form-control radius-8"
                  :disabled="!selections[i].regionId" @change="onDistrictChange(i)">
            <option value="">-- Select District --</option>
            <option
              v-for="d in (districtsMap[`${selections[i].countryId}-${selections[i].regionId}`] || [])"
              :key="d.id" :value="d.id">
              {{ d.District_Name }}
            </option>
          </select>
        </div>

        <!-- Applicability Label -->
        <div class="col-sm-4 mb-12">
          <label class="form-label text-sm">Applicability Label</label>
          <select v-model="r.Shippers_Destination_Rate_Applicability" class="form-control radius-8">
            <option value="">-- Optional --</option>
            <option value="weight">weight</option>
            <option value="volume">volume</option>
            <option value="both">both</option>
            <option value="special">special</option>
          </select>
        </div>

        <!-- Preferences -->
        <div class="col-sm-8 mb-12">
          <label class="form-label text-sm">Preferences (optional)</label>
          <div class="row">
            <div class="col-sm-4 mb-8">
              <input v-model="r.Shippers_Destination_Country_Preference" class="form-control radius-8" placeholder="Country preference"/>
            </div>
            <div class="col-sm-4 mb-8">
              <input v-model="r.Shippers_Destination_Region_Preference" class="form-control radius-8" placeholder="Region preference"/>
            </div>
            <div class="col-sm-4 mb-8">
              <input v-model="r.Shippers_Destination_District_Preference" class="form-control radius-8" placeholder="District preference"/>
            </div>
          </div>
        </div>

        <!-- Flags -->
        <div class="col-sm-12 mb-8">
          <label class="form-label text-sm">Rate Flags</label>
          <div class="d-flex gap-4">
            <div class="form-check">
              <input type="checkbox" v-model="r.Shippers_Destination_Rate_Volume" :id="'v-'+i" class="form-check-input"/>
              <label class="form-check-label" :for="'v-'+i">Volume</label>
            </div>
            <div class="form-check">
              <input type="checkbox" v-model="r.Shippers_Destination_Rate_Weight" :id="'w-'+i" class="form-check-input"/>
              <label class="form-check-label" :for="'w-'+i">Weight</label>
            </div>
            <div class="form-check">
              <input type="checkbox" v-model="r.Shippers_Destination_Rate_Applicable" :id="'a-'+i" class="form-check-input"/>
              <label class="form-check-label" :for="'a-'+i">Applicable</label>
            </div>
          </div>
        </div>
      </div>

      <div class="d-flex justify-content-end">
        <button type="button" class="btn btn-danger" @click="removeRow(i)">Remove</button>
      </div>
    </div>
  </div>
</template>
