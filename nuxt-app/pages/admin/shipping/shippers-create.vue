<script setup lang="ts">
import { definePageMeta, useNuxtApp, navigateTo } from '#imports'
import { ref, computed } from 'vue'
import Stepper from '@/components/shipping/Stepper.vue'
import ShipperFormBasic, { type BasicForm } from '@/components/shipping/ShipperFormBasic.vue'
import ShipperFormContacts, { type ContactRow } from '@/components/shipping/ShipperFormContacts.vue'
import ShipperFormDestinations, { type DestinationRow } from '@/components/shipping/ShipperFormDestinations.vue'
import ShipperFormHeavy from '@/components/shipping/ShipperFormHeavy.vue'
import ShipperFormRates, { type RatesPerDestination } from '@/components/shipping/ShipperFormRates.vue'
import ShipperFormBoxes, { type StandardBox } from '@/components/shipping/ShipperFormBoxes.vue'
import { useFlashStore } from '~/stores/flashs'
const flash = useFlashStore()
definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'shipping.shippers'
})



const { $axios } = (useNuxtApp() as any)

const stepsBase = ['Basic Details', 'Contacts', 'Destinations & Flags', 'Rates (Volume/Weight)', 'Review & Save']
const active = ref(1)



const boxes = ref<StandardBox[]>([])

const destinations = ref<DestinationRow[]>([])
const rates = ref<RatesPerDestination[]>([]) // aligned by destination index


const imageFile = ref<File | null>(null)

const onImageSelected = (file: File | null) => {
  imageFile.value = file
}

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
  Shippers_Is_Active: true,
  Shippers_Image_Path: '',
  Shippers_Size: '',
  Shippers_Extenstion: '',
  Shippers_Image_Type: '',
  Shippers_COD: false

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
  // base: 1) Basic 2) Contacts 3) Destinations 4) Rates 5) Review
  const base = [...stepsBase] // ['Basic Details','Contacts','Destinations & Flags','Rates (Volume/Weight)','Review & Save']

  if (basic.value.Shippers_Type !== 'heavy') {
    // Insert AFTER Rates (index 4, 1-based → array index 4-1=3; but to insert before Review we use 4)
    base.splice(4, 0, 'Standard Boxes') // now: Basic, Contacts, Destinations, Rates, Standard Boxes, Review
  } else {
    // Insert Heavy step just before Review
    base.splice(4, 0, 'Heavy (Vehicles & Rates)')
    // Optional: also add boxes for heavy (remove if you DON'T want boxes for heavy)
    base.splice(5, 0, 'Standard Boxes')
  }
  return base
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


const isHeavy = computed(() => basic.value.Shippers_Type === 'heavy')

const heavyRatesByDest = computed<Record<number, Array<{
  vehicleType: string | ''
  Shippers_Flat_Rate?: number | null
  Shippers_Hourly_Rate?: number | null
  Shippers_Min_Hours?: number | null
  Shippers_Currency?: string | null
}>>>(
  () => (heavy.value?.heavyRates ?? []).reduce((acc, r) => {
    if (typeof r.destinationIndex === 'number') {
      (acc[r.destinationIndex] ||= []).push(r)
    }
    return acc
  }, {} as Record<number, any[]>)
)

const currency = (v?: string | null) => (v || '—')
const num = (v?: number | null, d = 3) =>
  (v === null || v === undefined || Number.isNaN(v) ? '—' : Number(v).toFixed(d))
const yesno = (b?: boolean) => (b ? 'Yes' : 'No')
const dash = (v?: string | null) => (v && String(v).trim() ? v : '—')

const appendFormData = (fd: FormData, data: any, parentKey = '') => {
  if (data === null || data === undefined) return

  if (Array.isArray(data)) {
    data.forEach((value, index) => {
      const key = parentKey ? `${parentKey}[${index}]` : String(index)
      appendFormData(fd, value, key)
    })
  } else if (
    typeof data === 'object' &&
    !(data instanceof File) &&
    !(data instanceof Blob)
  ) {
    Object.entries(data).forEach(([key, value]) => {
      const fullKey = parentKey ? `${parentKey}[${key}]` : key
      appendFormData(fd, value, fullKey)
    })
  } else {
    if (!parentKey) return

    // ✅ Files stay as File/Blob
    if (data instanceof File || data instanceof Blob) {
      fd.append(parentKey, data)
      return
    }

    // ✅ Booleans → '1' / '0' so Laravel boolean rule always accepts them
    if (typeof data === 'boolean') {
      fd.append(parentKey, data ? '1' : '0')
      return
    }

    // ✅ Numbers / strings → string
    fd.append(parentKey, String(data))
  }
}


