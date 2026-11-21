<script setup lang="ts">
import { computed, onMounted, reactive, shallowRef } from 'vue'
import { definePageMeta, useHead } from '#imports'
import ProductImportMappings from '~/components/admin/product/ProductImportMappings.vue'
import ProductImportPreview from '~/components/admin/product/ProductImportPreview.vue'
import { useProductImport } from '~/composables/useProductImport'
import type { ImportOptions } from '~/types/productImport'

definePageMeta({ layout: 'admin', middleware: ['permission'], permission: 'product master' })
useHead({ title: 'Import products from Excel · ISC Admin' })
const file = shallowRef<File | null>(null)
const fileError = shallowRef('')
const previewOptions = shallowRef('')
const options = reactive<ImportOptions>({ match_inhouse: true, product_type_id: null, price_column: 'max', blank_stock: 'reject', category_map: {}, brand_map: {} })
const { preview, receipt, busy, error, lookups, invalidate, load, inspect, commit } = useProductImport()
const stale = computed(() => Boolean(preview.value) && JSON.stringify(options) !== previewOptions.value)
const canImport = computed(() => preview.value?.can_commit && !stale.value && !busy.value && !receipt.value)
function chooseFile(event: Event) {
  invalidate(); fileError.value = ''; options.category_map = {}; options.brand_map = {}
  const selected = (event.target as HTMLInputElement).files?.[0] ?? null
  if (selected && selected.size > 5 * 1024 * 1024) { fileError.value = 'Choose an Excel workbook smaller than 5 MB.'; file.value = null; return }
  file.value = selected
}
async function previewFile() {
  if (!file.value || busy.value) return
  const snapshot = JSON.stringify(options)
  await inspect(file.value, JSON.parse(snapshot))
  if (preview.value) previewOptions.value = snapshot
}
function mapCategory(key: string, value: string) { if (value) options.category_map[key] = value; else delete options.category_map[key] }
function mapBrand(key: string, value: string) { if (value) options.brand_map[key] = value; else delete options.brand_map[key] }
onMounted(load)
</script>

<template>
  <div class="dashboard-main-body product-import-page">
    <header class="page-header"><div><p class="eyebrow">PRODUCT CATALOGUE</p><h1>Import products from Excel</h1><p>Upload your product workbook, resolve any issues, then save the reviewed products.</p></div><NuxtLink to="/admin/product/viewproducts" class="text-link">View products →</NuxtLink></header>
    <div class="notice">The in-house barcode identifies each product. Matches update selling prices, cost and stock. New products and restored products are saved inactive. Review each action before confirming.</div>
    <p v-if="error || fileError" role="alert" class="error-box">{{ fileError || error }}</p>
    <div v-if="receipt" class="success-box" role="status"><strong>Import #{{ receipt.job_id }} complete.</strong> {{ receipt.created }} added · {{ receipt.updated ?? 0 }} updated · {{ receipt.restored ?? 0 }} restored and updated.</div>
    <section class="upload-card" aria-labelledby="upload-title">
      <h2 id="upload-title">1. Choose your workbook</h2>
      <fieldset :disabled="Boolean(busy)">
        <label class="file-label" for="product-workbook">Excel workbook (.xlsx, up to 5 MB)</label>
        <input id="product-workbook" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" @change="chooseFile">
        <div class="settings-grid">
          <div class="settings-field"><label for="import-product-type">Product type</label><select id="import-product-type" v-model="options.product_type_id"><option :value="null">Choose a type</option><option v-for="type in lookups.types" :key="type.id" :value="Number(type.id)">{{ type.name }}</option></select></div>
          <div class="settings-field"><label for="import-price">Website selling price</label><select id="import-price" v-model="options.price_column"><option value="max">Max Sales Rate</option><option value="min">Min Sales Rate</option></select></div>
          <div class="settings-field"><label for="import-stock">Blank “Main Store” stock</label><select id="import-stock" v-model="options.blank_stock"><option value="reject">Flag as an error</option><option value="zero">Explicitly use zero stock</option></select></div>
        </div>
      </fieldset>
      <details class="column-guide"><summary>How your columns are used</summary><p>Sr No → SKU · Main Groups / Sub Group / Sub Sub Group → category path · Brand Name → brand · Product_Name → English name · Product_Description → description · Barcode → supplier barcode · Main Store → stock · Cost → cost · Min Sales Rate → minimum price. “Total” is not imported because it is a stock valuation, not a unit price.</p><p>Blank costs remain empty. All rows must pass validation. Formula cells in imported columns must be replaced with values.</p></details>
      <button type="button" class="primary" :disabled="!file || Boolean(busy)" @click="previewFile">{{ busy === 'preview' ? 'Checking workbook…' : preview ? 'Preview again' : 'Preview workbook' }}</button>
      <span v-if="file" class="file-caption">{{ file.name }}</span>
    </section>
    <template v-if="preview">
      <ProductImportMappings :preview="preview" :brand-options="lookups.brands" :can-create-brands="lookups.can_create_brands" :category-map="options.category_map" :brand-map="options.brand_map" :disabled="Boolean(busy)" @category="mapCategory" @brand="mapBrand" />
      <p v-if="stale" class="notice" role="status">Settings changed. Click “Preview again” to check the updated mapping before importing.</p>
      <ProductImportPreview :preview="preview" />
      <div class="import-action"><p>{{ preview.summary.errors ? 'Correct the errors in your workbook or mappings, then preview again.' : 'Review the products and any warnings before saving.' }}</p><button type="button" class="primary" :disabled="!canImport" @click="commit">{{ busy === 'commit' ? 'Importing…' : `Confirm import of ${preview.summary.total} products` }}</button></div>
    </template>
    <NuxtLink to="/admin/product/undo-import" class="text-link undo-link">Undo an import</NuxtLink>
  </div>
