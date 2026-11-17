<script setup lang="ts">
import type { ImportLookup, ImportPreview } from '~/types/productImport'
defineProps<{ preview: ImportPreview; brandOptions: ImportLookup[]; canCreateBrands: boolean; categoryMap: Record<string, string>; brandMap: Record<string, string>; disabled: boolean }>()
const emit = defineEmits<{ category: [key: string, value: string]; brand: [key: string, value: string] }>()
const value = (event: Event) => (event.target as HTMLSelectElement).value
</script>

<template>
  <section class="mapping-card" aria-labelledby="mapping-title">
    <h2 id="mapping-title">2. Match categories and brands</h2>
    <p>Confirm any names that differ from your catalogue, then preview again.</p>
    <div v-for="group in preview.categories" :key="group.key" class="mapping-row">
      <label :for="`category-${group.key}`">{{ group.source }}</label>
      <select :id="`category-${group.key}`" :disabled="disabled" :value="categoryMap[group.key] ?? group.selected_id ?? ''" @change="emit('category', group.key, value($event))">
        <option value="">Choose an existing category</option>
        <option v-for="option in group.options" :key="option.id" :value="String(option.id)">{{ option.name }}</option>
      </select>
      <small v-if="!group.options.length">No matching category found. Correct the workbook name or add the category in category management.</small>
    </div>
    <div class="brands-grid">
      <div v-for="brand in preview.brands" :key="brand.key" class="mapping-row">
        <label :for="`brand-${brand.key}`">Brand: {{ brand.source }}</label>
        <select :id="`brand-${brand.key}`" :disabled="disabled" :value="brandMap[brand.key] ?? brand.selected_id ?? ''" @change="emit('brand', brand.key, value($event))">
          <option value="">Choose a brand</option>
          <option v-for="option in brandOptions" :key="option.id" :value="String(option.id)">{{ option.name }}</option>
          <option v-if="canCreateBrands" value="new">Create brand: {{ brand.source }}</option>
        </select>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mapping-card { background: white; border: 1px solid #dce3ed; border-radius: 12px; padding: 24px; margin-top: 20px; }
.mapping-card h2 { font-size: 19px; margin-bottom: 8px; }.mapping-card p,.mapping-row small { color: #526079; font-size: 14px; }
.mapping-row { display: grid; gap: 7px; margin-top: 16px; min-width: 0; }.mapping-row label { font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
.mapping-row select { padding: 10px; border: 1px solid #b9c6d8; border-radius: 7px; width: 100%; min-width: 0; background: white; color: #17243c; }
.brands-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%,260px),1fr)); gap: 0 20px; }
</style>
