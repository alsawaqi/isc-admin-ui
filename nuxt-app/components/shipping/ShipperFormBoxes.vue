 <script setup lang="ts">
import { ref } from 'vue'

export interface StandardBox {
  Box_Code?: string | null        // e.g. "S", "M", "L"
  Box_Label?: string | null       // e.g. "Small Box"
  Length_cm: number | null
  Width_cm:  number | null
  Height_cm: number | null
  Max_Weight_Kg?: number | null
  Notes?: string | null
}

/** Two-way bind with parent:
 * <ShipperFormBoxes v-model="boxes" />
 */
const boxes = defineModel<StandardBox[]>({ default: [] })

const addBox = () => {
  boxes.value.push({
    Box_Code: '',
    Box_Label: '',
    Length_cm: null,
    Width_cm:  null,
    Height_cm: null,
    Max_Weight_Kg: null,
    Notes: ''
  })
}
const removeBox = (i: number) => boxes.value.splice(i, 1)

const volumeCbm = (b: StandardBox) => {
  const L = Number(b.Length_cm ?? 0)
  const W = Number(b.Width_cm ?? 0)
  const H = Number(b.Height_cm ?? 0)
  if (!L || !W || !H) return null
  return (L * W * H) / 1_000_000 // cm³ → m³
}
</script>

<template>
  <div>
    <!-- Header actions -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <div>
        <h6 class="mb-0">Standard Boxes</h6>
        <small class="text-muted">Packing reference only — not used for pricing</small>
      </div>
      <button type="button" class="btn btn-primary btn-sm" @click="addBox">Add Box</button>
    </div>

    <div v-if="!boxes.length" class="text-muted">No standard boxes added.</div>

    <!-- Box cards -->
    <div v-for="(b,i) in boxes" :key="i" class="border rounded-3 p-3 mb-3">
      <div class="row">
        <div class="col-sm-2 mb-3">
          <label class="form-label small">Code</label>
          <input v-model="boxes[i].Box_Code" class="form-control" placeholder="e.g., S">
        </div>

        <div class="col-sm-4 mb-3">
          <label class="form-label small">Label</label>
          <input v-model="boxes[i].Box_Label" class="form-control" placeholder="Small Box">
        </div>

        <div class="col-sm-2 mb-3">
          <label class="form-label small">Length (cm)</label>
          <input type="number" step="0.1" min="0" v-model.number="boxes[i].Length_cm" class="form-control">
        </div>
        <div class="col-sm-2 mb-3">
          <label class="form-label small">Width (cm)</label>
          <input type="number" step="0.1" min="0" v-model.number="boxes[i].Width_cm" class="form-control">
        </div>
        <div class="col-sm-2 mb-3">
          <label class="form-label small">Height (cm)</label>
          <input type="number" step="0.1" min="0" v-model.number="boxes[i].Height_cm" class="form-control">
        </div>

        <div class="col-sm-3 mb-3">
          <label class="form-label small">Max Weight (kg)</label>
          <input type="number" step="0.01" min="0" v-model.number="boxes[i].Max_Weight_Kg" class="form-control">
        </div>

        <div class="col-sm-9 mb-3">
          <label class="form-label small">Notes</label>
          <input v-model="boxes[i].Notes" class="form-control" placeholder="e.g., Supplied by carrier; inner dims">
        </div>

        <div class="col-12 mb-2">
          <div class="p-2 bg-light rounded-2">
            <div class="small">
              Volume:
              <strong>{{ volumeCbm(b)?.toFixed(4) ?? '—' }} m³</strong>
              <span class="text-muted ms-2">|</span>
              <span class="text-muted ms-2">Max Weight: <strong>{{ b.Max_Weight_Kg ?? '—' }} kg</strong></span>
            </div>
            <div class="text-muted small">
              Used by the packing tool to pick the smallest box that fits items (by dimensions & weight).
            </div>
          </div>
        </div>

        <div class="col-12 d-flex justify-content-end">
          <button type="button" class="btn btn-outline-danger btn-sm" @click="removeBox(i)">Remove</button>
        </div>
      </div>
    </div>
  </div>
</template>
