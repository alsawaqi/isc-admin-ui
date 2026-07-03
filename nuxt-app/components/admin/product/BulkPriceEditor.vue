<script setup lang="ts">
import { computed, watch } from 'vue'
import { validateTierRows, type BulkTierRow } from '~/utils/bulkPricing'

const props = defineProps<{
  modelValue: BulkTierRow[]
  /** Product price floor (Minimum_Selling_Price). null/undefined = no floor. */
  floor?: number | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: BulkTierRow[]): void
  (e: 'update:valid', value: boolean): void
}>()

const errors = computed<string[]>(() => validateTierRows(props.modelValue, props.floor))
const isValid = computed(() => errors.value.length === 0)

watch(isValid, v => emit('update:valid', v), { immediate: true })

const addTier = () => {
  emit('update:modelValue', [
    ...props.modelValue,
    { min_qty: null, max_qty: null, unit_price: null },
  ])
}

const removeTier = (index: number) => {
  const next = [...props.modelValue]
  next.splice(index, 1)
  emit('update:modelValue', next)
}
</script>

<template>
  <div>
    <div v-if="!modelValue.length" class="text-muted small mb-12">
      No bulk price tiers defined. All quantities will pay the normal price.
    </div>

    <div
      v-for="(tier, index) in modelValue"
      :key="index"
      class="row g-2 align-items-end mb-2"
    >
      <div class="col-12 col-md-3">
        <label class="form-label small fw-semibold mb-1">Min qty</label>
        <input
          v-model.number="tier.min_qty"
          type="number"
          min="1"
          step="1"
          class="form-control"
          placeholder="e.g. 5"
          :disabled="disabled"
        />
      </div>

      <div class="col-12 col-md-3">
        <label class="form-label small fw-semibold mb-1">
          Max qty <span class="text-muted fw-normal">(blank = and above)</span>
        </label>
        <input
          v-model.number="tier.max_qty"
          type="number"
          :min="Number(tier.min_qty) || 1"
          step="1"
          class="form-control"
          placeholder="and above"
          :disabled="disabled"
        />
      </div>

      <div class="col-12 col-md-3">
        <label class="form-label small fw-semibold mb-1">Unit price (OMR)</label>
        <input
          v-model.number="tier.unit_price"
          type="number"
          min="0"
          step="0.001"
          class="form-control"
          placeholder="e.g. 5.500"
          :disabled="disabled"
        />
      </div>

      <div class="col-12 col-md-3">
        <button
          type="button"
          class="btn btn-outline-danger"
          :disabled="disabled"
          @click="removeTier(index)"
        >
          Remove
        </button>
      </div>
    </div>

    <button
      type="button"
      class="btn btn-outline-primary btn-sm mt-1"
      :disabled="disabled"
      @click="addTier"
    >
      + Add tier
    </button>

    <div v-if="errors.length" class="alert alert-danger mt-3 mb-0 py-2">
      <div v-for="(err, i) in errors" :key="i" class="small">{{ err }}</div>
    </div>
  </div>
</template>
