<script setup lang="ts">
import { ref, watch } from 'vue'

/** --- Types --- */
export interface DestLite {
  Shippers_Destination_Country?: string | null
  Shippers_Destination_Region?: string | null
  Shippers_Destination_District?: string | null
}
export interface VolumeBand {
  Shippers_Standard_Shipping_Volume_Size?: string | null
  Shippers_Standard_Shipping_Volume_Rate: number | null
  Shippers_Currency?: string | null
  Shippers_Min_Volume_Cbm?: number | null
  Shippers_Max_Volume_Cbm?: number | null
  Shippers_Base_Fee?: number | null
  Shippers_Per_Cbm_Fee?: number | null
  Shippers_Flat_Fee?: number | null
}
export interface WeightBand {
  Shippers_Standard_Shipping_Weight_Size?: string | null
  Shippers_Standard_Shipping_Weight_Rate: number | null
  Shippers_Currency?: string | null
  Shippers_Min_Weight_Kg?: number | null
  Shippers_Max_Weight_Kg?: number | null
  Shippers_Base_Fee?: number | null
  Shippers_Per_Kg_Fee?: number | null
  Shippers_Flat_Fee?: number | null
}
export interface VolumetricRule {
  enabled: boolean
  divisor: number | null
  maxL_cm?: number | null
  maxW_cm?: number | null
  maxH_cm?: number | null
  note?: string | null
}

type RateMode = 'volume' | 'weight'

export interface RatesPerDestination {
  volumeBands: VolumeBand[]
  weightBands: WeightBand[]
  volumetricRule?: VolumetricRule | null
    rate_mode?: RateMode    
}

/** --- Props + v-model (keep first) --- */
const props = defineProps<{ destinations: DestLite[] }>()
const rows = defineModel<RatesPerDestination[]>({ default: [] })

/** --- Per-destination Rate Mode --- */
const rateMode = ref<Array<'volume'|'weight'>>([])
const syncRateMode = () => {
  const need = props.destinations.length
  const have = rateMode.value.length
  if (need > have) {
    for (let i = have; i < need; i++) rateMode.value.push('weight') // default
  } else if (need < have) {
    rateMode.value.splice(need)
  }


  // ensure rows carry the same mode
 for (let i = 0; i < need; i++) {
  rows.value[i] ||= { volumeBands: [], weightBands: [], volumetricRule: null }
   if (!rows.value[i].rate_mode) rows.value[i].rate_mode = rateMode.value[i]
  }
}
watch(() => props.destinations.length, syncRateMode, { immediate: true })

/** --- Factories --- */
const newVolume = (): VolumeBand => ({
  Shippers_Standard_Shipping_Volume_Size: '',
  Shippers_Standard_Shipping_Volume_Rate: 0,
  Shippers_Currency: 'OMR',
  Shippers_Min_Volume_Cbm: null,
  Shippers_Max_Volume_Cbm: null,
  Shippers_Base_Fee: null,
  Shippers_Per_Cbm_Fee: null,
  Shippers_Flat_Fee: null
})
const newWeight = (): WeightBand => ({
  Shippers_Standard_Shipping_Weight_Size: '',
  Shippers_Standard_Shipping_Weight_Rate: 0,
  Shippers_Currency: 'OMR',
  Shippers_Min_Weight_Kg: null,
  Shippers_Max_Weight_Kg: null,
  Shippers_Base_Fee: null,
  Shippers_Per_Kg_Fee: null,
  Shippers_Flat_Fee: null
})
const defaultVolumetric = (): VolumetricRule => ({
  enabled: true,
  divisor: 4000,
  maxL_cm: 60,
  maxW_cm: 60,
  maxH_cm: 60,
  note: null
})

/** --- Keep rows aligned with destinations --- */
const syncLength = () => {
  const need = props.destinations.length
  const have = rows.value.length
  if (need > have) {
    for (let i = have; i < need; i++) {
      rows.value.push({ volumeBands: [], weightBands: [], volumetricRule: null })
    }
  } else if (need < have) {
    rows.value.splice(need)
  }

  // NEW: ensure each destination has a volumetricRule object
  for (let i = 0; i < rows.value.length; i++) {
    if (!rows.value[i].volumetricRule) {
      rows.value[i].volumetricRule = defaultVolumetric()
    }
  }
}
watch(() => props.destinations.length, syncLength, { immediate: true })



