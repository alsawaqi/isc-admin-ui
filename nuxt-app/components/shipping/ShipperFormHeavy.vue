<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'

export interface DestLite {
  id?: number
  Shippers_Destination_Country?: string | null
  Shippers_Destination_Region?: string | null
  Shippers_Destination_District?: string | null
}

export interface VehicleRow {
  Shippers_Vehicle_Type: string
  Shippers_Vehicle_Capacity_Ton?: number | null
}

export interface HeavyRateRow {
  destinationIndex: number | ''
  vehicleType: string | ''           // match by type to find created vehicle id (later)
  Shippers_Flat_Rate?: number | null
  Shippers_Hourly_Rate?: number | null
  Shippers_Min_Hours?: number | null
  Shippers_Currency?: string | null
}

const props = defineProps<{
  destinations: DestLite[]
  modelValue: { vehicles: VehicleRow[]; heavyRates: HeavyRateRow[] }
}>()

const emit = defineEmits<{ 'update:modelValue': [{ vehicles: VehicleRow[]; heavyRates: HeavyRateRow[] }] }>()


// ---------- stable-key wrappers ----------
type WithUID<T> = T & { _uid: string }
type UIState = {
  vehicles: WithUID<VehicleRow>[]
  heavyRates: WithUID<HeavyRateRow>[]
}

const uid = () => Math.random().toString(36).slice(2, 10)

const toUI = (payload: { vehicles: VehicleRow[]; heavyRates: HeavyRateRow[] } | null | undefined): UIState => ({
  vehicles: (payload?.vehicles ?? []).map(v => ({ _uid: uid(), ...v })),
  heavyRates: (payload?.heavyRates ?? []).map(r => ({ _uid: uid(), ...r })),
})

const toPayload = (ui: UIState) => ({
  vehicles: ui.vehicles.map(({ _uid, ...v }) => v),
  heavyRates: ui.heavyRates.map(({ _uid, ...r }) => r),
})


// ---------- local state (no JSON stringify) ----------
const state = ref<UIState>(toUI(props.modelValue))

// debounce + guard
let t: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE = 200
const syncingFromParent = ref(false)

watch(
  () => props.modelValue,
  v => {
    syncingFromParent.value = true
    state.value = toUI(v)
    syncingFromParent.value = false
  },
  { deep: false }
)

watch(
  state,
  v => {
    if (syncingFromParent.value) return
    if (t) clearTimeout(t)
    t = setTimeout(() => {
      emit('update:modelValue', toPayload(v))
    }, DEBOUNCE)
  },
  { deep: true, flush: 'post' }
)

onBeforeUnmount(() => { if (t) clearTimeout(t) })


// ---------- helpers ----------
const addVehicle = () => {
  state.value.vehicles.push({
    _uid: uid(),
    Shippers_Vehicle_Type: '',
    Shippers_Vehicle_Capacity_Ton: null,
  })
}

const removeVehicle = (i: number) => {
  const removed = state.value.vehicles[i]
  state.value.vehicles.splice(i, 1)

  // clear vehicleType on rates that reference a now-missing type
  const types = new Set(state.value.vehicles.map(v => v.Shippers_Vehicle_Type))
  state.value.heavyRates.forEach(r => {
    if (r.vehicleType && !types.has(r.vehicleType)) r.vehicleType = ''
  })
}

const addHeavyRate = () => {
  state.value.heavyRates.push({
    _uid: uid(),
    destinationIndex: '',
    vehicleType: '',
    Shippers_Flat_Rate: null,
    Shippers_Hourly_Rate: null,
    Shippers_Min_Hours: 0,
    Shippers_Currency: 'OMR',
  })
}

const removeHeavyRate = (i: number) => {
  state.value.heavyRates.splice(i, 1)
}

// keep heavyRates.vehicleType valid if a vehicle gets renamed
watch(
  () => state.value.vehicles.map(v => v.Shippers_Vehicle_Type),
  (types) => {
    const set = new Set(types)
    state.value.heavyRates.forEach(r => {
      if (r.vehicleType && !set.has(r.vehicleType)) r.vehicleType = ''
    })
  }
)
</script>

