<script setup lang="ts">
import { ref, watch, onBeforeUnmount, toRaw } from 'vue'

export interface BasicForm {
  Shippers_Code: string
  Shippers_Name: string
  Shippers_Address?: string | null
  Shippers_Office_No?: string | null
  Shippers_GSM_No?: string | null
  Shippers_Email_Address?: string | null
  Shippers_Official_Website_Address?: string | null
  Shippers_GPS_Location?: string | null
  Shippers_Scope: 'local' | 'international'
  Shippers_Type: 'parcel'|'courier'|'postal'|'heavy'|''|string
  Shippers_Rate_Mode: 'weight'|'volume'|'both'
  Shippers_Is_Active: boolean
}

const props = defineProps<{ modelValue: BasicForm }>()
const emit  = defineEmits<{ 'update:modelValue':[BasicForm] }>()

// ---------- utils (SSR-safe) ----------
// Make a plain JSON-serializable copy (works fine for this flat form)
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(toRaw(v)))
const hash  = (v: unknown) => JSON.stringify(v) // stable enough for flat objects

// ---------- local state ----------
const f = ref<BasicForm>(plain(props.modelValue))

// debounce + guards + snapshot hashes
let timer: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE_MS = 200
const syncingFromParent = ref(false)
let lastEmittedHash     = hash(f.value)
let lastFromParentHash  = hash(f.value)

// parent -> local (ignore no-op updates)
watch(
  () => props.modelValue,
  (v) => {
    const incoming = plain(v)
    const h = hash(incoming)
    if (h === lastFromParentHash && h === hash(f.value)) return

    syncingFromParent.value = true
    f.value = incoming
    lastFromParentHash = h
    syncingFromParent.value = false
  },
  { deep: false }
)

// local -> parent (only emit on real change, debounced)
watch(
  f,
  (v) => {
    if (syncingFromParent.value) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      const payload = plain(v)
      const h = hash(payload)
      if (h === lastEmittedHash) return
      emit('update:modelValue', payload)
      lastEmittedHash = h
    }, DEBOUNCE_MS)
  },
  { deep: true, flush: 'post' }
)

onBeforeUnmount(() => { if (timer) clearTimeout(timer) })
</script>

<template>
  <div class="row">
    <div class="col-sm-4 mb-20">
      <label class="form-label fw-semibold text-primary-light text-sm mb-8">
        Name <span class="text-danger-600">*</span>
      </label>
      <input v-model="f.Shippers_Name" class="form-control radius-8" />
    </div>

    <div class="col-sm-4 mb-20">
      <label class="form-label fw-semibold text-primary-light text-sm mb-8">Email</label>
      <input v-model="f.Shippers_Email_Address" type="email" class="form-control radius-8" />
    </div>

    <div class="col-sm-4 mb-20">
      <label class="form-label fw-semibold text-primary-light text-sm mb-8">Scope</label>
      <select v-model="f.Shippers_Scope" class="form-control radius-8">
        <option value="local">Local</option>
        <option value="international">International</option>
      </select>
    </div>

    <div class="col-sm-4 mb-20">
      <label class="form-label fw-semibold text-primary-light text-sm mb-8">Type</label>
      <select v-model="f.Shippers_Type" class="form-control radius-8">
        <option value="">-- Select --</option>
        <option value="parcel">Parcel</option>
        <option value="courier">Courier</option>
        <option value="postal">Postal</option>
        <option value="heavy">Heavy</option>
      </select>
    </div>

    <div class="col-sm-4 mb-20">
      <label class="form-label fw-semibold text-primary-light text-sm mb-8">Rate Mode</label>
      <select v-model="f.Shippers_Rate_Mode" class="form-control radius-8">
        <option value="weight">Weight</option>
        <option value="volume">Volume</option>
        <option value="both">Both</option>
      </select>
    </div>

    <div class="col-sm-12 mb-20">
      <label class="form-label fw-semibold text-primary-light text-sm mb-8">Address</label>
      <input v-model="f.Shippers_Address" class="form-control radius-8" />
    </div>

    <div class="col-sm-3 mb-20">
      <label class="form-label fw-semibold text-primary-light text-sm mb-8">Office No</label>
      <input v-model="f.Shippers_Office_No" class="form-control radius-8" />
    </div>
    <div class="col-sm-3 mb-20">
      <label class="form-label fw-semibold text-primary-light text-sm mb-8">GSM No</label>
      <input v-model="f.Shippers_GSM_No" class="form-control radius-8" />
    </div>
    <div class="col-sm-3 mb-20">
      <label class="form-label fw-semibold text-primary-light text-sm mb-8">Website</label>
      <input v-model="f.Shippers_Official_Website_Address" class="form-control radius-8" />
    </div>
    <div class="col-sm-3 mb-20 d-flex align-items-center">
      <div class="form-check">
        <input type="checkbox" v-model="f.Shippers_Is_Active" id="active" class="form-check-input"/>
        <label class="form-check-label" for="active">Active</label>
      </div>
    </div>
  </div>
</template>
