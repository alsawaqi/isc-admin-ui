<script setup lang="ts">
import { reactive, toRaw } from 'vue'

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





const props = withDefaults(defineProps<{ modelValue?: BasicForm }>(), {
  modelValue: () => ({
    Shippers_Code: '',
    Shippers_Name: '',
    Shippers_Address: '',
    Shippers_Office_No: '',
    Shippers_GSM_No: '',
    Shippers_Email_Address: '',
    Shippers_Official_Website_Address: '',
    Shippers_GPS_Location: '',
    Shippers_Scope: 'local',
    Shippers_Type: '',
    Shippers_Rate_Mode: 'weight',
    Shippers_Is_Active: true
  })
})

const emit = defineEmits<{ 'update:modelValue':[BasicForm] }>()

// ---- safe plain copy helpers (SSR-friendly)
const toPlain = <T>(v: T): T =>
  JSON.parse(JSON.stringify(toRaw(v))) as T

// local state (no watchers)
const f = defineModel<BasicForm>({ default: {
  Shippers_Code: '',
  Shippers_Name: '',
  Shippers_Address: '',
  Shippers_Office_No: '',
  Shippers_GSM_No: '',
  Shippers_Email_Address: '',
  Shippers_Official_Website_Address: '',
  Shippers_GPS_Location: '',
  Shippers_Scope: 'local',
  Shippers_Type: '',
  Shippers_Rate_Mode: 'weight',
  Shippers_Is_Active: true
}})

// parent calls this on Next/Finish
 
 

 
</script>

<template>
  <div class="row">
    <!-- inputs unchanged -->
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
