<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'

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

export interface RatesPerDestination {
  volumeBands: VolumeBand[]
  weightBands: WeightBand[]
}

const props = defineProps<{
  destinations: DestLite[]
  modelValue: RatesPerDestination[]   // one entry per destination index
}>()

const emit = defineEmits<{ 'update:modelValue':[RatesPerDestination[]] }>()

// ---------- stable keys + mapping helpers ----------
type WithUID<T> = T & { _uid: string }
type UIRow = {
  volumeBands: WithUID<VolumeBand>[]
  weightBands: WithUID<WeightBand>[]
}
const uid = () => Math.random().toString(36).slice(2,10)

const bandDefaultsVolume = (): VolumeBand => ({
  Shippers_Standard_Shipping_Volume_Size: '',
  Shippers_Standard_Shipping_Volume_Rate: 0,
  Shippers_Currency: 'OMR',
  Shippers_Min_Volume_Cbm: null,
  Shippers_Max_Volume_Cbm: null,
  Shippers_Base_Fee: null,
  Shippers_Per_Cbm_Fee: null,
  Shippers_Flat_Fee: null
})

const bandDefaultsWeight = (): WeightBand => ({
  Shippers_Standard_Shipping_Weight_Size: '',
  Shippers_Standard_Shipping_Weight_Rate: 0,
  Shippers_Currency: 'OMR',
  Shippers_Min_Weight_Kg: null,
  Shippers_Max_Weight_Kg: null,
  Shippers_Base_Fee: null,
  Shippers_Per_Kg_Fee: null,
  Shippers_Flat_Fee: null
})

const toUIRow = (r?: RatesPerDestination): UIRow => ({
  volumeBands: (r?.volumeBands ?? []).map(b => ({ _uid: uid(), ...b })),
  weightBands: (r?.weightBands ?? []).map(b => ({ _uid: uid(), ...b })),
})

const toPayload = (arr: UIRow[]): RatesPerDestination[] =>
  arr.map(r => ({
    volumeBands: r.volumeBands.map(({ _uid, ...b }) => b),
    weightBands: r.weightBands.map(({ _uid, ...b }) => b),
  }))

// ---------- state ----------
const rows = ref<UIRow[]>(
  props.modelValue?.length
    ? props.modelValue.map(r => toUIRow(r))
    : (props.destinations ?? []).map(() => ({ volumeBands: [], weightBands: [] }))
)

// keep rows length aligned with destinations (preserve existing by index)
const resizeRowsToDestinations = () => {
  const need = props.destinations.length
  const have = rows.value.length
  if (need > have) {
    for (let i = have; i < need; i++) rows.value.push({ volumeBands: [], weightBands: [] })
  } else if (need < have) {
    rows.value.splice(need)
  }
}

// ---------- debounce + guard ----------
let t: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE = 200
const syncingFromParent = ref(false)

// parent → local (no deep watch)
watch(() => props.modelValue, (v) => {
  syncingFromParent.value = true
  if (Array.isArray(v)) {
    rows.value = v.map(r => toUIRow(r))
    resizeRowsToDestinations()
  }
  syncingFromParent.value = false
}, { deep: false })

// destinations length changes → resize rows (preserve data)
watch(() => props.destinations.length, () => {
  resizeRowsToDestinations()
})

// local → parent (debounced)
watch(rows, (v) => {
  if (syncingFromParent.value) return
  if (t) clearTimeout(t)
  t = setTimeout(() => {
    emit('update:modelValue', toPayload(v))
  }, DEBOUNCE)
}, { deep: true, flush: 'post' })

onBeforeUnmount(() => { if (t) clearTimeout(t) })

// ---------- actions ----------
const addVolume = (i:number) => {
  rows.value[i].volumeBands.push({ _uid: uid(), ...bandDefaultsVolume() })
}
const removeVolume = (i:number, j:number) => {
  rows.value[i].volumeBands.splice(j,1)
}

const addWeight = (i:number) => {
  rows.value[i].weightBands.push({ _uid: uid(), ...bandDefaultsWeight() })
}
const removeWeight = (i:number, j:number) => {
  rows.value[i].weightBands.splice(j,1)
}
</script>

