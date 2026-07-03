<script setup lang="ts">
import { computed } from 'vue'
import { normalizeTiers, tierRangeLabel } from '~/utils/bulkPricing'

const props = defineProps<{
  /** Raw tier rows in API ({ Min_Qty, ... }) or display ({ min_qty, ... }) casing. */
  tiers: any[]
  emptyText?: string
}>()

const rows = computed(() => normalizeTiers(props.tiers))
</script>

<template>
  <div class="table-responsive rounded-3 border">
    <table class="table table-sm align-middle mb-0">
      <thead class="table-light">
        <tr>
          <th class="py-2 px-3">Quantity Range</th>
          <th class="py-2 px-3 text-end">Unit Price (OMR)</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(tier, i) in rows" :key="i">
          <td class="py-2 px-3 fw-semibold">{{ tierRangeLabel(tier) }}</td>
          <td class="py-2 px-3 text-end">{{ Number(tier.unit_price ?? 0).toFixed(3) }}</td>
        </tr>
        <tr v-if="!rows.length">
          <td colspan="2" class="py-2 px-3 text-muted small text-center">
            {{ emptyText || 'No bulk price tiers.' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
