<script lang="ts" setup>
import { useNuxtApp, definePageMeta } from '#imports'
import { ref, reactive, watch, onMounted } from 'vue'
import { useFlashStore } from '~/stores/flashs'

const flash = useFlashStore()

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permission: 'vendors',
})

const { $axios } = useNuxtApp() as any

const step = ref<1 | 2 | 3>(1)
const submitting = ref(false)
const createdVendor = ref<{ id: number; Vendor_Code?: string; Vendor_Name?: string } | null>(null)

// ---------- Step 1: vendor ----------
const vendor = reactive({
  Vendor_Name: '', Trade_Name: '', CR_Number: '', VAT_Number: '',
  Email_1: '', Phone_No: '', Business_Type: '',
  Contact_Person_Name: '', Contact_Person_Email: '', Contact_Person_Phone: '',
  Address_Line1: '', Postal_Code: '', PO_Box: '',
  Bank_Name: '', Bank_Account_Name: '', Bank_Account_Number: '', Bank_IBAN: '', Bank_Swift_Code: '',
  Payout_Method: 'bank_transfer',
})

// geo cascade
const countries = ref<any[]>([]); const regions = ref<any[]>([]); const districts = ref<any[]>([]); const cities = ref<any[]>([])
const Country_Id = ref<number | ''>(''); const Region_Id = ref<number | ''>(''); const District_Id = ref<number | ''>(''); const City_Id = ref<number | ''>('')

const fetchCountries = async () => { const { data } = await $axios.get('/api/geo/countries/all'); countries.value = data }
watch(Country_Id, async () => {
  Region_Id.value = ''; District_Id.value = ''; City_Id.value = ''; regions.value = []; districts.value = []; cities.value = []
  if (Country_Id.value) { const { data } = await $axios.get(`/api/geo/regions/by-country/${Country_Id.value}`); regions.value = data }
})
watch(Region_Id, async () => {
  District_Id.value = ''; City_Id.value = ''; districts.value = []; cities.value = []
  if (Region_Id.value) { const { data } = await $axios.get(`/api/geo/districts/by-region/${Region_Id.value}`); districts.value = data }
})
watch(District_Id, async () => {
  City_Id.value = ''; cities.value = []
  if (District_Id.value) { const { data } = await $axios.get(`/api/geo/cities/by-district/${District_Id.value}`); cities.value = data }
})

const submitVendor = async () => {
  if (!vendor.Vendor_Name.trim()) { flash.error('Vendor name is required.'); return }
  submitting.value = true
  try {
    const payload: Record<string, any> = {
      ...vendor,
      Country_Id: Country_Id.value || null,
      Region_Id: Region_Id.value || null,
      District_Id: District_Id.value || null,
      City_Id: City_Id.value || null,
      // Admin-created vendors are active + approved immediately.
      Status: 'active',
      Approval_Status: 'approved',
      Is_Active: true,
    }
    const { data } = await $axios.post('/api/vendors', payload)
    const v = data.data ?? data
    createdVendor.value = { id: v.id ?? v.Id, Vendor_Code: v.Vendor_Code, Vendor_Name: v.Vendor_Name }
    user.email = vendor.Email_1 || ''
    user.User_Name = vendor.Contact_Person_Name || vendor.Vendor_Name
    flash.success('Vendor created. Now create the login.')
    step.value = 2
  } catch (error: any) {
    flash.error(error?.response?.data?.message || 'Failed to create vendor.')
  } finally {
    submitting.value = false
  }
}

// ---------- Step 2: login user ----------
const user = reactive({ User_Name: '', email: '', password: '', password_confirmation: '', Phone: '' })

const submitUser = async () => {
  if (!createdVendor.value) { flash.error('Create the vendor first.'); step.value = 1; return }
  if (user.password !== user.password_confirmation) { flash.error('Passwords do not match.'); return }
  submitting.value = true
  try {
    await $axios.post('/api/vendor-users', {
      Vendor_Id: createdVendor.value.id,
      User_Name: user.User_Name,
      email: user.email,
      password: user.password,
      Phone: user.Phone || null,
      Status: 'active',
    })
    flash.success('Vendor login created.')
    step.value = 3
  } catch (error: any) {
    flash.error(error?.response?.data?.message || 'Failed to create vendor login.')
  } finally {
    submitting.value = false
  }
}

onMounted(fetchCountries)
</script>

