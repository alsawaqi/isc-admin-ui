<script setup lang="ts">

import { ref, computed, onMounted } from 'vue'
import { useRoute, definePageMeta, useNuxtApp, navigateTo } from '#imports'
import Stepper from '@/components/shipping/Stepper.vue'
import ShipperFormBasic, { type BasicForm } from '@/components/shipping/ShipperFormBasic.vue'
import ShipperFormContacts, { type ContactRow } from '@/components/shipping/ShipperFormContacts.vue'
import ShipperFormDestinations, { type DestinationRow } from '@/components/shipping/ShipperFormDestinations.vue'
import ShipperFormRates, { type RatesPerDestination } from '@/components/shipping/ShipperFormRates.vue'
import ShipperFormHeavy from '@/components/shipping/ShipperFormHeavy.vue'
import ShipperFormBoxes, { type StandardBox } from '@/components/shipping/ShipperFormBoxes.vue'


definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'shipping.shippers'
})

const { $axios } = (useNuxtApp() as any)
const route = useRoute()
const shipperId = Number(route.params.id)

const stepsBase = ['Basic Details', 'Contacts', 'Destinations & Flags', 'Rates (Volume/Weight)', 'Review & Save']
const active = ref(1)
const busy = ref(false)

// shared state (same shapes as Create)
const basic = ref<BasicForm>({
  Shippers_Code: '',
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

const contacts = ref<ContactRow[]>([])
const destinations = ref<DestinationRow[]>([])
const rates = ref<RatesPerDestination[]>([])
const boxes = ref<StandardBox[]>([])

// Heavy
const heavy = ref<{
  vehicles: { Shippers_Vehicle_Type: string; Shippers_Vehicle_Capacity_Ton?: number | null }[];
  heavyRates: {
    destinationIndex: number | '';
    vehicleType: string | '';
    Shippers_Flat_Rate?: number | null;
    Shippers_Hourly_Rate?: number | null;
    Shippers_Min_Hours?: number | null;
    Shippers_Currency?: string | null;
  }[];
}>({
  vehicles: [],
  heavyRates: []
})

const isHeavy = computed(() => basic.value.Shippers_Type === 'heavy')

// Steps (insert Heavy + Boxes just like your Create page)
const steps = computed(() => {
  const base = [...stepsBase] // [Basic, Contacts, Destinations, Rates, Review]
  if (isHeavy.value) {
    base.splice(4, 0, 'Heavy (Vehicles & Rates)') // after Rates
    base.splice(5, 0, 'Standard Boxes')           // before Review
  } else {
    base.splice(4, 0, 'Standard Boxes')           // after Rates  ✅
  }
  return base
})

// tiny helpers (same as create)
const currency = (v?: string | null) => (v || '—')
const num = (v?: number | null, d = 3) =>
  (v === null || v === undefined || Number.isNaN(v) ? '—' : Number(v).toFixed(d))
const yesno = (b?: boolean) => (b ? 'Yes' : 'No')
const dash = (v?: string | null) => (v && String(v).trim() ? v : '—')

// Keep rates[] aligned to destinations[]
function ensureRatesAligned() {
  const need = destinations.value.length
  const have = rates.value.length
  if (need > have) {
    for (let i = have; i < need; i++) {
      rates.value.push({
        volumeBands: [],
        weightBands: [],
        volumetricRule: {
          enabled: false,
          divisor: null,
          maxL_cm: null,
          maxW_cm: null,
          maxH_cm: null,
        },
      })
    }
  } else if (need < have) {
    rates.value.splice(need)
  }
}

const imageFile = ref<File | null>(null)

// pass a handler down to ShipperFormBasic:
// <ShipperFormBasic v-model="basic" @image-change="onImageChange" />
const onImageChange = (file: File | null) => {
  imageFile.value = file
}


// Minimal validation
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

// -------- Load existing shipper --------
async function loadShipper() {
  busy.value = true
  try {
    const { data } = await $axios.get(`/api/v1/shipping/shippers/${shipperId}`)

 

    // Basic
    basic.value = {
      Shippers_Code: '',
      Shippers_Name: data.shipper.Shippers_Name,
      Shippers_Address: data.shipper.Shippers_Address,
      Shippers_Office_No: data.shipper.Shippers_Office_No,
      Shippers_GSM_No: data.shipper.Shippers_GSM_No,
      Shippers_Email_Address: data.shipper.Shippers_Email_Address,
      Shippers_Official_Website_Address: data.shipper.Shippers_Official_Website_Address,
      Shippers_GPS_Location: data.shipper.Shippers_GPS_Location,
      Shippers_Scope: data.shipper.Shippers_Scope,
      Shippers_Type: data.shipper.Shippers_Type,
      Shippers_Rate_Mode: data.shipper.Shippers_Rate_Mode,
      Shippers_Is_Active: !!data.shipper.Shippers_Is_Active,
      Shippers_COD: !!data.shipper.Shippers_COD,
      // 🔴 Shippers_COD missing here

        Shippers_Image_Path: data.shipper.Shippers_Image_Path ?? null,
  Shippers_Size: data.shipper.Shippers_Size ?? null,
  Shippers_Extenstion: data.shipper.Shippers_Extenstion ?? null,
  Shippers_Image_Type: data.shipper.Shippers_Image_Type ?? null,
    }

    // Contacts
    contacts.value = (data.contacts ?? []).map((c: any) => ({
      Shippers_Contact_Name: c.Shippers_Contact_Name,
      Shippers_Contact_Position: c.Shippers_Contact_Position,
      Shippers_Contact_Office_No: c.Shippers_Contact_Office_No,
      Shippers_Contact_GSM_No: c.Shippers_Contact_GSM_No,
      Shippers_Contact_Email_Address: c.Shippers_Contact_Email_Address,
      Shippers_Is_Primary: !!c.Shippers_Is_Primary,
      Contact_Department_Id: c.Contact_Department_Id ?? null,
    }))

    // Destinations (+flags embedded)
    const dests = data.destinations ?? []

  destinations.value = dests.map((d: any) => ({
  id: d.id,   // 👈 keep PK

  Shippers_Destination_Country_Id: d.basic?.Shippers_Destination_Country_Id ?? null,
  Shippers_Destination_Region_Id:  d.basic?.Shippers_Destination_Region_Id ?? null,
  Shippers_Destination_District_Id:d.basic?.Shippers_Destination_District_Id ?? null,

  Shippers_Destination_Country:
    d.basic?.Shippers_Destination_Country
    ?? d.country?.Country_Name
    ?? null,

  Shippers_Destination_Region:
    d.basic?.Shippers_Destination_Region
    ?? d.region?.Region_Name
    ?? null,

  Shippers_Destination_District:
    d.basic?.Shippers_Destination_District
    ?? d.district?.District_Name
    ?? null,

  Shippers_Destination_Rate_Applicability:
    d.basic?.Shippers_Destination_Rate_Applicability ?? null,
  Shippers_Destination_Country_Preference:
    d.basic?.Shippers_Destination_Country_Preference ?? null,
  Shippers_Destination_Region_Preference:
    d.basic?.Shippers_Destination_Region_Preference ?? null,
  Shippers_Destination_District_Preference:
    d.basic?.Shippers_Destination_District_Preference ?? null,

  Shippers_Destination_Rate_Volume: !!d.flags?.Shippers_Destination_Rate_Volume,
  Shippers_Destination_Rate_Weight: !!d.flags?.Shippers_Destination_Rate_Weight,
  Shippers_Destination_Rate_Applicable:
    d.flags?.Shippers_Destination_Rate_Applicable ?? true,
  Shippers_Destination_Rate_Box: !!d.flags?.Shippers_Destination_Rate_Box,

  rate_mode: d.rate_mode ?? 'weight',
}))


    // Rates per destination
    rates.value = dests.map((d: any) => ({
      volumeBands: d.volume_bands ?? [],
      weightBands: d.weight_bands ?? [],
      volumetricRule: {
        enabled: !!d.volumetric_rule?.enabled,
        divisor: d.volumetric_rule?.divisor ?? null,
        maxL_cm: d.volumetric_rule?.maxL_cm ?? null,
        maxW_cm: d.volumetric_rule?.maxW_cm ?? null,
        maxH_cm: d.volumetric_rule?.maxH_cm ?? null,
      },
    }))
    ensureRatesAligned()

    // Heavy (vehicles)
    heavy.value.vehicles = (data.vehicles ?? []).map((v: any) => ({
      Shippers_Vehicle_Type: v.Shippers_Vehicle_Type,
      Shippers_Vehicle_Capacity_Ton: v.Shippers_Vehicle_Capacity_Ton
    }))

    // Heavy (rates) — map destinationId→index, vehicleId→type
    const destIndexById: Record<number, number> = {}
    dests.forEach((d: any, idx: number) => { destIndexById[d.id] = idx })
    const vehicleTypeById: Record<number, string> = {}
      ; (data.vehicles ?? []).forEach((v: any) => { vehicleTypeById[v.id] = v.Shippers_Vehicle_Type })

    heavy.value.heavyRates = (data.heavy_rates ?? [])
      .map((hr: any) => {
        const di = destIndexById[hr.destination_id]
        const vt = vehicleTypeById[hr.vehicle_id]
        if (di === undefined || vt === undefined) return null
        return {
          destinationIndex: di,
          vehicleType: vt,
          Shippers_Flat_Rate: hr.Shippers_Flat_Rate ?? null,
          Shippers_Hourly_Rate: hr.Shippers_Hourly_Rate ?? null,
          Shippers_Min_Hours: hr.Shippers_Min_Hours ?? 0,
          Shippers_Currency: hr.Shippers_Currency ?? 'OMR'
        }
      })
      .filter(Boolean) as any[]

    // Boxes (sizes; admin only)
    boxes.value = (data.standard_boxes ?? []).map((b: any) => ({
      Box_Code: b.Box_Code,
      Box_Label: b.Box_Label,
      Length_cm: b.Length_cm,
      Width_cm: b.Width_cm,
      Height_cm: b.Height_cm,
      Max_Weight_Kg: b.Max_Weight_Kg,
      // keep pricing fields empty — per-destination in DB
      Flat_Rate_Price: null,
      Currency: 'OMR',
      Notes: null
    }))
  } catch (e: any) {
    alert(e?.response?.data?.message || e?.message || 'Failed to load shipper')
    navigateTo('/admin/shipping/shippers')
  } finally {
    busy.value = false
  }
}

// -------- Save (PUT) --------
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
        Shippers_Scope: basic.value.Shippers_Scope,
        Shippers_Type: basic.value.Shippers_Type,
        Shippers_Rate_Mode: basic.value.Shippers_Rate_Mode,
        Shippers_Is_Active: !!basic.value.Shippers_Is_Active,
        Shippers_COD: !!basic.value.Shippers_COD,
        Shippers_Meta: null,
      },
      contacts: contacts.value, 
      
      destinations: destinations.value.map((d, i) => {
        const r = rates.value[i] || {}

        return {

            id: (d as any).id ?? null,     
            
          basic: {
            Shippers_Destination_Country_Id: (d as any).Shippers_Destination_Country_Id ?? null,
            Shippers_Destination_Region_Id: (d as any).Shippers_Destination_Region_Id ?? null,
            Shippers_Destination_District_Id: (d as any).Shippers_Destination_District_Id ?? null,

            Shippers_Destination_Country: d.Shippers_Destination_Country || null,
            Shippers_Destination_Region: d.Shippers_Destination_Region || null,
            Shippers_Destination_District: d.Shippers_Destination_District || null,
            Shippers_Destination_Rate_Applicability:
              d.Shippers_Destination_Rate_Applicability ?? null,
            Shippers_Destination_Country_Preference:
              d.Shippers_Destination_Country_Preference || null,
            Shippers_Destination_Region_Preference:
              d.Shippers_Destination_Region_Preference || null,
            Shippers_Destination_District_Preference:
              d.Shippers_Destination_District_Preference || null,
          },

          // important: send rate_mode (per-dest or fallback)
          rate_mode: (d as any).rate_mode || basic.value.Shippers_Rate_Mode || 'weight',

          flags: {
            Shippers_Destination_Rate_Volume: !!d.Shippers_Destination_Rate_Volume,
            Shippers_Destination_Rate_Weight: !!d.Shippers_Destination_Rate_Weight,
            Shippers_Destination_Rate_Applicable:
              d.Shippers_Destination_Rate_Applicable !== false,
            Shippers_Destination_Rate_Box: !!(d as any).Shippers_Destination_Rate_Box,
          },

          volume_bands: r.volumeBands || [],
          weight_bands: r.weightBands || [],

          // 🔴 NEW: send volumetric_rule for update()
          volumetric_rule: r.volumetricRule
            ? {
              enabled: !!r.volumetricRule.enabled,
              divisor: r.volumetricRule.divisor ?? null,
              maxL_cm: r.volumetricRule.maxL_cm ?? null,
              maxW_cm: r.volumetricRule.maxW_cm ?? null,
              maxH_cm: r.volumetricRule.maxH_cm ?? null,
            }
            : null,

          heavy_rates:
            (basic.value.Shippers_Type === 'heavy' ? (heavy.value.heavyRates || []) : [])
              .filter(hr => hr.destinationIndex === i)
              .map(hr => ({
                vehicle_type: hr.vehicleType,
                Shippers_Flat_Rate: hr.Shippers_Flat_Rate ?? null,
                Shippers_Hourly_Rate: hr.Shippers_Hourly_Rate ?? null,
                Shippers_Min_Hours: hr.Shippers_Min_Hours ?? 0,
                Shippers_Currency: hr.Shippers_Currency || 'OMR',
              })),
        }
      }),

      vehicles: (basic.value.Shippers_Type === 'heavy' ? (heavy.value.vehicles || []) : []),
      standard_boxes: boxes.value.map(b => ({
        Box_Code: b.Box_Code || null,
        Box_Label: b.Box_Label || null,
        Length_cm: b.Length_cm ?? null,
        Width_cm: b.Width_cm ?? null,
        Height_cm: b.Height_cm ?? null,
        Max_Weight_Kg: b.Max_Weight_Kg ?? null,

        Notes: b.Notes || null
      }))
    }

    const formData = new FormData()
    formData.append('payload', JSON.stringify(payload))

    if (imageFile.value) {
      formData.append('file', imageFile.value)
    }


    formData.append('_method', 'PUT')


    await $axios.post(
      `/api/v1/shipping/shippers/${shipperId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    alert('Shipper updated successfully.')
    navigateTo('/admin/shipping/shippers')
  } catch (e: any) {
    alert(e?.response?.data?.message || e?.message || 'Failed to update')
  } finally {
    busy.value = false
  }
}



onMounted(loadShipper)

</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color:#ef4444">Edit Shipper</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg" />
            Dashboard
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">Edit Shipper</li>
      </ul>
    </div>

    <Stepper :steps="steps" :active="active" />

    <div class="card h-100 p-0 radius-12 overflow-hidden">
      <div class="card-body p-40">
        <!-- STEP 1 -->
        <div v-if="active === 1">
          <ShipperFormBasic v-model="basic" @image-selected="onImageChange" />
        </div>

        <!-- STEP 2 -->
        <div v-else-if="active === 2">

        
          <ShipperFormContacts v-model="contacts" />
        </div>

        <!-- STEP 3 -->
        <div v-else-if="active === 3">
          <ShipperFormDestinations v-model="destinations" />
        </div>

        <!-- STEP 4 -->
        <div v-else-if="active === 4">
          <ShipperFormRates v-model="rates" :destinations="destinations" />
        </div>

        <!-- Heavy -->
        <div v-else-if="isHeavy && active === 5">
          <ShipperFormHeavy v-model="heavy" :destinations="destinations" />
        </div>

        <!-- Boxes (non-heavy step 5; heavy step 6) -->
        <div v-else-if="(!isHeavy && active === 5) || (isHeavy && active === 6)">
          <ShipperFormBoxes v-model="boxes" />
        </div>

        <!-- Review (non-heavy step 6; heavy step 7) — reuse your existing Review block -->
        <div v-else>
          <div class="alert alert-info mb-16">Review your changes, then click <strong>Update</strong>.</div>
          <!-- You can paste your existing review tables here (Basic/Contacts/Dests/Rates/Heavy/Boxes) -->
        </div>

        <div class="d-flex align-items-center justify-content-between mt-24">
          <button type="button" class="btn btn-light border" @click="goPrev"
            :disabled="active === 1 || busy">Back</button>
          <div class="d-flex gap-3">
            <button v-if="active < steps.length" type="button" class="btn btn-primary" @click="goNext"
              :disabled="busy">Next</button>
            <button v-else type="button" class="btn btn-success" @click="saveAll" :disabled="busy">
              {{ busy ? 'Updating…' : 'Update' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
