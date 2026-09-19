<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useNuxtApp } from '#imports'
const props = defineProps<{ tempId: number }>()
const emit = defineEmits<{ selection: [value: { mode: 'existing' | 'new'; id: number | null; confirmed: boolean }] }>()
const { $axios } = useNuxtApp() as any
const mode = ref<'existing' | 'new'>('existing')
const selected = ref<number | null>(null)
const confirmed = ref(false)
const query = ref('')
const matches = ref<any[]>([])
const busy = ref(false)
const error = ref('')
async function search() {
  busy.value = true; error.value = ''
  try {
    const { data } = await $axios.get(`/api/admin/products-temp/${props.tempId}/matches`, { params: { q: query.value } })
    matches.value = data.data
  } catch (e: any) { error.value = e?.response?.data?.message || 'Could not load product matches.' }
  finally { busy.value = false }
}
watch([mode, selected], () => { confirmed.value = false })
watch([mode, selected, confirmed, busy, error], () => emit('selection', {
  mode: mode.value, id: selected.value, confirmed: confirmed.value && !busy.value && !error.value,
}), { immediate: true })
onMounted(search)
</script>

<template>
  <section class="border rounded p-3 mb-3" aria-label="Match master product">
    <h6>Choose the master product</h6>
    <p class="small">Compare the brand, model and specifications with the vendor’s submission. Linking adds this seller’s price and stock to the existing product.</p>
    <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
    <label class="d-block mb-2"><input v-model="mode" type="radio" value="existing" /> Link to an existing product</label>
    <div v-if="mode === 'existing'">
      <div class="d-flex gap-2 mb-2">
        <input v-model="query" aria-label="Search master products" placeholder="Search name, product code or SKU" class="form-control" @keydown.enter.prevent="search" />
        <button type="button" class="btn btn-outline-primary" :disabled="busy" @click="search">Search</button>
      </div>
      <p v-if="busy" role="status">Loading matches…</p>
      <p v-else-if="!matches.length">No matches found in this sub-subcategory.</p>
      <div class="overflow-auto" style="max-height: 320px">
        <label v-for="match in matches" :key="match.id" class="d-block border rounded p-2 mb-2">
          <input v-model="selected" type="radio" :value="match.id" :disabled="match.already_linked" />
          <strong class="ms-2">{{ match.name }}</strong> <span class="small">{{ match.code }} · {{ match.sku }}</span>
          <span v-if="match.already_linked" class="badge bg-secondary ms-2">Already linked to this vendor</span>
          <span v-else-if="match.same_name" class="badge bg-info ms-2">Same name — verify specifications</span>
          <div class="small text-muted mt-1">{{ match.description }}</div>
          <div v-for="(spec, index) in match.specifications" :key="index" class="small">{{ spec.name }}: {{ spec.value }}</div>
        </label>
      </div>
    </div>
    <label class="d-block my-2"><input v-model="mode" type="radio" value="new" /> No matching product — create a new master product and seller offer</label>
    <label class="d-block mt-3"><input v-model="confirmed" type="checkbox" :disabled="busy || !!error || (mode === 'existing' && !selected)" />
      {{ mode === 'existing' ? 'I verified this is the same product, brand and variant.' : 'I checked the catalogue and this is a different product or variant.' }}
    </label>
  </section>
</template>

<style scoped>
input[type='radio'], input[type='checkbox'] {
  appearance: auto;
  width: 1rem;
  height: 1rem;
  min-width: 1rem;
  vertical-align: middle;
  accent-color: #0d6efd;
}
</style>