<template>
  <div class="dashboard-main-body">
    <div class="vendor-hero d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <div>
        <h5 class="fw-semibold mb-1">Create Vendor</h5>
        <p class="text-muted mb-0">Add a vendor and its login in two quick steps.</p>
      </div>
      <NuxtLink to="/admin/vendor/manage" class="btn btn-sm btn-outline-secondary">Manage Vendors</NuxtLink>
    </div>

    <!-- Stepper header -->
    <div class="d-flex align-items-center gap-2 mb-24">
      <div class="step-pill" :class="step >= 1 ? 'active' : ''">1. Vendor details</div>
      <span class="step-sep">—</span>
      <div class="step-pill" :class="step >= 2 ? 'active' : ''">2. Login</div>
      <span class="step-sep">—</span>
      <div class="step-pill" :class="step >= 3 ? 'active' : ''">Done</div>
    </div>

    <!-- STEP 1 -->
    <div v-if="step === 1" class="card p-24">
      <h6 class="fw-semibold mb-3">Step 1 — Vendor details</h6>
      <form @submit.prevent="submitVendor" class="row g-3">
        <div class="col-lg-6"><label class="form-label text-sm">Vendor Name <span class="text-danger">*</span></label><input v-model="vendor.Vendor_Name" class="form-control radius-8" required /></div>
        <div class="col-lg-6"><label class="form-label text-sm">Trade Name</label><input v-model="vendor.Trade_Name" class="form-control radius-8" /></div>
        <div class="col-lg-3"><label class="form-label text-sm">CR Number</label><input v-model="vendor.CR_Number" class="form-control radius-8" /></div>
        <div class="col-lg-3"><label class="form-label text-sm">VAT Number</label><input v-model="vendor.VAT_Number" class="form-control radius-8" /></div>
        <div class="col-lg-3"><label class="form-label text-sm">Email</label><input v-model="vendor.Email_1" type="email" class="form-control radius-8" /></div>
        <div class="col-lg-3"><label class="form-label text-sm">Phone</label><input v-model="vendor.Phone_No" class="form-control radius-8" /></div>
        <div class="col-lg-3"><label class="form-label text-sm">Business Type</label><input v-model="vendor.Business_Type" class="form-control radius-8" placeholder="Retailer, distributor..." /></div>
        <div class="col-lg-3"><label class="form-label text-sm">Contact Person</label><input v-model="vendor.Contact_Person_Name" class="form-control radius-8" /></div>
        <div class="col-lg-3"><label class="form-label text-sm">Contact Email</label><input v-model="vendor.Contact_Person_Email" type="email" class="form-control radius-8" /></div>
        <div class="col-lg-3"><label class="form-label text-sm">Contact Phone</label><input v-model="vendor.Contact_Person_Phone" class="form-control radius-8" /></div>

        <div class="col-lg-3"><label class="form-label text-sm">Country</label>
          <select v-model="Country_Id" class="form-select radius-8"><option value="">-- Country --</option><option v-for="c in countries" :key="c.id" :value="c.id">{{ c.Country_Name }}</option></select></div>
        <div class="col-lg-3"><label class="form-label text-sm">Region</label>
          <select v-model="Region_Id" class="form-select radius-8" :disabled="!Country_Id"><option value="">-- Region --</option><option v-for="r in regions" :key="r.id" :value="r.id">{{ r.Region_Name }}</option></select></div>
        <div class="col-lg-3"><label class="form-label text-sm">District</label>
          <select v-model="District_Id" class="form-select radius-8" :disabled="!Region_Id"><option value="">-- District --</option><option v-for="d in districts" :key="d.id" :value="d.id">{{ d.District_Name }}</option></select></div>
        <div class="col-lg-3"><label class="form-label text-sm">City</label>
          <select v-model="City_Id" class="form-select radius-8" :disabled="!District_Id"><option value="">-- City --</option><option v-for="c in cities" :key="c.id" :value="c.id">{{ c.City_Name }}</option></select></div>

        <div class="col-lg-6"><label class="form-label text-sm">Address</label><input v-model="vendor.Address_Line1" class="form-control radius-8" /></div>
        <div class="col-lg-3"><label class="form-label text-sm">Postal Code</label><input v-model="vendor.Postal_Code" class="form-control radius-8" /></div>
        <div class="col-lg-3"><label class="form-label text-sm">PO Box</label><input v-model="vendor.PO_Box" class="form-control radius-8" /></div>

        <div class="col-12"><hr class="my-1" /><span class="text-muted small">Bank & payout</span></div>
        <div class="col-lg-3"><label class="form-label text-sm">Bank Name</label><input v-model="vendor.Bank_Name" class="form-control radius-8" /></div>
        <div class="col-lg-3"><label class="form-label text-sm">Account Name</label><input v-model="vendor.Bank_Account_Name" class="form-control radius-8" /></div>
        <div class="col-lg-3"><label class="form-label text-sm">Account Number</label><input v-model="vendor.Bank_Account_Number" class="form-control radius-8" /></div>
        <div class="col-lg-3"><label class="form-label text-sm">IBAN</label><input v-model="vendor.Bank_IBAN" class="form-control radius-8" /></div>
        <div class="col-lg-3"><label class="form-label text-sm">Payout Method</label>
          <select v-model="vendor.Payout_Method" class="form-select radius-8"><option value="bank_transfer">Bank transfer</option><option value="manual">Manual</option><option value="cheque">Cheque</option></select></div>

        <div class="col-12 d-flex justify-content-end">
          <button type="submit" class="btn btn-primary px-24" :disabled="submitting">
            <span v-if="submitting" class="spinner-border spinner-border-sm me-1"></span>
            Create vendor & continue
          </button>
        </div>
      </form>
    </div>

    <!-- STEP 2 -->
    <div v-else-if="step === 2" class="card p-24">
      <h6 class="fw-semibold mb-1">Step 2 — Vendor login</h6>
      <p class="text-muted small mb-3">For <strong>{{ createdVendor?.Vendor_Name }}</strong> ({{ createdVendor?.Vendor_Code }})</p>
      <form @submit.prevent="submitUser" class="row g-3">
        <div class="col-lg-6"><label class="form-label text-sm">User Name <span class="text-danger">*</span></label><input v-model="user.User_Name" class="form-control radius-8" required /></div>
        <div class="col-lg-6"><label class="form-label text-sm">Login Email <span class="text-danger">*</span></label><input v-model="user.email" type="email" class="form-control radius-8" required /></div>
        <div class="col-lg-4"><label class="form-label text-sm">Phone</label><input v-model="user.Phone" class="form-control radius-8" /></div>
        <div class="col-lg-4"><label class="form-label text-sm">Password <span class="text-danger">*</span></label><input v-model="user.password" type="password" minlength="8" class="form-control radius-8" required /></div>
        <div class="col-lg-4"><label class="form-label text-sm">Confirm Password <span class="text-danger">*</span></label><input v-model="user.password_confirmation" type="password" minlength="8" class="form-control radius-8" required /></div>
        <div class="col-12 d-flex justify-content-between">
          <button type="button" class="btn btn-outline-secondary" @click="step = 1">Back</button>
          <button type="submit" class="btn btn-primary px-24" :disabled="submitting">
            <span v-if="submitting" class="spinner-border spinner-border-sm me-1"></span>
            Create login
          </button>
        </div>
      </form>
    </div>

    <!-- STEP 3 -->
    <div v-else class="card p-40 text-center">
      <div class="mb-3"><iconify-icon icon="solar:check-circle-bold" class="text-success" style="font-size:3rem"></iconify-icon></div>
      <h5 class="fw-semibold">Vendor created</h5>
      <p class="text-muted">{{ createdVendor?.Vendor_Name }} ({{ createdVendor?.Vendor_Code }}) is active and can log in to add products.</p>
      <div class="d-flex justify-content-center gap-2 mt-3">
        <NuxtLink to="/admin/vendor/manage" class="btn btn-primary">Go to Manage Vendors</NuxtLink>
        <button type="button" class="btn btn-outline-secondary" @click="$router.go(0)">Create another</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vendor-hero { padding: 1.25rem; border: 1px solid #e5e7eb; border-radius: 12px; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); }
.step-pill { padding: .4rem .9rem; border-radius: 999px; border: 1px solid #e5e7eb; font-size: .8rem; color: #6b7280; background: #fff; }
.step-pill.active { background: #1d4ed8; color: #fff; border-color: #1d4ed8; }
.step-sep { color: #9ca3af; }
.card { border: 1px solid #e5e7eb; box-shadow: 0 12px 34px rgba(15, 23, 42, .055); }
</style>
