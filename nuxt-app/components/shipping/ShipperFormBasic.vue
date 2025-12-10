<script setup lang="ts">
import { ref, toRaw, computed } from 'vue'
import { useNuxtApp } from '#app'

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
  Shippers_Image_Path?: string | null
  Shippers_Size?: string | null
  Shippers_Extenstion?: string | null
  Shippers_Image_Type?: string | null
  Shippers_COD ?: boolean
}

const { $r2Url } = useNuxtApp() as any


// you’re not using props.modelValue anymore, but we can leave it
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
    Shippers_Is_Active: true,
    Shippers_Image_Path: '',
    Shippers_Size: '',
    Shippers_Extenstion: '',
    Shippers_Image_Type: '',
    Shippers_COD: false
  })
})

const emit = defineEmits<{
  'update:modelValue': [BasicForm]
  'image-selected': [File | null]
}>()

// v-model from parent
const f = defineModel<BasicForm>({
  default: {
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
    Shippers_Is_Active: true,
    Shippers_Image_Path: '',
    Shippers_Size: '',
    Shippers_Extenstion: '',
    Shippers_Image_Type: '',
    Shippers_COD: false
  }
})

// local state for *new* image
const createImage = ref<File | null>(null)
const createPreview = ref<string | null>(null)

/**
 * What we actually show in the <img>:
 * - If user picked a new image => use blob preview
 * - Else, if shipper has existing image => use its URL
 */
const displayImage = computed<string | null>(() => {
  if (createPreview.value) return createPreview.value

  const model = f.value
  if (model.Shippers_Image_Path) {
    const p = model.Shippers_Image_Path

  
    return `${$r2Url}/${p}`
  }

  return null
})

const handleImageChange = (event: Event, _type: 'create' | 'update') => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  // cleanup old preview URL if any
  if (createPreview.value && createPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(createPreview.value)
  }

  createImage.value = file
  createPreview.value = URL.createObjectURL(file)

  // tell parent we have a new image file
  emit('image-selected', file)
}

/**
 * Remove / clear image
 *
 * - If user had selected a new image: just discard the new one
 *   and fall back to existing DB image.
 * - If no new image, but DB image exists: clear it from the model
 *   (so backend can remove it) and show empty upload state.
 */
const removeImage = () => {
  // Case 1: user picked a new file → revert to old
  if (createPreview.value) {
    URL.revokeObjectURL(createPreview.value)
    createPreview.value = null
    createImage.value = null

    // parent: "no pending new file"
    emit('image-selected', null)
    return
  }

  // Case 2: no new file, so clear existing image info
  const model = f.value
  model.Shippers_Image_Path = null
  model.Shippers_Size = null
  model.Shippers_Extenstion = null
  model.Shippers_Image_Type = null

  emit('image-selected', null)
}

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

      <div class="col-sm-3 mb-20 d-flex align-items-center">
      <div class="form-check">
        <input type="checkbox" v-model="f.Shippers_COD" id="cashOnDelivery" class="form-check-input"/>
        <label class="form-check-label" for="cashOnDelivery">Cash On Delivery</label>
      </div>
    </div>


    <div class="mb-20">
  <div class="card h-100 p-0">
    <div class="card-header border-bottom bg-base py-16 px-24">
      <h6 class="text-lg fw-semibold mb-0">Upload With image preview</h6>
    </div>
    <div class="card-body p-24">
      <div class="upload-image-wrapper d-flex align-items-center gap-3 flex-wrap">

        <!-- If we have either new preview or existing image -->
        <div
          v-if="displayImage"
          class="position-relative d-flex flex-column align-items-start"
          style="width: 120px;"
        >
          <div style="width: 100px; height: 100px;">
            <img
              :src="displayImage"
              class="img-fluid radius-8 w-100 h-100 object-fit-cover"
            />
          </div>

          <!-- Remove button -->
          <button
            type="button"
            class="btn btn-sm btn-danger mt-2"
            @click="removeImage"
          >
            Remove
          </button>

          <!-- Change button -->
          <label
            class="btn btn-sm btn-outline-primary mt-2 d-inline-flex align-items-center gap-1"
          >
            <iconify-icon icon="solar:camera-outline" class="text-sm text-secondary-light" />
            <span>Change</span>
            <input
              type="file"
              hidden
              accept="image/*"
              @change="(e: Event) => handleImageChange(e, 'create')"
            />
          </label>
        </div>

        <!-- No image at all → show upload box -->
        <label
          v-else
          class="upload-file-multiple h-120-px w-120-px border input-form-light radius-8 overflow-hidden border-dashed
                 bg-neutral-50 bg-hover-neutral-200 d-flex align-items-center flex-column justify-content-center gap-1"
        >
          <iconify-icon icon="solar:camera-outline" class="text-xl text-secondary-light"></iconify-icon>
          <span class="fw-semibold text-secondary-light">Upload</span>
          <input
            type="file"
            hidden
            accept="image/*"
            @change="(e: Event) => handleImageChange(e, 'create')"
          />
        </label>

      </div>
    </div>
  </div>
</div>


     
  </div>
</template>