const withRuleDivisor = (i: number) => ({
  ...tests.value[i],
  divisor: Number(rows.value[i]?.volumetricRule?.divisor ?? tests.value[i]?.divisor ?? 4000)
})

// Keep the preview's divisor mirrored from the rule
watch(rows, () => {
  for (let i = 0; i < rows.value.length; i++) {
    const d = rows.value[i]?.volumetricRule?.divisor
    if (typeof d === 'number' && tests.value[i]) tests.value[i].divisor = d
  }
}, { deep: true })

/** --- Volumetric preview inputs (per destination) --- */
interface TestParcel {
  grossKg: number | null
  lengthCm: number | null
  widthCm: number | null
  heightCm: number | null
  divisor: number
}
const tests = ref<TestParcel[]>([])
const syncTestLength = () => {
  const need = props.destinations.length
  const have = tests.value.length
  if (need > have) {
    for (let i = have; i < need; i++) {
      tests.value.push({ grossKg: null, lengthCm: null, widthCm: null, heightCm: null, divisor: 4000 })
    }
  } else if (need < have) {
    tests.value.splice(need)
  }
}
watch(() => props.destinations.length, syncTestLength, { immediate: true })


// helper to coerce rule fields to numbers
const ruleNum = (v: any, fallback: number | null = null): number | null => {
  if (v === null || v === undefined) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

// hydrate tests[] from volumetricRule once data arrives
const hydrateTestsFromRule = () => {
  const n = rows.value.length

  for (let i = 0; i < n; i++) {
    const rule = rows.value[i]?.volumetricRule
    if (!tests.value[i]) {
      tests.value[i] = {
        grossKg: null,
        lengthCm: null,
        widthCm: null,
        heightCm: null,
        divisor: 4000
      }
    }

    if (rule) {
      const t = tests.value[i]

      // only fill if still empty so we don't overwrite user-typed values
      if (t.lengthCm == null) t.lengthCm = ruleNum(rule.maxL_cm)
      if (t.widthCm  == null) t.widthCm  = ruleNum(rule.maxW_cm)
      if (t.heightCm == null) t.heightCm = ruleNum(rule.maxH_cm)

      // keep divisor in sync with the rule
      t.divisor = ruleNum(rule.divisor, 4000) ?? 4000
    }
  }
}

// run once and on changes
watch(rows, hydrateTestsFromRule, { deep: true, immediate: true })


/** --- Helpers --- */
const toNum = (v: any): number | null => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
const volumetricWeight = (t: TestParcel): number | null => {
  const L = toNum(t.lengthCm), W = toNum(t.widthCm), H = toNum(t.heightCm), D = toNum(t.divisor)
  if (L == null || W == null || H == null || !D) return null
  return (L * W * H) / D
}
const chargeableWeight = (t: TestParcel): number | null => {
  const vol = volumetricWeight(t)
  const gross = toNum(t.grossKg)
  if (gross == null && vol == null) return null
  if (gross == null) return vol
  if (vol == null) return gross
  return Math.max(gross, vol)
}
const pickWeightBand = (bands: WeightBand[], kg: number | null): WeightBand | null => {
  if (kg == null || !bands?.length) return null
  const hit = bands.find(b =>
    (b.Shippers_Min_Weight_Kg ?? -Infinity) <= kg &&
    (b.Shippers_Max_Weight_Kg ?? Infinity) >= kg
  )
  if (hit) return hit
  const sorted = [...bands].sort((a, b) =>
    (b.Shippers_Max_Weight_Kg ?? 0) - (a.Shippers_Max_Weight_Kg ?? 0)
  )
  return sorted[0] ?? null
}
const estimateWeightCost = (band: WeightBand | null, kg: number | null): number | null => {
  if (!band || kg == null) return null
  const flat = Number(band.Shippers_Flat_Fee ?? 0)
  if (flat > 0) return flat

  const perKg = Number(band.Shippers_Per_Kg_Fee ?? 0)
  const base  = Number(band.Shippers_Base_Fee ?? band.Shippers_Standard_Shipping_Weight_Rate ?? 0)
  const min   = Number(band.Shippers_Min_Weight_Kg ?? 0)
  const max   = Number(band.Shippers_Max_Weight_Kg ?? kg)
  const charge = Math.min(Math.max(kg, min), max)

  return perKg > 0 ? base + Math.max(0, charge - min) * perKg : base
}

/** --- Actions: add/remove band rows --- */
const addVolume = (i: number) => {
  rows.value[i] ||= { volumeBands: [], weightBands: [], volumetricRule: null }
  rows.value[i].rate_mode = rateMode.value[i]
  rows.value[i].volumeBands.push(newVolume())              // <<< missing
}
const removeVolume = (i: number, j: number) => rows.value[i].volumeBands.splice(j, 1)

const addWeight = (i: number) => {
  rows.value[i] ||= { volumeBands: [], weightBands: [], volumetricRule: null }
  rows.value[i].rate_mode = rateMode.value[i]
  rows.value[i].weightBands.push(newWeight())              // <<< missing
}
const removeWeight = (i: number, j: number) => rows.value[i].weightBands.splice(j, 1)

/** --- Volumetric (Rule) add/remove --- */
const addVolumetric = (i: number) => {
  rows.value[i] ||= { volumeBands: [], weightBands: [], volumetricRule: null }
  rows.value[i].rate_mode = rateMode.value[i]             // <<< add this
  if (!rows.value[i].volumetricRule) {
    rows.value[i].volumetricRule = defaultVolumetric()
    if (tests.value[i]) tests.value[i].divisor = rows.value[i].volumetricRule!.divisor ?? 4000
  }
}

const removeVolumetric = (i: number) => {
  if (rows.value[i]) rows.value[i].volumetricRule = null
}

/** --- Mode change handler (ensures required bits exist) --- */
const onModeChange = (i: number) => {
  const m = rateMode.value[i]
  rows.value[i] ||= { volumeBands: [], weightBands: [], volumetricRule: null }
  rows.value[i].rate_mode = m                              // <<< ensure always set

  if (m === 'volume') {
    if (!rows.value[i].volumeBands?.length) addVolume(i)
  } else {
    if (!rows.value[i].weightBands?.length) addWeight(i)
  } 
}

/** --- Unified "Add" handler for the current mode --- */
const addBand = (i: number) => {
  const m = rateMode.value[i]
  if (m === 'volume') return addVolume(i)
    if (m === 'weight') return addWeight(i)
 
}
</script>


<template>
 <div>
  <div v-if="!props.destinations.length" class="text-muted">
    Add at least one destination in the previous step.
  </div>

  <div v-for="(d, i) in props.destinations" :key="i" class="border radius-12 p-3 mb-16">
 
    <h6 class="fw-semibold mb-12">
      Destination #{{ i+1 }} —
      {{ d.Shippers_Destination_Country || '-' }} /
      {{ d.Shippers_Destination_Region || '-' }} /
      {{ d.Shippers_Destination_District || '-' }}
    </h6>

    <!-- Add-band toolbar -->
   <div class="d-flex align-items-center gap-2 mb-10">
  <label class="form-label mb-0 text-sm">Rate Mode</label>
  <select v-model="rateMode[i]" @change="onModeChange(i)" class="form-select form-select-sm w-auto radius-8">
    <option value="volume">Volume</option>
    <option value="weight">Weight</option>
 
  </select>

  <!-- Optional convenience button: adds one item appropriate to the current mode -->
<button type="button" class="btn btn-primary btn-sm" @click="addBand(i)">
  Add {{ rateMode[i] === 'volume' ? 'Volume Band' : 'Weight Band' }}
</button>
</div>


    <!-- Volume bands -->
    <div class="mb-12"  v-if="rateMode[i] === 'volume'">
      <div class="d-flex align-items-center justify-content-between">
        <span class="fw-semibold">Volume Bands</span>
      </div>
      <div v-if="rows[i].volumeBands.length === 0" class="text-muted mt-8">No volume bands.</div>

      <div v-for="(v, j) in rows[i].volumeBands" :key="j" class="p-3 mt-8 border radius-8">
        <div class="row">
          <div class="col-sm-3 mb-8">
            <label class="form-label text-sm">Size Code</label>
            <input v-model="rows[i].volumeBands[j].Shippers_Standard_Shipping_Volume_Size" class="form-control radius-8" placeholder="e.g., BOX_S or 0–0.05 CBM"/>
          </div>
          <div class="col-sm-3 mb-8">
            <label class="form-label text-sm">Standard Rate</label>
            <input type="number" step="0.001" v-model.number="rows[i].volumeBands[j].Shippers_Standard_Shipping_Volume_Rate" class="form-control radius-8"/>
          </div>
          <div class="col-sm-2 mb-8">
            <label class="form-label text-sm">Min CBM</label>
            <input type="number" step="0.0001" v-model.number="rows[i].volumeBands[j].Shippers_Min_Volume_Cbm" class="form-control radius-8"/>
          </div>
          <div class="col-sm-2 mb-8">
            <label class="form-label text-sm">Max CBM</label>
            <input type="number" step="0.0001" v-model.number="rows[i].volumeBands[j].Shippers_Max_Volume_Cbm" class="form-control radius-8"/>
          </div>
          <div class="col-sm-2 mb-8">
            <label class="form-label text-sm">Currency</label>
            <input v-model="rows[i].volumeBands[j].Shippers_Currency" maxlength="3" class="form-control radius-8"/>
          </div>

          <div class="col-sm-4 mb-8">
            <label class="form-label text-sm">Base Fee</label>
            <input type="number" step="0.001" v-model.number="rows[i].volumeBands[j].Shippers_Base_Fee" class="form-control radius-8"/>
          </div>
          <div class="col-sm-4 mb-8">
            <label class="form-label text-sm">Per CBM Fee</label>
            <input type="number" step="0.001" v-model.number="rows[i].volumeBands[j].Shippers_Per_Cbm_Fee" class="form-control radius-8"/>
          </div>
          <div class="col-sm-4 mb-8">
            <label class="form-label text-sm">Flat Fee</label>
            <input type="number" step="0.001" v-model.number="rows[i].volumeBands[j].Shippers_Flat_Fee" class="form-control radius-8"/>
          </div>
        </div>

        <div class="d-flex justify-content-end">
          <button type="button" class="btn btn-danger btn-sm" @click="removeVolume(i, j)">Remove</button>
        </div>
      </div>
    </div>

    <hr/>

    <!-- Weight bands -->
    <div class="mt-12" v-if="rateMode[i] === 'weight'">
      <div class="d-flex align-items-center justify-content-between">
        <span class="fw-semibold">Weight Bands</span>
      </div>
      <div v-if="rows[i].weightBands.length === 0" class="text-muted mt-8">No weight bands.</div>

      <div v-for="(w, j) in rows[i].weightBands" :key="j" class="p-3 mt-8 border radius-8">
        <div class="row">
          <div class="col-sm-3 mb-8">
            <label class="form-label text-sm">Band Code</label>
            <input v-model="rows[i].weightBands[j].Shippers_Standard_Shipping_Weight_Size" class="form-control radius-8" placeholder="e.g., 0–5 KG"/>
          </div>
          <div class="col-sm-3 mb-8">
            <label class="form-label text-sm">Standard Rate</label>
            <input type="number" step="0.001" v-model.number="rows[i].weightBands[j].Shippers_Standard_Shipping_Weight_Rate" class="form-control radius-8"/>
          </div>
          <div class="col-sm-2 mb-8">
            <label class="form-label text-sm">Min KG</label>
            <input type="number" step="0.001" v-model.number="rows[i].weightBands[j].Shippers_Min_Weight_Kg" class="form-control radius-8"/>
          </div>
          <div class="col-sm-2 mb-8">
            <label class="form-label text-sm">Max KG</label>
            <input type="number" step="0.001" v-model.number="rows[i].weightBands[j].Shippers_Max_Weight_Kg" class="form-control radius-8"/>
          </div>
          <div class="col-sm-2 mb-8">
            <label class="form-label text-sm">Currency</label>
            <input v-model="rows[i].weightBands[j].Shippers_Currency" maxlength="3" class="form-control radius-8"/>
          </div>

          <div class="col-sm-4 mb-8">
            <label class="form-label text-sm">Base Fee</label>
            <input type="number" step="0.001" v-model.number="rows[i].weightBands[j].Shippers_Base_Fee" class="form-control radius-8"/>
          </div>
          <div class="col-sm-4 mb-8">
            <label class="form-label text-sm">Per KG Fee</label>
            <input type="number" step="0.001" v-model.number="rows[i].weightBands[j].Shippers_Per_Kg_Fee" class="form-control radius-8"/>
          </div>
          <div class="col-sm-4 mb-8">
            <label class="form-label text-sm">Flat Fee</label>
            <input type="number" step="0.001" v-model.number="rows[i].weightBands[j].Shippers_Flat_Fee" class="form-control radius-8"/>
          </div>
        </div>

        <div class="d-flex justify-content-end">
          <button type="button" class="btn btn-danger btn-sm" @click="removeWeight(i, j)">Remove</button>
        </div>
      </div>
    </div>

    <hr/>

    <!-- Volumetric preview -->
    <div class="mt-12">
      <div class="p-3 mt-12 border radius-8 bg-light-subtle">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <span class="fw-semibold">Volumetric</span>
        </div>

        <div class="row">
          <div class="col-sm-2 mb-8">
            <label class="form-label text-sm">Gross Weight (kg)</label>
            <input type="number" step="0.001" v-model.number="tests[i].grossKg" class="form-control radius-8" />
          </div>
          <div class="col-sm-2 mb-8">
            <label class="form-label text-sm">Length (cm)</label>
            <input type="number" step="0.1" v-model.number="tests[i].lengthCm" class="form-control radius-8" />
          </div>
          <div class="col-sm-2 mb-8">
            <label class="form-label text-sm">Width (cm)</label>
            <input type="number" step="0.1" v-model.number="tests[i].widthCm" class="form-control radius-8" />
          </div>
          <div class="col-sm-2 mb-8">
            <label class="form-label text-sm">Height (cm)</label>
            <input type="number" step="0.1" v-model.number="tests[i].heightCm" class="form-control radius-8" />
          </div>
        <div v-if="rows[i]?.volumetricRule" class="col-sm-2 mb-8">
  <label class="form-label text-sm">Divisor</label>
  <input
    type="number"
    step="1"
    v-model.number="rows[i].volumetricRule.divisor"
    class="form-control radius-8"
  />
  <small class="text-muted">Default 4000</small>
</div>
        </div>

        <div class="row">
          <div class="col-sm-4">
            <div class="alert alert-secondary py-2">
              <div><strong>Volumetric Wt:</strong>
                {{ (volumetricWeight(tests[i]) ?? 0).toFixed(3) }} kg
              </div>
              <div><strong>Chargeable Wt:</strong>
                {{ (chargeableWeight(tests[i]) ?? 0).toFixed(3) }} kg
              </div>
            </div>
          </div>

          <div class="col-sm-8">
            <div class="alert alert-info py-2">
              <template v-if="chargeableWeight(tests[i]) && rows[i].weightBands?.length">
                <span class="me-2"><strong>Band:</strong>
                  {{
                    (pickWeightBand(rows[i].weightBands, chargeableWeight(tests[i]))?.Shippers_Standard_Shipping_Weight_Size) || '—'
                  }}
                </span>
                <span class="me-2"><strong>Est. Cost:</strong>
                  {{
                    (estimateWeightCost(
                      pickWeightBand(rows[i].weightBands, chargeableWeight(tests[i])),
                      chargeableWeight(tests[i])
                    ) ?? 0).toFixed(3)
                  }}
                  {{ pickWeightBand(rows[i].weightBands, chargeableWeight(tests[i]))?.Shippers_Currency || 'OMR' }}
                </span>
              </template>
              <template v-else>
                Add weight bands to enable the preview.
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</div>

</template>