<script setup lang="ts">
import { ref, watch, onBeforeUnmount, toRaw } from 'vue'

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

export interface RatesPerDestination {
  volumeBands: VolumeBand[]
  weightBands: WeightBand[]
}

/** --- Props + v-model --- */
const props = defineProps<{ destinations: DestLite[] }>()
const rows = defineModel<RatesPerDestination[]>({ default: [] })

/** --- Defaults --- */
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

/** --- Keep rows aligned with destinations --- */
const syncLength = () => {
  const need = props.destinations.length
  const have = rows.value.length
  if (need > have) {
    for (let i = have; i < need; i++) rows.value.push({ volumeBands: [], weightBands: [] })
  } else if (need < have) {
    rows.value.splice(need)
  }
}
watch(() => props.destinations.length, syncLength, { immediate: true })

/** --- Actions --- */
const addVolume = (i: number) => rows.value[i].volumeBands.push(newVolume())
const removeVolume = (i: number, j: number) => rows.value[i].volumeBands.splice(j, 1)

const addWeight = (i: number) => rows.value[i].weightBands.push(newWeight())
const removeWeight = (i: number, j: number) => rows.value[i].weightBands.splice(j, 1)
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

      <!-- Volume bands -->
      <div class="mb-12">
        <div class="d-flex align-items-center justify-content-between">
          <span class="fw-semibold">Volume Bands</span>
          <button type="button" class="btn btn-primary btn-sm" @click="addVolume(i)">Add Volume Band</button>
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
      <div class="mt-12">
        <div class="d-flex align-items-center justify-content-between">
          <span class="fw-semibold">Weight Bands</span>
          <button type="button" class="btn btn-primary btn-sm" @click="addWeight(i)">Add Weight Band</button>
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
    </div>
  </div>
</template>