<template>
  <div>
    <!-- Vehicles -->
    <div class="mb-16">
      <div class="d-flex align-items-center justify-content-between mb-12">
        <h6 class="fw-semibold mb-0">Vehicles</h6>
        <button type="button" class="btn btn-primary btn-sm" @click="addVehicle">Add Vehicle</button>
      </div>

      <div v-if="state.vehicles.length === 0" class="text-muted">No vehicles.</div>

      <div v-for="(v,i) in state.vehicles" :key="v._uid" class="border p-3 radius-8 mb-10">
        <div class="row">
          <div class="col-sm-6 mb-12">
            <label class="form-label text-sm">Vehicle Type <span class="text-danger-600">*</span></label>
            <input v-model="v.Shippers_Vehicle_Type" class="form-control radius-8" placeholder="e.g., 3 Ton Truck, Crane 25T"/>
          </div>
          <div class="col-sm-4 mb-12">
            <label class="form-label text-sm">Capacity (Ton)</label>
            <input type="number" step="0.01" v-model.number="v.Shippers_Vehicle_Capacity_Ton" class="form-control radius-8" />
          </div>
          <div class="col-sm-2 d-flex align-items-end">
            <button type="button" class="btn btn-danger btn-sm ms-auto" @click="removeVehicle(i)">Remove</button>
          </div>
        </div>
      </div>
    </div>

    <hr class="my-16"/>

    <!-- Heavy Rates -->
    <div>
      <div class="d-flex align-items-center justify-content-between mb-12">
        <h6 class="fw-semibold mb-0">Heavy Rates (per Destination × Vehicle)</h6>
        <button type="button" class="btn btn-primary btn-sm" @click="addHeavyRate">Add Heavy Rate</button>
      </div>

      <div v-if="state.heavyRates.length === 0" class="text-muted">No heavy rates.</div>

      <div v-for="(r,i) in state.heavyRates" :key="r._uid" class="border p-3 radius-8 mb-10">
        <div class="row">
          <div class="col-sm-4 mb-12">
            <label class="form-label text-sm">Destination</label>
            <select v-model="r.destinationIndex" class="form-control radius-8">
              <option value="">-- Select Destination --</option>
              <option v-for="(d,di) in destinations" :key="'dopt-'+di" :value="di">
                {{ d.Shippers_Destination_Country || '-' }} /
                {{ d.Shippers_Destination_Region || '-' }} /
                {{ d.Shippers_Destination_District || '-' }}
              </option>
            </select>
          </div>

          <div class="col-sm-4 mb-12">
            <label class="form-label text-sm">Vehicle</label>
            <select v-model="r.vehicleType" class="form-control radius-8">
              <option value="">-- Select Vehicle --</option>
              <option v-for="v in state.vehicles" :key="'vopt-'+v._uid" :value="v.Shippers_Vehicle_Type">
                {{ v.Shippers_Vehicle_Type || '(Unnamed vehicle)' }}
              </option>
            </select>
          </div>

          <div class="col-sm-4 mb-12">
            <label class="form-label text-sm">Currency</label>
            <input v-model="r.Shippers_Currency" maxlength="3" class="form-control radius-8" placeholder="OMR"/>
          </div>

          <div class="col-sm-4 mb-12">
            <label class="form-label text-sm">Flat Rate</label>
            <input type="number" step="0.001" v-model.number="r.Shippers_Flat_Rate" class="form-control radius-8"/>
          </div>

          <div class="col-sm-4 mb-12">
            <label class="form-label text-sm">Hourly Rate</label>
            <input type="number" step="0.001" v-model.number="r.Shippers_Hourly_Rate" class="form-control radius-8"/>
          </div>

          <div class="col-sm-2 mb-12">
            <label class="form-label text-sm">Min Hours</label>
            <input type="number" step="1" v-model.number="r.Shippers_Min_Hours" class="form-control radius-8"/>
          </div>

          <div class="col-sm-2 d-flex align-items-end">
            <button type="button" class="btn btn-danger btn-sm ms-auto" @click="removeHeavyRate(i)">Remove</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
