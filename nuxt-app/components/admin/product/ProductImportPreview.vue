<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import type { ImportPreview } from '~/types/productImport'
const props = defineProps<{ preview: ImportPreview }>()
const filter = shallowRef('all')
const page = shallowRef(1)
const rows = computed(() => props.preview.rows.filter(row => filter.value === 'errors' ? !row.valid : filter.value === 'warnings' ? row.issues.some(i => i.severity === 'warning') : true))
const pages = computed(() => Math.max(1, Math.ceil(rows.value.length / 20)))
const visible = computed(() => rows.value.slice((page.value - 1) * 20, page.value * 20))
watch([filter, () => props.preview], () => { page.value = 1 })
function downloadIssues() {
  const cell = (value: unknown) => { const s = String(value ?? ''); return '"' + (/^[=+@\-\t\r\n]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"' }
  const lines = [['Excel row','Severity','Field','Message'], ...props.preview.issues.map(i => [i.row || 'Workbook',i.severity,i.field,i.message])]
  const url = URL.createObjectURL(new Blob(['\uFEFF' + lines.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = 'product-import-issues.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>

<template>
  <section class="preview-card" aria-labelledby="preview-title">
    <div class="preview-toolbar">
      <h2 id="preview-title">3. Review products</h2>
      <button type="button" class="secondary" :disabled="!preview.issues.length" @click="downloadIssues">Download issues</button>
    </div>
    <div class="stats" role="status">
      <span><strong>{{ preview.summary.total }}</strong> products</span>
      <span><strong>{{ preview.summary.errors }}</strong> errors</span>
      <span><strong>{{ preview.summary.warnings }}</strong> warnings</span>
      <span><strong>{{ preview.summary.new_brands }}</strong> new brands</span>
    </div>
    <p v-for="issue in preview.issues.filter(i => i.row === 0)" :key="issue.field" class="error" role="alert">{{ issue.message }}</p>
    <label class="filter">Show rows
      <select v-model="filter"><option value="all">All rows</option><option value="errors">Needs correction</option><option value="warnings">With warnings</option></select>
    </label>
    <div class="table-scroll" tabindex="0" aria-label="Product preview table; scroll horizontally to view all columns">
      <table>
        <thead><tr><th>Excel row</th><th>Product / SKU</th><th>Barcode</th><th>Brand</th><th>Stock</th><th>Price (OMR)</th><th>Minimum (OMR)</th><th>Cost (OMR)</th><th>Review</th></tr></thead>
        <tbody>
          <tr v-for="row in visible" :key="row.row">
            <td>{{ row.row }}</td><td class="product-cell"><strong>{{ row.name }}</strong><small>SKU: {{ row.sku }}</small><small>{{ row.description }}</small></td>
            <td>{{ row.barcode }}</td><td>{{ row.brand }}</td><td>{{ row.stock ?? 'Missing' }}</td><td>{{ row.price ?? 'Missing' }}</td><td>{{ row.minimum ?? 'Missing' }}</td><td>{{ row.cost ?? 'Not supplied' }}</td>
            <td class="review-cell"><span v-if="!row.issues.length" class="ready">Ready</span><p v-for="(issue,index) in row.issues" :key="index" :class="issue.severity">{{ issue.message }}</p></td>
          </tr>
          <tr v-if="!visible.length"><td colspan="9">No rows match this filter.</td></tr>
        </tbody>
      </table>
    </div>
    <div class="pagination"><span>{{ rows.length }} rows · Page {{ page }} of {{ pages }}</span><button type="button" class="secondary" :disabled="page === 1" @click="page--">Previous</button><button type="button" class="secondary" :disabled="page >= pages" @click="page++">Next</button></div>
  </section>
</template>

<style scoped>
.preview-card { background: white; border: 1px solid #dce3ed; border-radius: 12px; padding: 24px; margin-top: 20px; min-width: 0; }
.preview-card h2 { font-size: 19px; margin: 0; }.preview-toolbar,.pagination { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; justify-content: space-between; }
.stats { display: flex; flex-wrap: wrap; gap: 12px; margin: 20px 0; }.stats span { background: #f0f4fa; border-radius: 8px; padding: 10px 14px; font-size: 14px; }.stats strong { font-size: 20px; margin-right: 4px; }
.filter { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; font-size: 14px; }.filter select { border: 1px solid #b9c6d8; padding: 8px; border-radius: 6px; }
.table-scroll { overflow-x: auto; max-width: 100%; }table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }th,td { padding: 12px; border-bottom: 1px solid #e0e6ee; vertical-align: top; }th { background: #f4f6fa; white-space: nowrap; }
.product-cell { min-width: 240px; }.product-cell small { display: block; color: #526079; margin-top: 6px; }.review-cell { min-width: 230px; }.review-cell p { margin: 0 0 7px; }.error { color: #a32224; }.warning { color: #82540d; }.ready { color: #166346; }
.pagination { margin-top: 18px; justify-content: flex-end; font-size: 14px; }.pagination span { margin-right: auto; }.secondary { border: 1px solid #b9c6d8; border-radius: 7px; padding: 8px 13px; background: white; font-size: 14px; }.secondary:disabled { opacity: .45; cursor: not-allowed; }
</style>
