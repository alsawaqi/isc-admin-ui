 <script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'shipping.shippers'
})

import { ref, computed } from 'vue'
import Stepper from '@/components/shipping/Stepper.vue'
import ShipperFormBasic, { type BasicForm } from '@/components/shipping/ShipperFormBasic.vue'
import ShipperFormContacts, { type ContactRow } from '@/components/shipping/ShipperFormContacts.vue'
import ShipperFormDestinations, { type DestinationRow } from '@/components/shipping/ShipperFormDestinations.vue'
import ShipperFormHeavy from '@/components/shipping/ShipperFormHeavy.vue'
import ShipperFormRates, { type RatesPerDestination } from '@/components/shipping/ShipperFormRates.vue'

const { $axios } = useNuxtApp()

const stepsBase = ['Basic Details', 'Contacts', 'Destinations & Flags', 'Rates (Volume/Weight)', 'Review & Save']
const active = ref(1)

const destinations = ref<DestinationRow[]>([])
const rates = ref<RatesPerDestination[]>([]) // aligned by destination index

const basic = ref<BasicForm>({
  Shippers_Code: '', // generated server-side (not required client-side)
  Shippers_Name: '',
  Shippers_Address: '',
  Shippers_Office_No: '',
  Shippers_GSM_No: '',
  Shippers_Email_Address: '',
  Shippers_Official_Website_Address: '',
  Shippers_GPS_Location: '',
  Shippers_Scope: 'local',
  Shippers_Type: '',
  Shippers_Rate_Mode: 'weight',
  Shippers_Is_Active: true
})

// Heavy step local state
const heavy = ref<{
  vehicles: { Shippers_Vehicle_Type: string; Shippers_Vehicle_Capacity_Ton?: number | null }[];
  heavyRates: { destinationIndex: number | ''; vehicleType: string | ''; Shippers_Flat_Rate?: number | null; Shippers_Hourly_Rate?: number | null; Shippers_Min_Hours?: number | null; Shippers_Currency?: string | null; }[];
}>({
  vehicles: [],
  heavyRates: []
})

const steps = computed(() => {
  return basic.value.Shippers_Type === 'heavy'
    ? [...stepsBase.slice(0, 4), 'Heavy (Vehicles & Rates)', ...stepsBase.slice(4)]
    : stepsBase
})

const contacts = ref<ContactRow[]>([])
const busy = ref(false)

// Minimal client-side validation that matches API expectations
const validateBasic = () => {
  if (!basic.value.Shippers_Name?.trim()) return 'Shippers_Name is required'
  if (!basic.value.Shippers_Scope) return 'Shippers_Scope is required'
  if (!basic.value.Shippers_Type) return 'Shippers_Type is required'
  if (!basic.value.Shippers_Rate_Mode) return 'Shippers_Rate_Mode is required'
  return ''
}

const goNext = () => {
  if (active.value === 1) {
    const err = validateBasic()
    if (err) { alert(err); return }
  }
  if (active.value < steps.value.length) active.value++
}
const goPrev = () => { if (active.value > 1) active.value-- }