<template>
  <div>
    <div v-if="!destinations.length" class="text-muted">Add at least one destination in previous step.</div>

    <div v-for="(d, i) in destinations" :key="i" class="border radius-12 p-3 mb-16">
      <h6 class="fw-semibold mb-12">
        Destination #{{ i+1 }} —
        {{ d.Shippers_Destination_Country || '-' }} /
        {{ d.Shippers_Destination_Region || '-' }} /
        {{ d.Shippers_Destination_District || '-' }}
      </h6>

      <!-- Volume bands -->
      <div class="mb-12">
        <div class="d-flex align-items-center justify-content-between">
          <span class="fw-semibold">Volume Bands</span>
          <button type="button" class="btn btn-primary btn-sm" @click="addVolume(i)">Add Volume Band</button>
        </div>
        <div v-if="rows[i].volumeBands.length === 0" class="text-muted mt-8">No volume bands.</div>

        <div v-for="(v, j) in rows[i].volumeBands" :key="v._uid" class="p-3 mt-8 border radius-8">
          <div class="row">
            <div class="col-sm-3 mb-8">
              <label class="form-label text-sm">Size Code</label>
              <input v-model="v.Shippers_Standard_Shipping_Volume_Size" class="form-control radius-8" placeholder="e.g., BOX_S, 0-0.05 CBM"/>
            </div>
            <div class="col-sm-3 mb-8">
              <label class="form-label text-sm">Standard Rate</label>
              <input type="number" step="0.001" v-model.number="v.Shippers_Standard_Shipping_Volume_Rate" class="form-control radius-8"/>
            </div>
            <div class="col-sm-2 mb-8">
              <label class="form-label text-sm">Min CBM</label>
              <input type="number" step="0.0001" v-model.number="v.Shippers_Min_Volume_Cbm" class="form-control radius-8"/>
            </div>
            <div class="col-sm-2 mb-8">
              <label class="form-label text-sm">Max CBM</label>
              <input type="number" step="0.0001" v-model.number="v.Shippers_Max_Volume_Cbm" class="form-control radius-8"/>
            </div>
            <div class="col-sm-2 mb-8">
              <label class="form-label text-sm">Currency</label>
              <input v-model="v.Shippers_Currency" maxlength="3" class="form-control radius-8"/>
            </div>

            <div class="col-sm-4 mb-8">
              <label class="form-label text-sm">Base Fee</label>
              <input type="number" step="0.001" v-model.number="v.Shippers_Base_Fee" class="form-control radius-8"/>
            </div>
            <div class="col-sm-4 mb-8">
              <label class="form-label text-sm">Per CBM Fee</label>
              <input type="number" step="0.001" v-model.number="v.Shippers_Per_Cbm_Fee" class="form-control radius-8"/>
            </div>
            <div class="col-sm-4 mb-8">
              <label class="form-label text-sm">Flat Fee</label>
              <input type="number" step="0.001" v-model.number="v.Shippers_Flat_Fee" class="form-control radius-8"/>
            </div>
          </div>

          <div class="d-flex justify-content-end">
            <button type="button" class="btn btn-danger btn-sm" @click="removeVolume(i,j)">Remove</button>
          </div>
        </div>
      </div>

      <hr/>

      <!-- Weight bands -->
      <div class="mt-12">
        <div class="d-flex align-items-center justify-content-between">
          <span class="fw-semibold">Weight Bands</span>
          <button type="button" class="btn btn-primary btn-sm" @click="addWeight(i)">Add Weight Band</button>
        </div>
        <div v-if="rows[i].weightBands.length === 0" class="text-muted mt-8">No weight bands.</div>

        <div v-for="(w, j) in rows[i].weightBands" :key="w._uid" class="p-3 mt-8 border radius-8">
          <div class="row">
            <div class="col-sm-3 mb-8">
              <label class="form-label text-sm">Band Code</label>
              <input v-model="w.Shippers_Standard_Shipping_Weight_Size" class="form-control radius-8" placeholder="e.g., 0-5KG"/>
            </div>
            <div class="col-sm-3 mb-8">
              <label class="form-label text-sm">Standard Rate</label>
              <input type="number" step="0.001" v-model.number="w.Shippers_Standard_Shipping_Weight_Rate" class="form-control radius-8"/>
            </div>
            <div class="col-sm-2 mb-8">
              <label class="form-label text-sm">Min KG</label>
              <input type="number" step="0.001" v-model.number="w.Shippers_Min_Weight_Kg" class="form-control radius-8"/>
            </div>
            <div class="col-sm-2 mb-8">
              <label class="form-label text-sm">Max KG</label>
              <input type="number" step="0.001" v-model.number="w.Shippers_Max_Weight_Kg" class="form-control radius-8"/>
            </div>
            <div class="col-sm-2 mb-8">
              <label class="form-label text-sm">Currency</label>
              <input v-model="w.Shippers_Currency" maxlength="3" class="form-control radius-8"/>
            </div>

            <div class="col-sm-4 mb-8">
              <label class="form-label text-sm">Base Fee</label>
              <input type="number" step="0.001" v-model.number="w.Shippers_Base_Fee" class="form-control radius-8"/>
            </div>
            <div class="col-sm-4 mb-8">
              <label class="form-label text-sm">Per KG Fee</label>
              <input type="number" step="0.001" v-model.number="w.Shippers_Per_Kg_Fee" class="form-control radius-8"/>
            </div>
            <div class="col-sm-4 mb-8">
              <label class="form-label text-sm">Flat Fee</label>
              <input type="number" step="0.001" v-model.number="w.Shippers_Flat_Fee" class="form-control radius-8"/>
            </div>
          </div>

          <div class="d-flex justify-content-end">
            <button type="button" class="btn btn-danger btn-sm" @click="removeWeight(i,j)">Remove</button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