</template>

<style scoped>
.product-import-page { --h1: 28px; --h2: 19px; }
@media(max-width:600px) { .product-import-page { --h1: 23px; } }
.product-import-page { color: #17243c; max-width: 1600px; min-width: 0; }.page-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 18px; margin-bottom: 22px; }.eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .12em; color: #4563a6; margin-bottom: 6px; }.page-header h1 { font-size: 28px; margin: 0 0 8px; }.page-header p { color: #526079; }.text-link { color: #2455b0; font-size: 14px; }
.notice,.error-box,.success-box { padding: 15px 18px; border-radius: 9px; margin: 16px 0; font-size: 14px; line-height: 1.6; }.notice { background: #edf4ff; color: #254571; border: 1px solid #cfddf3; }.error-box { background: #fff0f0; color: #9d2029; }.success-box { background: #eaf8ef; color: #166346; }
.upload-card { background: white; border: 1px solid #dce3ed; border-radius: 12px; padding: 24px; }.upload-card h2 { font-size: 19px; margin-bottom: 18px; }.upload-card fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }.file-label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; }input[type=file] { max-width: 100%; padding: 14px; background: #f5f7fb; border: 1px dashed #9bafcd; border-radius: 8px; width: 100%; }
.settings-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%,230px),1fr)); gap: 18px; margin-top: 20px; }.settings-field { display: grid; gap: 8px; }.settings-grid label { font-size: 14px; font-weight: 600; }.settings-grid select { padding: 11px; border: 1px solid #b9c6d8; border-radius: 7px; background: white; min-width: 0; width: 100%; }
.column-guide { margin: 20px 0; font-size: 13px; color: #526079; line-height: 1.7; }.column-guide summary { cursor: pointer; font-weight: 600; color: #2455b0; }.column-guide p { margin-top: 10px; }.primary { background: #285bb6; color: white; border: 1px solid #285bb6; border-radius: 7px; padding: 11px 18px; font-weight: 600; font-size: 14px; }.primary:disabled { opacity: .45; cursor: not-allowed; }.file-caption { display: inline-block; margin: 10px; font-size: 13px; color: #526079; overflow-wrap: anywhere; }.import-action { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-top: 20px; font-size: 14px; }.undo-link { display: inline-block; margin-top: 20px; }
@media(max-width:600px) { .product-import-page { padding: 16px; }.upload-card { padding: 18px; }.page-header h1 { font-size: 23px; }.import-action .primary { width: 100%; } }
</style>