const saveAll = async () => {
  const err = validateBasic()
  if (err) { alert(err); active.value = 1; return }

  try {
    busy.value = true


    const asMode = (m?: string | null): 'volume' | 'weight' => {
      const x = String(m || '').toLowerCase()
      return x === 'volume' ? 'volume' : 'weight'
    }


    const isVolumeBandValid = (v: any) =>
      v && (v.Shippers_Standard_Shipping_Volume_Rate != null ||
        v.Shippers_Min_Volume_Cbm != null ||
        v.Shippers_Max_Volume_Cbm != null ||
        v.Shippers_Base_Fee != null ||
        v.Shippers_Per_Cbm_Fee != null ||
        v.Shippers_Flat_Fee != null)

    const isWeightBandValid = (w: any) =>
      w && (w.Shippers_Standard_Shipping_Weight_Rate != null ||
        w.Shippers_Min_Weight_Kg != null ||
        w.Shippers_Max_Weight_Kg != null ||
        w.Shippers_Base_Fee != null ||
        w.Shippers_Per_Kg_Fee != null ||
        w.Shippers_Flat_Fee != null)



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
        Shippers_COD: !!basic.value.Shippers_COD,      // ⭐ NEW
        Shippers_Meta: null
      },

      contacts: contacts.value,

      destinations: destinations.value.map((d, i) => {
        const r = rates.value[i] || { volumeBands: [], weightBands: [], volumetricRule: null, rate_mode: 'weight' }
        const mode = asMode(r.rate_mode)




        // keep only the relevant blocks
        const volume_bands = mode === 'volume'
          ? (r.volumeBands || []).filter(isVolumeBandValid)
          : []

        const weight_bands = mode === 'weight'
          ? (r.weightBands || []).filter(isWeightBandValid)
          : []

        // Always include the rule (even if mode === 'volume')
        const volumetric_rule = r.volumetricRule || null





        // flags from mode: volumetric behaves like weight (for “which dimension applies”)
        const flags = {
          Shippers_Destination_Rate_Volume: (mode === 'volume'),
          Shippers_Destination_Rate_Weight: (mode === 'weight'),
          Shippers_Destination_Rate_Applicable: d.Shippers_Destination_Rate_Applicable !== false,
          Shippers_Destination_Rate_Box: !!d.Shippers_Destination_Rate_Box,
        }

        return {
          basic: {
            Shippers_Destination_Country_Id: d.Shippers_Destination_Country_Id ?? null,
            Shippers_Destination_Region_Id: d.Shippers_Destination_Region_Id ?? null,
            Shippers_Destination_District_Id: d.Shippers_Destination_District_Id ?? null,
            Shippers_Destination_Country: d.Shippers_Destination_Country || null,
            Shippers_Destination_Region: d.Shippers_Destination_Region || null,
            Shippers_Destination_District: d.Shippers_Destination_District || null,
            Shippers_Destination_Rate_Applicability: d.Shippers_Destination_Rate_Applicability || null,
            Shippers_Destination_Country_Preference: d.Shippers_Destination_Country_Preference || null,
            Shippers_Destination_Region_Preference: d.Shippers_Destination_Region_Preference || null,
            Shippers_Destination_District_Preference: d.Shippers_Destination_District_Preference || null
          },
          rate_mode: mode,                 // <— NEW
          flags,
          volume_bands,
          weight_bands,
          volumetric_rule,                 // <— NEW
          heavy_rates:
            (basic.value.Shippers_Type === 'heavy' ? (heavy.value.heavyRates || []) : [])
              .filter(hr => hr.destinationIndex === i)
              .map(hr => ({
                vehicle_type: hr.vehicleType,
                Shippers_Flat_Rate: hr.Shippers_Flat_Rate ?? null,
                Shippers_Hourly_Rate: hr.Shippers_Hourly_Rate ?? null,
                Shippers_Min_Hours: hr.Shippers_Min_Hours ?? 0,
                Shippers_Currency: hr.Shippers_Currency || 'OMR'
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
        Flat_Rate_Price: (b as any).Flat_Rate_Price ?? null, // only if you collect it
        Currency: (b as any).Currency || 'OMR',
        Notes: b.Notes || null
      }))
    }


    const fd = new FormData()

    appendFormData(fd, payload)

    if (imageFile.value) {

      fd.append('file', imageFile.value)
    }


    await $axios.post('/api/v1/shipping/shippers', fd, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })



    flash.success('Shipper setup saved successfully.')
    navigateTo('/admin/shipping/shippers')
  } catch (e: any) {
    flash.error(e?.response?.data?.message || e?.message || 'Failed to save')
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
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg" />
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
        <div v-show="active === 1">
          <ShipperFormBasic v-model="basic" @image-selected="onImageSelected" />
        </div>

        <!-- STEP 2 -->
        <div v-show="active === 2">
          <ShipperFormContacts v-model="contacts" />
        </div>


        <div v-show="active === 3">
          <ShipperFormDestinations v-model="destinations" />
        </div>

        <!-- 4: Rates -->
        <div v-show="active === 4">
          <ShipperFormRates v-model="rates" :destinations="destinations" />
        </div>



        <!-- 5: Heavy (only when heavy) -->
        <div v-show="basic.Shippers_Type === 'heavy' && active === 5">
          <ShipperFormHeavy v-model="heavy" :destinations="destinations" />
        </div>


        <div v-show="(basic.Shippers_Type !== 'heavy' && active === 5) ||
          (basic.Shippers_Type === 'heavy' && active === 6)
          ">
          <ShipperFormBoxes v-model="boxes" />
        </div>



        <div v-show="active === steps.length">
          <div class="col-12 mb-16">
            <h6 class="fw-semibold mb-12">Review</h6>

            <!-- BASIC DETAILS -->
            <div class="mb-16">
              <h6 class="fw-semibold mb-8">Basic Details</h6>
              <div class="table-responsive">
                <table class="table table-sm align-middle">
                  <tbody>
                    <tr>
                      <th class="w-25">Name</th>
                      <td>{{ dash(basic.Shippers_Image_Path) }}</td>
                    </tr>
                    <tr>
                      <th>Scope</th>
                      <td>{{ dash(basic.Shippers_Scope) }}</td>
                    </tr>
                    <tr>
                      <th>Type</th>
                      <td>{{ dash(basic.Shippers_Type) }}</td>
                    </tr>
                    <tr>
                      <th>Rate Mode</th>
                      <td>{{ dash(basic.Shippers_Rate_Mode) }}</td>
                    </tr>
                    <tr>
                      <th>Active</th>
                      <td>{{ yesno(basic.Shippers_Is_Active) }}</td>
                    </tr>
                    <tr>
                      <th>Address</th>
                      <td>{{ dash(basic.Shippers_Address) }}</td>
                    </tr>
                    <tr>
                      <th>Office No</th>
                      <td>{{ dash(basic.Shippers_Office_No) }}</td>
                    </tr>
                    <tr>
                      <th>GSM No</th>
                      <td>{{ dash(basic.Shippers_GSM_No) }}</td>
                    </tr>
                    <tr>
                      <th>Email</th>
                      <td>{{ dash(basic.Shippers_Email_Address) }}</td>
                    </tr>
                    <tr>
                      <th>Website</th>
                      <td>{{ dash(basic.Shippers_Official_Website_Address) }}</td>
                    </tr>
                    <tr>
                      <th>GPS</th>
                      <td>{{ dash(basic.Shippers_GPS_Location) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- CONTACTS -->
            <div class="mb-16">
              <h6 class="fw-semibold mb-8">Contacts</h6>
              <div v-if="!contacts.length" class="text-muted">No contacts added.</div>
              <div v-else class="table-responsive">
                <table class="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Position</th>
                      <th>Office</th>
                      <th>GSM</th>
                      <th>Email</th>
                      <th>Primary</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(c, ci) in contacts" :key="ci">
                      <td>{{ dash(c.Shippers_Contact_Name) }}</td>
                      <td>{{ dash(c.Shippers_Contact_Position) }}</td>
                      <td>{{ dash(c.Shippers_Contact_Office_No) }}</td>
                      <td>{{ dash(c.Shippers_Contact_GSM_No) }}</td>
                      <td>{{ dash(c.Shippers_Contact_Email_Address) }}</td>
                      <td>{{ yesno(c.Shippers_Is_Primary) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- DESTINATIONS + RATES -->
            <div class="mb-16">
              <h6 class="fw-semibold mb-8">Destinations & Rates</h6>
              <div v-if="!destinations.length" class="text-muted">No destinations added.</div>

              <div v-for="(d, i) in destinations" :key="i" class="border radius-12 p-3 mb-16">
                <h6 class="fw-semibold mb-10">
                  Destination #{{ i + 1 }} —
                  {{ dash(d.Shippers_Destination_Country) }} /
                  {{ dash(d.Shippers_Destination_Region) }} /
                  {{ dash(d.Shippers_Destination_District) }}
                </h6>

                <div class="table-responsive mb-10">
                  <table class="table table-sm align-middle">
                    <tbody>
                      <tr>
                        <th class="w-25">Applicability Label</th>
                        <td>{{ dash(d.Shippers_Destination_Rate_Applicability) }}</td>
                      </tr>
                      <tr>
                        <th>Flags</th>
                        <td>
                          Volume: {{ yesno(d.Shippers_Destination_Rate_Volume) }} |
                          Weight: {{ yesno(d.Shippers_Destination_Rate_Weight) }} |
                          Applicable: {{ yesno(d.Shippers_Destination_Rate_Applicable !== false) }}
                        </td>
                      </tr>
                      <tr>
                        <th>Prefs</th>
                        <td>
                          Country: {{ dash(d.Shippers_Destination_Country_Preference) }} |
                          Region: {{ dash(d.Shippers_Destination_Region_Preference) }} |
                          District: {{ dash(d.Shippers_Destination_District_Preference) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Volume Bands -->
                <div class="mb-12">
                  <div class="d-flex align-items-center justify-content-between mb-2">
                    <span class="fw-semibold">Volume Bands</span>
                  </div>
                  <div v-if="!(rates[i]?.volumeBands?.length)" class="text-muted">None.</div>
                  <div v-else class="table-responsive">
                    <table class="table table-sm align-middle">
                      <thead>
                        <tr>
                          <th>Size</th>
                          <th>Rate</th>
                          <th>Min CBM</th>
                          <th>Max CBM</th>
                          <th>Currency</th>
                          <th>Base Fee</th>
                          <th>Per CBM</th>
                          <th>Flat Fee</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(v, vi) in rates[i].volumeBands" :key="vi">
                          <td>{{ dash(v.Shippers_Standard_Shipping_Volume_Size) }}</td>
                          <td>{{ num(v.Shippers_Standard_Shipping_Volume_Rate) }}</td>
                          <td>{{ num(v.Shippers_Min_Volume_Cbm, 4) }}</td>
                          <td>{{ num(v.Shippers_Max_Volume_Cbm, 4) }}</td>
                          <td>{{ currency(v.Shippers_Currency) }}</td>
                          <td>{{ num(v.Shippers_Base_Fee) }}</td>
                          <td>{{ num(v.Shippers_Per_Cbm_Fee) }}</td>
                          <td>{{ num(v.Shippers_Flat_Fee) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- Weight Bands -->
                <div class="mb-12">
                  <div class="d-flex align-items-center justify-content-between mb-2">
                    <span class="fw-semibold">Weight Bands</span>
                  </div>
                  <div v-if="!(rates[i]?.weightBands?.length)" class="text-muted">None.</div>
                  <div v-else class="table-responsive">
                    <table class="table table-sm align-middle">
                      <thead>
                        <tr>
                          <th>Band</th>
                          <th>Rate</th>
                          <th>Min KG</th>
                          <th>Max KG</th>
                          <th>Currency</th>
                          <th>Base Fee</th>
                          <th>Per KG</th>
                          <th>Flat Fee</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(w, wi) in rates[i].weightBands" :key="wi">
                          <td>{{ dash(w.Shippers_Standard_Shipping_Weight_Size) }}</td>
                          <td>{{ num(w.Shippers_Standard_Shipping_Weight_Rate) }}</td>
                          <td>{{ num(w.Shippers_Min_Weight_Kg) }}</td>
                          <td>{{ num(w.Shippers_Max_Weight_Kg) }}</td>
                          <td>{{ currency(w.Shippers_Currency) }}</td>
                          <td>{{ num(w.Shippers_Base_Fee) }}</td>
                          <td>{{ num(w.Shippers_Per_Kg_Fee) }}</td>
                          <td>{{ num(w.Shippers_Flat_Fee) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- Heavy Rates per Destination -->
                <div v-if="isHeavy && (heavyRatesByDest[i]?.length)" class="mb-2">
                  <div class="d-flex align-items-center justify-content-between mb-2">
                    <span class="fw-semibold">Heavy Rates</span>
                  </div>
                  <div class="table-responsive">
                    <table class="table table-sm align-middle">
                      <thead>
                        <tr>
                          <th>Vehicle</th>
                          <th>Flat Rate</th>
                          <th>Hourly</th>
                          <th>Min Hrs</th>
                          <th>Currency</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(hr, hi) in heavyRatesByDest[i]" :key="hi">
                          <td>{{ dash(hr.vehicleType) }}</td>
                          <td>{{ num(hr.Shippers_Flat_Rate) }}</td>
                          <td>{{ num(hr.Shippers_Hourly_Rate) }}</td>
                          <td>{{ num(hr.Shippers_Min_Hours, 0) }}</td>
                          <td>{{ currency(hr.Shippers_Currency) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div> <!-- end each destination -->
            </div> <!-- end Destinations & Rates -->

            <!-- STANDARD BOXES (global, shown once) -->
            <div class="mb-16">
              <h6 class="fw-semibold mb-8">Standard Boxes</h6>
              <div v-if="!boxes.length" class="text-muted">No standard boxes.</div>
              <div v-else class="table-responsive">
                <table class="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Label</th>
                      <th>L (cm)</th>
                      <th>W (cm)</th>
                      <th>H (cm)</th>
                      <th>Max Wt (kg)</th>
                      <th>Flat Rate</th>
                      <th>Curr</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(b, bi) in boxes" :key="bi">
                      <td>{{ b.Box_Code || '—' }}</td>
                      <td>{{ b.Box_Label || '—' }}</td>
                      <td>{{ b.Length_cm ?? '—' }}</td>
                      <td>{{ b.Width_cm ?? '—' }}</td>
                      <td>{{ b.Height_cm ?? '—' }}</td>
                      <td>{{ b.Max_Weight_Kg ?? '—' }}</td>

                      <td>{{ b.Notes || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- VEHICLES (only for heavy) -->
            <div v-if="isHeavy" class="mb-16">
              <h6 class="fw-semibold mb-8">Vehicles</h6>
              <div v-if="!(heavy?.vehicles?.length)" class="text-muted">No vehicles added.</div>
              <div v-else class="table-responsive">
                <table class="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Capacity (Ton)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(v, vi) in heavy.vehicles" :key="vi">
                      <td>{{ dash(v.Shippers_Vehicle_Type) }}</td>
                      <td>{{ num(v.Shippers_Vehicle_Capacity_Ton, 2) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="alert alert-info">
              Please review the details above. You can go Back to edit, or click <strong>Finish & Create</strong> to
              submit.
            </div>
          </div>
        </div>




        <div class="d-flex align-items-center justify-content-between mt-24">
          <button type="button" class="btn btn-light border" @click="goPrev"
            :disabled="active === 1 || busy">Back</button>
          <div class="d-flex gap-3">
            <button v-if="active < steps.length" type="button" class="btn btn-primary" @click="goNext"
              :disabled="busy">Save & Next</button>
            <button v-else type="button" class="btn btn-success" @click="saveAll" :disabled="busy">
              {{ busy ? 'Saving…' : 'Finish & Create' }}
            </button>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>