const saveAll = async () => {
  const err = validateBasic()
  if (err) { alert(err); active.value = 1; return }
  try {
    busy.value = true

    const payload = {
      shipper: {
        Shippers_Name: basic.value.Shippers_Name,
        Shippers_Address: basic.value.Shippers_Address || null,
        Shippers_Office_No: basic.value.Shippers_Office_No || null,
        Shippers_GSM_No: basic.value.Shippers_GSM_No || null,
        Shippers_Email_Address: basic.value.Shippers_Email_Address || null,
        Shippers_Official_Website_Address: basic.value.Shippers_Official_Website_Address || null,
        Shippers_GPS_Location: basic.value.Shippers_GPS_Location || null,
        Shippers_Scope: basic.value.Shippers_Scope,                 // 'local' | 'international'
        Shippers_Type: basic.value.Shippers_Type,                   // 'parcel'|'courier'|'postal'|'heavy'
        Shippers_Rate_Mode: basic.value.Shippers_Rate_Mode,         // 'weight'|'volume'|'both' or 1|2|3
        Shippers_Is_Active: !!basic.value.Shippers_Is_Active,
        Shippers_Meta: null
      },
      contacts: contacts.value,                                     // array of contact rows
      destinations: destinations.value.map((d, i) => ({
        basic: {
          Shippers_Destination_Country: d.Shippers_Destination_Country || null,
          Shippers_Destination_Region: d.Shippers_Destination_Region || null,
          Shippers_Destination_District: d.Shippers_Destination_District || null,
          Shippers_Destination_Rate_Applicability: d.Shippers_Destination_Rate_Applicability || null,
          Shippers_Destination_Country_Preference: d.Shippers_Destination_Country_Preference || null,
          Shippers_Destination_Region_Preference: d.Shippers_Destination_Region_Preference || null,
          Shippers_Destination_District_Preference: d.Shippers_Destination_District_Preference || null
        },
        flags: {
          Shippers_Destination_Rate_Volume: !!d.Shippers_Destination_Rate_Volume,
          Shippers_Destination_Rate_Weight: !!d.Shippers_Destination_Rate_Weight,
          Shippers_Destination_Rate_Applicable: d.Shippers_Destination_Rate_Applicable !== false
        },
        volume_bands: (rates.value[i]?.volumeBands || []),
        weight_bands: (rates.value[i]?.weightBands || []),
        heavy_rates:
          (basic.value.Shippers_Type === 'heavy' ? (heavy.value.heavyRates || []) : [])
            .filter(hr => hr.destinationIndex === i)
            .map(hr => ({
              vehicle_type: hr.vehicleType,
              Shippers_Flat_Rate: hr.Shippers_Flat_Rate ?? null,
              Shippers_Hourly_Rate: hr.Shippers_Hourly_Rate ?? null,
              Shippers_Min_Hours: hr.Shippers_Min_Hours ?? 0,
              Shippers_Currency: hr.Shippers_Currency || 'OMR'
            }))
      })),
      vehicles: (basic.value.Shippers_Type === 'heavy' ? (heavy.value.vehicles || []) : [])
    }

    await $axios.post('/api/v1/shipping/shippers', payload)

    alert('Shipper setup saved successfully.')
    navigateTo('/admin/shipping/shippers')
  } catch (e: any) {
    alert(e?.response?.data?.message || e?.message || 'Failed to save')
  } finally {
    busy.value = false
  }
}
</script>


<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color:#ef4444">Create Shipper</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"/>
            Dashboard
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">Create Shipper</li>
      </ul>
    </div>

    <Stepper :steps="steps" :active="active" />

    <div class="card h-100 p-0 radius-12 overflow-hidden">
      <div class="card-body p-40">

        <!-- STEP 1 -->
        <div v-if="active===1"><ShipperFormBasic v-model="basic" /></div>

        <!-- STEP 2 -->
       <div v-else-if="active===2"><ShipperFormContacts v-model="contacts" /></div>

        <!-- STEP 3: REVIEW -->
       <div v-else-if="active===3"><ShipperFormDestinations v-model="destinations" /></div>

         <!-- STEP 4: REVIEW -->
          <div v-else-if="active===4"><ShipperFormRates :destinations="destinations" v-model="rates"/></div>



      <!-- Heavy step appears as step 5 when type=heavy -->
    <div v-else-if="basic.Shippers_Type==='heavy' && active===5">
  <ShipperFormHeavy :destinations="destinations" v-model="heavy" />
</div>


         <!-- Review: either step 5 (non-heavy) or step 6 (heavy) -->
     <div v-else-if="active=== (basic.Shippers_Type==='heavy' ? 6 : 5)">
        <div class="col-12 mb-16">
          <h6 class="fw-semibold mb-8">Review</h6>
          <pre class="bg-light p-3 radius-8" style="white-space:pre-wrap">
   </pre>
        </div>
      </div>


        <div class="d-flex align-items-center justify-content-between mt-24">
          <button type="button" class="btn btn-light border"
                @click="goPrev"
                :disabled="active===1 || busy">Back</button>
        <div class="d-flex gap-3">
          <button v-if="active<steps.length" type="button" class="btn btn-primary" @click="goNext" :disabled="busy">Save & Next</button>
          <button v-else type="button" class="btn btn-success" @click="saveAll" :disabled="busy">
            {{ busy ? 'Saving…' : 'Finish & Create' }}
          </button>
        </div>
        </div>

      </div>
    </div>

  </div>
</template>
