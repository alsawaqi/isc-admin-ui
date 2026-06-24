<script lang="ts" setup>
    import { useNuxtApp, definePageMeta } from '#imports'
    import { computed, ref, onMounted, reactive, watch } from 'vue'
    import { useFlashStore } from '~/stores/flashs'

    const flash = useFlashStore()

    definePageMeta({
      layout: 'admin',
      middleware: ['permission'],
      permission: 'vendors',
    })

    const { $axios } = useNuxtApp() as any

    // ---------- GEO TYPES ----------
    interface Country { id: number; Country_Name: string }
    interface Region { id: number; Country_Id: number; Region_Name: string }
    interface District { id: number; Region_Id: number; District_Name: string; District_Code: string }
    interface City { id: number; District_Id: number; City_Name: string; City_Code: string }

    // ---------- VENDOR TYPE ----------
    type VendorStatus = 'active' | 'pending' | 'suspended' | 'blocked'
    interface Vendor {
      id: number
      Vendor_Code: string
      Vendor_Name: string
      Trade_Name?: string | null
      Email_1?: string | null
      Phone_No?: string | null
      Business_Type?: string | null
      Contact_Person_Name?: string | null
      Contact_Person_Title?: string | null
      Contact_Person_Email?: string | null
      Contact_Person_Phone?: string | null
      CR_Number?: string | null
      VAT_Number?: string | null
      Address_Line1?: string | null
      Address_Line2?: string | null
      Postal_Code?: string | null
      PO_Box?: string | null
      Country_Id?: number | null
      Region_Id?: number | null
      District_Id?: number | null
      City_Id?: number | null
      Bank_Name?: string | null
      Bank_Account_Name?: string | null
      Bank_Account_Number?: string | null
      Bank_IBAN?: string | null
      Bank_Swift_Code?: string | null
      Payout_Method?: string | null
      Payout_Status?: string | null
      Approval_Status?: 'pending' | 'under_review' | 'approved' | 'rejected' | null
      Approval_Note?: string | null
      Onboarding_Completeness?: number | null
      onboarding_checklist?: {
        completeness_percent: number
        readiness: string
        missing_required: string[]
        items: Array<{ key: string; label: string; complete: boolean; missing_fields?: string[] }>
      }
      Status: VendorStatus
      Is_Active: boolean
    }

    // ---------- GEO STATE ----------
    const countries = ref<Country[]>([])
    const regions = ref<Region[]>([])
    const districts = ref<District[]>([])
    const cities = ref<City[]>([])

    const Country_Id = ref<number | ''>('')
    const Region_Id = ref<number | ''>('')
    const District_Id = ref<number | ''>('')
    const City_Id = ref<number | ''>('')

    // ---------- FORM STATE ----------
    const vendorName = ref('')
    const tradeName = ref('')
    const crNumber = ref('')
    const vatNumber = ref('')
    const email1 = ref('')
    const phoneNo = ref('')
    const businessType = ref('')
    const contactPersonName = ref('')
    const contactPersonTitle = ref('')
    const contactPersonEmail = ref('')
    const contactPersonPhone = ref('')
    const address1 = ref('')
    const address2 = ref('')
    const postalCode = ref('')
    const poBox = ref('')
    const bankName = ref('')
    const bankAccountName = ref('')
    const bankAccountNumber = ref('')
    const bankIban = ref('')
    const bankSwiftCode = ref('')
    const payoutMethod = ref('bank_transfer')
    const payoutStatus = ref('not_configured')
    const approvalStatus = ref<'pending' | 'under_review' | 'approved' | 'rejected'>('pending')
    const status = ref<VendorStatus>('active')
    const isActive = ref(true)

    const isSubmit = ref(false)
    const isLoading = ref(false)
    const errorMessage = ref<string | null>(null)

    // ---------- TABLE STATE ----------
    const vendors = ref<Vendor[]>([])
    const table = reactive({
      page: 1,
      perPage: 10,
      search: '',
      sortBy: 'id',
      sortDir: 'desc',
    })
    const pagination = ref({
      total: 0,
      from: 0,
      to: 0,
      last_page: 1,
    })

    const vendorStats = computed(() => {
      const active = vendors.value.filter(v => v.Is_Active).length
      const blocked = vendors.value.filter(v => ['blocked', 'suspended'].includes(v.Status)).length
      const pending = vendors.value.filter(v => v.Status === 'pending').length

      return {
        total: pagination.value.total || vendors.value.length,
        active,
        pending,
        blocked,
      }
    })

    const completionPercent = (vendor: Vendor) => {
      return Number(vendor.onboarding_checklist?.completeness_percent ?? vendor.Onboarding_Completeness ?? 0)
    }

    const missingChecklist = (vendor: Vendor) => {
      return vendor.onboarding_checklist?.missing_required?.join(', ') || 'None'
    }

    const approvalBadgeClass = (value?: string | null) => {
      if (value === 'approved') return 'bg-success'
      if (value === 'rejected') return 'bg-danger'
      if (value === 'under_review') return 'bg-warning text-dark'
      return 'bg-secondary'
    }

    const payoutBadgeClass = (value?: string | null) => {
      if (value === 'approved') return 'bg-success'
      if (value === 'rejected') return 'bg-danger'
      if (value === 'pending_review') return 'bg-warning text-dark'
      return 'bg-secondary'
    }

    // ---------- EDIT MODAL STATE ----------
    const showEdit = ref(false)
    const savingEdit = ref(false)
    const editError = ref<string | null>(null)

    const editVendor = reactive<Vendor>({
      id: 0,
      Vendor_Code: '',
      Vendor_Name: '',
      Trade_Name: '',
      Email_1: '',
      Phone_No: '',
      Business_Type: '',
      Contact_Person_Name: '',
      Contact_Person_Title: '',
      Contact_Person_Email: '',
      Contact_Person_Phone: '',
      CR_Number: '',
      VAT_Number: '',
      Address_Line1: '',
      Address_Line2: '',
      Postal_Code: '',
      PO_Box: '',
      Country_Id: null,
      Region_Id: null,
      District_Id: null,
      City_Id: null,
      Bank_Name: '',
      Bank_Account_Name: '',
      Bank_Account_Number: '',
      Bank_IBAN: '',
      Bank_Swift_Code: '',
      Payout_Method: 'bank_transfer',
      Payout_Status: 'not_configured',
      Approval_Status: 'pending',
      Approval_Note: '',
      Onboarding_Completeness: 0,
      Status: 'active',
      Is_Active: true,
    })

    // edit geo state (separate so we can cascade)
    const editCountries = ref<Country[]>([])
    const editRegions = ref<Region[]>([])
    const editDistricts = ref<District[]>([])
    const editCities = ref<City[]>([])

    const editCountryId = ref<number | ''>('')
    const editRegionId = ref<number | ''>('')
    const editDistrictId = ref<number | ''>('')
    const editCityId = ref<number | ''>('')

    // ---------- GEO API ----------
    const fetchCountries = async () => {
      const { data } = await $axios.get('/api/geo/countries/all')
      countries.value = data
    }
    const fetchRegions = async () => {
      regions.value = []
      districts.value = []
      cities.value = []
      Region_Id.value = ''
      District_Id.value = ''
      City_Id.value = ''
      if (!Country_Id.value) return
      const { data } = await $axios.get(`/api/geo/regions/by-country/${Country_Id.value}`)
      regions.value = data
    }
    const fetchDistricts = async () => {
      districts.value = []
      cities.value = []
      District_Id.value = ''
      City_Id.value = ''
      if (!Region_Id.value) return
      const { data } = await $axios.get(`/api/geo/districts/by-region/${Region_Id.value}`)
      districts.value = data
    }
    const fetchCities = async () => {
      cities.value = []
      City_Id.value = ''
      if (!District_Id.value) return
      const { data } = await $axios.get(`/api/geo/cities/by-district/${District_Id.value}`)
      cities.value = data
    }

    // EDIT GEO API
    const fetchEditCountries = async () => {
      const { data } = await $axios.get('/api/geo/countries/all')
      editCountries.value = data
    }
    const fetchEditRegions = async () => {
      editRegions.value = []
      editDistricts.value = []
      editCities.value = []
      editRegionId.value = ''
      editDistrictId.value = ''
      editCityId.value = ''
      if (!editCountryId.value) return
      const { data } = await $axios.get(`/api/geo/regions/by-country/${editCountryId.value}`)
      editRegions.value = data
    }
    const fetchEditDistricts = async () => {
      editDistricts.value = []
      editCities.value = []
      editDistrictId.value = ''
      editCityId.value = ''
      if (!editRegionId.value) return
      const { data } = await $axios.get(`/api/geo/districts/by-region/${editRegionId.value}`)
      editDistricts.value = data
    }
    const fetchEditCities = async () => {
      editCities.value = []
      editCityId.value = ''
      if (!editDistrictId.value) return
      const { data } = await $axios.get(`/api/geo/cities/by-district/${editDistrictId.value}`)
      editCities.value = data
    }

    // ---------- WATCHERS (same style as your template) ----------
    watch(Country_Id, async () => {
      table.page = 1
      await fetchRegions()
    })
    watch(Region_Id, async () => {
      table.page = 1
      await fetchDistricts()
    })
    watch(District_Id, async () => {
      table.page = 1
      await fetchCities()
    })

    watch(editCountryId, async () => { await fetchEditRegions() })
    watch(editRegionId, async () => { await fetchEditDistricts() })
    watch(editDistrictId, async () => { await fetchEditCities() })

    // ---------- VENDOR API ----------
    const getVendors = async () => {
      isLoading.value = true
      try {
        const { data } = await $axios.get('/api/vendors', {
          params: {
            page: table.page,
            per_page: table.perPage,
            search: table.search,
            sort_by: table.sortBy,
            sort_dir: table.sortDir,
          },
        })
        vendors.value = data.data
        pagination.value = {
          total: data.total,
          from: data.from,
          to: data.to,
          last_page: data.last_page,
        }
      } catch (error: any) {
        const msg = error?.response?.data?.message || error?.message || 'Failed to fetch vendors.'
        flash.error(msg)
      } finally {
        isLoading.value = false
      }
    }

    watch(
      () => [table.page, table.perPage, table.search, table.sortBy, table.sortDir],
      async () => { await getVendors() }
    )

    const Submit = async () => {
      isSubmit.value = true
      errorMessage.value = null

      const payload = {
        Vendor_Name: vendorName.value,
        Trade_Name: tradeName.value || null,
        CR_Number: crNumber.value || null,
        VAT_Number: vatNumber.value || null,
        Email_1: email1.value || null,
        Phone_No: phoneNo.value || null,
        Business_Type: businessType.value || null,
        Contact_Person_Name: contactPersonName.value || null,
        Contact_Person_Title: contactPersonTitle.value || null,
        Contact_Person_Email: contactPersonEmail.value || null,
        Contact_Person_Phone: contactPersonPhone.value || null,
        Address_Line1: address1.value || null,
        Address_Line2: address2.value || null,
        Postal_Code: postalCode.value || null,
        PO_Box: poBox.value || null,
        Bank_Name: bankName.value || null,
        Bank_Account_Name: bankAccountName.value || null,
        Bank_Account_Number: bankAccountNumber.value || null,
        Bank_IBAN: bankIban.value || null,
        Bank_Swift_Code: bankSwiftCode.value || null,
        Payout_Method: payoutMethod.value || null,
        Payout_Status: payoutStatus.value || null,

        Country_Id: Country_Id.value || null,
        Region_Id: Region_Id.value || null,
        District_Id: District_Id.value || null,
        City_Id: City_Id.value || null,

        Status: status.value,
        Approval_Status: approvalStatus.value,
        Is_Active: isActive.value,
      }

      try {
        await $axios.post('/api/vendors', payload)

        // reset
        vendorName.value = ''
        tradeName.value = ''
        crNumber.value = ''
        vatNumber.value = ''
        email1.value = ''
        phoneNo.value = ''
        businessType.value = ''
        contactPersonName.value = ''
        contactPersonTitle.value = ''
        contactPersonEmail.value = ''
        contactPersonPhone.value = ''
        address1.value = ''
        address2.value = ''
        postalCode.value = ''
        poBox.value = ''
        bankName.value = ''
        bankAccountName.value = ''
        bankAccountNumber.value = ''
        bankIban.value = ''
        bankSwiftCode.value = ''
        payoutMethod.value = 'bank_transfer'
        payoutStatus.value = 'not_configured'
        approvalStatus.value = 'pending'
        status.value = 'active'
        isActive.value = true

        Country_Id.value = ''
        Region_Id.value = ''
        District_Id.value = ''
        City_Id.value = ''
        regions.value = []
        districts.value = []
        cities.value = []

        flash.success('Vendor created successfully.')
        await getVendors()
      } catch (error: any) {
        const msg = error?.response?.data?.message || error?.message || 'Failed to create vendor.'
        errorMessage.value = msg
        flash.error(msg)
      } finally {
        isSubmit.value = false
      }
    }

    // ---------- EDIT ----------
    const openEdit = async (v: Vendor) => {
      editError.value = null

      // load countries first
      await fetchEditCountries()

      // fill base
      editVendor.id = v.id
      editVendor.Vendor_Code = v.Vendor_Code
      editVendor.Vendor_Name = v.Vendor_Name
      editVendor.Trade_Name = v.Trade_Name || ''
      editVendor.CR_Number = v.CR_Number || ''
      editVendor.VAT_Number = v.VAT_Number || ''
      editVendor.Email_1 = v.Email_1 || ''
      editVendor.Phone_No = v.Phone_No || ''
      editVendor.Business_Type = v.Business_Type || ''
      editVendor.Contact_Person_Name = v.Contact_Person_Name || ''
      editVendor.Contact_Person_Title = v.Contact_Person_Title || ''
      editVendor.Contact_Person_Email = v.Contact_Person_Email || ''
      editVendor.Contact_Person_Phone = v.Contact_Person_Phone || ''
      editVendor.Address_Line1 = v.Address_Line1 || ''
      editVendor.Address_Line2 = v.Address_Line2 || ''
      editVendor.Postal_Code = v.Postal_Code || ''
      editVendor.PO_Box = v.PO_Box || ''
      editVendor.Bank_Name = v.Bank_Name || ''
      editVendor.Bank_Account_Name = v.Bank_Account_Name || ''
      editVendor.Bank_Account_Number = v.Bank_Account_Number || ''
      editVendor.Bank_IBAN = v.Bank_IBAN || ''
      editVendor.Bank_Swift_Code = v.Bank_Swift_Code || ''
      editVendor.Payout_Method = v.Payout_Method || 'bank_transfer'
      editVendor.Payout_Status = v.Payout_Status || 'not_configured'
      editVendor.Approval_Status = v.Approval_Status || 'pending'
      editVendor.Approval_Note = v.Approval_Note || ''
      editVendor.Onboarding_Completeness = completionPercent(v)
      editVendor.Status = v.Status
      editVendor.Is_Active = !!v.Is_Active

      // geo init
      editCountryId.value = (v.Country_Id as any) || ''
      editRegionId.value = ''
      editDistrictId.value = ''
      editCityId.value = ''

      // cascade load in order (so dropdowns populate properly)
      if (editCountryId.value) {
        const { data: r } = await $axios.get(`/api/geo/regions/by-country/${editCountryId.value}`)
        editRegions.value = r
        editRegionId.value = (v.Region_Id as any) || ''
      }
      if (editRegionId.value) {
        const { data: d } = await $axios.get(`/api/geo/districts/by-region/${editRegionId.value}`)
        editDistricts.value = d
        editDistrictId.value = (v.District_Id as any) || ''
      }
      if (editDistrictId.value) {
        const { data: c } = await $axios.get(`/api/geo/cities/by-district/${editDistrictId.value}`)
        editCities.value = c
        editCityId.value = (v.City_Id as any) || ''
      }

      showEdit.value = true
    }

    const closeEdit = () => {
      showEdit.value = false
      editError.value = null

      editVendor.id = 0
      editVendor.Vendor_Code = ''
      editVendor.Vendor_Name = ''
      editVendor.Trade_Name = ''
      editVendor.CR_Number = ''
      editVendor.VAT_Number = ''
      editVendor.Email_1 = ''
      editVendor.Phone_No = ''
      editVendor.Business_Type = ''
      editVendor.Contact_Person_Name = ''
      editVendor.Contact_Person_Title = ''
      editVendor.Contact_Person_Email = ''
      editVendor.Contact_Person_Phone = ''
      editVendor.Address_Line1 = ''
      editVendor.Address_Line2 = ''
      editVendor.Postal_Code = ''
      editVendor.PO_Box = ''
      editVendor.Bank_Name = ''
      editVendor.Bank_Account_Name = ''
      editVendor.Bank_Account_Number = ''
      editVendor.Bank_IBAN = ''
      editVendor.Bank_Swift_Code = ''
      editVendor.Payout_Method = 'bank_transfer'
      editVendor.Payout_Status = 'not_configured'
      editVendor.Approval_Status = 'pending'
      editVendor.Approval_Note = ''
      editVendor.Onboarding_Completeness = 0
      editVendor.Status = 'active'
      editVendor.Is_Active = true

      editCountryId.value = ''
      editRegionId.value = ''
      editDistrictId.value = ''
      editCityId.value = ''
      editRegions.value = []
      editDistricts.value = []
      editCities.value = []
    }

    const saveEdit = async () => {
      if (!editVendor.id) return
      savingEdit.value = true
      editError.value = null

      const payload = {
        Vendor_Name: editVendor.Vendor_Name,
        Trade_Name: editVendor.Trade_Name || null,
        CR_Number: editVendor.CR_Number || null,
        VAT_Number: editVendor.VAT_Number || null,
        Email_1: editVendor.Email_1 || null,
        Phone_No: editVendor.Phone_No || null,
        Business_Type: editVendor.Business_Type || null,
        Contact_Person_Name: editVendor.Contact_Person_Name || null,
        Contact_Person_Title: editVendor.Contact_Person_Title || null,
        Contact_Person_Email: editVendor.Contact_Person_Email || null,
        Contact_Person_Phone: editVendor.Contact_Person_Phone || null,
        Address_Line1: editVendor.Address_Line1 || null,
        Address_Line2: editVendor.Address_Line2 || null,
        Postal_Code: editVendor.Postal_Code || null,
        PO_Box: editVendor.PO_Box || null,
        Bank_Name: editVendor.Bank_Name || null,
        Bank_Account_Name: editVendor.Bank_Account_Name || null,
        Bank_Account_Number: editVendor.Bank_Account_Number || null,
        Bank_IBAN: editVendor.Bank_IBAN || null,
        Bank_Swift_Code: editVendor.Bank_Swift_Code || null,
        Payout_Method: editVendor.Payout_Method || null,
        Payout_Status: editVendor.Payout_Status || null,

        Country_Id: editCountryId.value || null,
        Region_Id: editRegionId.value || null,
        District_Id: editDistrictId.value || null,
        City_Id: editCityId.value || null,

        Status: editVendor.Status,
        Approval_Status: editVendor.Approval_Status,
        Approval_Note: editVendor.Approval_Note || null,
        Is_Active: editVendor.Is_Active,
      }

      try {
        await $axios.put(`/api/vendors/${editVendor.id}`, payload)
        flash.success('Vendor updated successfully.')
        await getVendors()
        closeEdit()
      } catch (error: any) {
        const msg = error?.response?.data?.message || error?.message || 'Failed to update vendor.'
        editError.value = msg
        flash.error(msg)
      } finally {
        savingEdit.value = false
      }
    }

    const setApproval = async (v: Vendor, nextStatus: 'under_review' | 'approved' | 'rejected') => {
      try {
        await $axios.patch(`/api/vendors/${v.id}/approval`, {
          approval_status: nextStatus,
          note: nextStatus === 'approved' ? 'Approved from vendor directory.' : null,
        })
        flash.success(`Vendor marked ${nextStatus.replace('_', ' ')}.`)
        await getVendors()
      } catch (error: any) {
        const msg = error?.response?.data?.message || error?.message || 'Failed to update vendor approval.'
        flash.error(msg)
      }
    }

    // ---------- DELETE ----------
    const deleteVendor = async (v: Vendor) => {
      const ok = await flash.confirm({
        title: 'Delete vendor?',
        message: `Are you sure you want to delete "${v.Vendor_Name}"? This cannot be undone.`,
        confirmText: 'Yes, delete',
        cancelText: 'No, cancel',
      })
      if (!ok) return

      try {
        await $axios.delete(`/api/vendors/${v.id}`)
        flash.success('Vendor deleted successfully.')
        await getVendors()
      } catch (error: any) {
        const msg = error?.response?.data?.message || error?.message || 'Failed to delete vendor.'
        flash.error(msg)
      }
    }

    onMounted(async () => {
      await fetchCountries()
      await getVendors()
    })
    </script>

    <template>
      <!-- CREATE -->
      <div class="dashboard-main-body vendor-admin-page">
        <div class="vendor-hero d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
          <div>
            <h5 class="fw-semibold mb-1">Vendor Management</h5>
            <p class="text-muted mb-0">Create vendors, maintain contact details, and control portal access.</p>
          </div>
          <ul class="d-flex align-items-center gap-2">
            <li class="fw-medium">
              <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
                <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg" />
                Dashboard
              </NuxtLink>
            </li>
            <li>-</li>
            <li class="fw-medium">Vendors</li>
          </ul>
        </div>

        <div class="row g-3 mb-24">
          <div class="col-md-3">
            <div class="vendor-stat-card">
              <span class="vendor-stat-icon bg-primary-50 text-primary-600">
                <iconify-icon icon="solar:shop-linear" />
              </span>
              <div>
                <div class="text-muted small">Total Vendors</div>
                <div class="fw-semibold fs-5">{{ vendorStats.total }}</div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="vendor-stat-card">
              <span class="vendor-stat-icon bg-success-50 text-success-600">
                <iconify-icon icon="solar:check-circle-linear" />
              </span>
              <div>
                <div class="text-muted small">Active on Page</div>
                <div class="fw-semibold fs-5">{{ vendorStats.active }}</div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="vendor-stat-card">
              <span class="vendor-stat-icon bg-warning-50 text-warning-600">
                <iconify-icon icon="solar:clock-circle-linear" />
              </span>
              <div>
                <div class="text-muted small">Pending on Page</div>
                <div class="fw-semibold fs-5">{{ vendorStats.pending }}</div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="vendor-stat-card">
              <span class="vendor-stat-icon bg-danger-50 text-danger-600">
                <iconify-icon icon="solar:shield-warning-linear" />
              </span>
              <div>
                <div class="text-muted small">Blocked/Suspended</div>
                <div class="fw-semibold fs-5">{{ vendorStats.blocked }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card h-100 p-0 radius-12 overflow-hidden mb-24 vendor-form-card">
          <div class="card-header bg-white d-flex align-items-center justify-content-between gap-3">
            <div>
              <div class="fw-semibold">Create Vendor</div>
              <div class="text-muted small">Company profile, compliance IDs, address, and access status.</div>
            </div>
            <span class="badge bg-primary-50 text-secondary-light">Admin managed</span>
          </div>
          <div class="card-body p-40">
            <form @submit.prevent="Submit" class="row g-4">

              <div class="col-lg-6">
                <label class="form-label fw-semibold text-sm mb-1">Vendor Name <span class="text-danger">*</span></label>
                <input v-model="vendorName" type="text" class="form-control radius-8" placeholder="Enter vendor name" required />
              </div>

              <div class="col-lg-6">
                <label class="form-label fw-semibold text-sm mb-1">Trade Name</label>
                <input v-model="tradeName" type="text" class="form-control radius-8" placeholder="Enter trade name" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm mb-1">CR Number</label>
                <input v-model="crNumber" type="text" class="form-control radius-8" placeholder="CR number" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm mb-1">VAT Number</label>
                <input v-model="vatNumber" type="text" class="form-control radius-8" placeholder="VAT number" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm mb-1">Email</label>
                <input v-model="email1" type="email" class="form-control radius-8" placeholder="Email" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm mb-1">Phone</label>
                <input v-model="phoneNo" type="text" class="form-control radius-8" placeholder="Phone" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm mb-1">Business Type</label>
                <input v-model="businessType" type="text" class="form-control radius-8" placeholder="Distributor, retailer..." />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm mb-1">Contact Person</label>
                <input v-model="contactPersonName" type="text" class="form-control radius-8" placeholder="Primary contact" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm mb-1">Contact Email</label>
                <input v-model="contactPersonEmail" type="email" class="form-control radius-8" placeholder="Contact email" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm mb-1">Contact Phone</label>
                <input v-model="contactPersonPhone" type="text" class="form-control radius-8" placeholder="Contact phone" />
              </div>

              <!-- GEO (same as your location template) -->
              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm mb-1">Country</label>
                <select v-model="Country_Id" class="form-control radius-8 w-full">
                  <option value="">-- Select Country --</option>
                  <option v-for="c in countries" :key="c.id" :value="c.id">{{ c.Country_Name }}</option>
                </select>
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm mb-1">Region</label>
                <select v-model="Region_Id" class="form-control radius-8 w-full" :disabled="!Country_Id">
                  <option value="">-- Select Region --</option>
                  <option v-for="r in regions" :key="r.id" :value="r.id">{{ r.Region_Name }}</option>
                </select>
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm mb-1">District</label>
                <select v-model="District_Id" class="form-control radius-8 w-full" :disabled="!Region_Id">
                  <option value="">-- Select District --</option>
                  <option v-for="d in districts" :key="d.id" :value="d.id">{{ d.District_Name }}</option>
                </select>
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm mb-1">City</label>
                <select v-model="City_Id" class="form-control radius-8 w-full" :disabled="!District_Id">
                  <option value="">-- Select City --</option>
                  <option v-for="c in cities" :key="c.id" :value="c.id">{{ c.City_Name }}</option>
                </select>
              </div>

              <div class="col-lg-6">
                <label class="form-label fw-semibold text-sm mb-1">Address Line 1</label>
                <input v-model="address1" type="text" class="form-control radius-8" placeholder="Address line 1" />
              </div>

              <div class="col-lg-6">
                <label class="form-label fw-semibold text-sm mb-1">Address Line 2</label>
                <input v-model="address2" type="text" class="form-control radius-8" placeholder="Address line 2" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm mb-1">Postal Code</label>
                <input v-model="postalCode" type="text" class="form-control radius-8" placeholder="Postal code" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm mb-1">PO Box</label>
                <input v-model="poBox" type="text" class="form-control radius-8" placeholder="PO box" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm mb-1">Bank Name</label>
                <input v-model="bankName" type="text" class="form-control radius-8" placeholder="Bank name" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm mb-1">Account Name</label>
                <input v-model="bankAccountName" type="text" class="form-control radius-8" placeholder="Account holder" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm mb-1">Account / IBAN</label>
                <input v-model="bankIban" type="text" class="form-control radius-8" placeholder="IBAN" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm mb-1">Payout Method</label>
                <select v-model="payoutMethod" class="form-select radius-8">
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="manual">Manual</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm mb-1">Status</label>
                <select v-model="status" class="form-select radius-8">
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm mb-1">Approval</label>
                <select v-model="approvalStatus" class="form-select radius-8">
                  <option value="pending">Pending</option>
                  <option value="under_review">Under review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm mb-1">Active?</label>
                <div class="form-check form-switch mt-2">
                  <input class="form-check-input" type="checkbox" v-model="isActive" />
                  <label class="form-check-label">{{ isActive ? 'Enabled' : 'Disabled' }}</label>
                </div>
              </div>

              <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
                <button type="reset"
                  class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8"
                  @click="
                    vendorName=''; tradeName=''; crNumber=''; vatNumber=''; email1=''; phoneNo='';
                    businessType=''; contactPersonName=''; contactPersonTitle=''; contactPersonEmail=''; contactPersonPhone='';
                    address1=''; address2=''; postalCode=''; poBox='';
                    bankName=''; bankAccountName=''; bankAccountNumber=''; bankIban=''; bankSwiftCode=''; payoutMethod='bank_transfer'; payoutStatus='not_configured';
                    status='active'; approvalStatus='pending'; isActive=true;
                    Country_Id=''; Region_Id=''; District_Id=''; City_Id='';
                    regions=[]; districts=[]; cities=[];
                  "
                >
                  Reset
                </button>

                <button type="submit" class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8" :disabled="isSubmit">
                  <span v-if="isSubmit" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {{ isSubmit ? 'Submitting...' : 'Submit' }}
                </button>
              </div>

              <div v-if="errorMessage" class="alert alert-danger py-8 px-12 mt-3" role="alert">
                {{ errorMessage }}
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- LIST -->
      <div class="dashboard-main-body vendor-admin-page">
        <div class="col-lg-12">
          <div class="card vendor-table-card">
            <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <div class="fw-semibold">Vendor Directory</div>
                <div class="text-muted small">Search, edit, suspend, or remove vendor records.</div>
              </div>

              <div class="d-flex flex-wrap align-items-center gap-3">
                <div class="d-flex align-items-center gap-2">
                  <span>Show</span>
                  <select v-model.number="table.perPage" class="form-select form-select-sm w-auto">
                    <option :value="10">10</option>
                    <option :value="15">15</option>
                    <option :value="20">20</option>
                  </select>
                </div>

                <div class="icon-field">
                  <input v-model="table.search" type="text" class="form-control form-control-sm w-auto" placeholder="Search" />
                  <span class="icon"><iconify-icon icon="ion:search-outline"></iconify-icon></span>
                </div>
              </div>
            </div>

            <div class="card-body">
              <div class="spinner-border" role="status" v-if="isLoading">
                <span class="sr-only">Loading...</span>
              </div>

              <table class="table bordered-table mb-0" v-else>
                <thead>
                  <tr>
                    <th>S.L</th>
                    <th>Code</th>
                    <th>Name</th>
                    <th>CR</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Completion</th>
                    <th>Approval</th>
                    <th>Payout</th>
                    <th>Status</th>
                    <th>Active</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  <tr v-for="(v, index) in vendors" :key="v.id">
                    <td>{{ index + 1 + ((pagination.from || 1) - 1) }}</td>
                    <td>{{ v.Vendor_Code }}</td>
                    <td>{{ v.Vendor_Name }}</td>
                    <td>{{ v.CR_Number || '-' }}</td>
                    <td>{{ v.Email_1 || '-' }}</td>
                    <td>{{ v.Phone_No || '-' }}</td>
                    <td style="min-width: 150px">
                      <div class="d-flex align-items-center gap-2">
                        <div class="progress flex-grow-1" style="height: 7px">
                          <div class="progress-bar bg-success" :style="{ width: `${completionPercent(v)}%` }"></div>
                        </div>
                        <span class="small fw-semibold">{{ completionPercent(v) }}%</span>
                      </div>
                      <div class="text-muted small">Missing: {{ missingChecklist(v) }}</div>
                    </td>
                    <td>
                      <span class="badge" :class="approvalBadgeClass(v.Approval_Status)">
                        {{ v.Approval_Status || 'pending' }}
                      </span>
                    </td>
                    <td>
                      <span class="badge" :class="payoutBadgeClass(v.Payout_Status)">
                        {{ v.Payout_Status || 'not_configured' }}
                      </span>
                    </td>
                    <td><span class="badge bg-primary-50 text-secondary-light">{{ v.Status }}</span></td>
                    <td>
                      <span :class="['badge', v.Is_Active ? 'bg-success' : 'bg-danger']">
                        {{ v.Is_Active ? 'Yes' : 'No' }}
                      </span>
                    </td>
                    <td>
                      <a href="javascript:void(0)" class="vendor-action bg-success-focus text-success-main"
                        @click.prevent="openEdit(v)">
                        <iconify-icon icon="lucide:edit"></iconify-icon>
                      </a>

                      <button
                        type="button"
                        class="btn btn-sm btn-outline-success ms-1"
                        :disabled="v.Approval_Status === 'approved'"
                        @click="setApproval(v, 'approved')"
                      >
                        Approve
                      </button>

                      <a href="javascript:void(0)" class="vendor-action bg-danger-focus text-danger-main"
                        @click.prevent="deleteVendor(v)">
                        <iconify-icon icon="mingcute:delete-2-line"></iconify-icon>
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-24">
                <span>
                  Showing {{ pagination.from || 0 }} to {{ pagination.to || 0 }} of {{ pagination.total || 0 }} entries
                </span>
                <ul class="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
                  <li class="page-item" :class="{ disabled: table.page === 1 }">
                    <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                      href="javascript:void(0)" @click="table.page > 1 && (table.page -= 1)">
                      <iconify-icon icon="ep:d-arrow-left" class="text-xl"></iconify-icon>
                    </a>
                  </li>

                  <li v-for="p in pagination.last_page" :key="p" class="page-item">
                    <a href="javascript:void(0)" @click="table.page = p" :class="[
                      'page-link fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px',
                      p === table.page ? 'bg-primary-600 text-white' : 'bg-primary-50 text-secondary-light'
                    ]">
                      {{ p }}
                    </a>
                  </li>

                  <li class="page-item" :class="{ disabled: table.page === pagination.last_page }">
                    <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                      href="javascript:void(0)" @click="table.page < pagination.last_page && (table.page += 1)">
                      <iconify-icon icon="ep:d-arrow-right" class="text-xl"></iconify-icon>
                    </a>
                  </li>
                </ul>
              </div>

            </div>
          </div>
        </div>
      </div>

      <!-- EDIT MODAL -->
      <transition name="fade-scale" appear>
        <div v-if="showEdit" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style="background: rgba(0,0,0,0.5); z-index:1050;">
          <div class="bg-white radius-12 shadow p-24" style="min-width: 320px; max-width: 760px; width: 100%; position: relative;">
            <div class="d-flex justify-content-between align-items-start mb-16">
              <div>
                <h5 class="fw-semibold mb-4">Edit Vendor</h5>
                <small class="text-muted d-block">Update vendor details</small>
              </div>
              <button type="button" class="btn-close" aria-label="Close" @click="closeEdit"></button>
            </div>

            <div class="row g-3">
              <div class="col-lg-6">
                <label class="form-label fw-semibold text-sm">Vendor Name <span class="text-danger">*</span></label>
                <input class="form-control radius-8" v-model="editVendor.Vendor_Name" />
              </div>

              <div class="col-lg-6">
                <label class="form-label fw-semibold text-sm">Trade Name</label>
                <input class="form-control radius-8" v-model="editVendor.Trade_Name" />
              </div>

              <!-- Geo -->
              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm">Country</label>
                <select v-model="editCountryId" class="form-control radius-8 w-full">
                  <option value="">-- Select Country --</option>
                  <option v-for="c in editCountries" :key="c.id" :value="c.id">{{ c.Country_Name }}</option>
                </select>
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm">Region</label>
                <select v-model="editRegionId" class="form-control radius-8 w-full" :disabled="!editCountryId">
                  <option value="">-- Select Region --</option>
                  <option v-for="r in editRegions" :key="r.id" :value="r.id">{{ r.Region_Name }}</option>
                </select>
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm">District</label>
                <select v-model="editDistrictId" class="form-control radius-8 w-full" :disabled="!editRegionId">
                  <option value="">-- Select District --</option>
                  <option v-for="d in editDistricts" :key="d.id" :value="d.id">{{ d.District_Name }}</option>
                </select>
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm">City</label>
                <select v-model="editCityId" class="form-control radius-8 w-full" :disabled="!editDistrictId">
                  <option value="">-- Select City --</option>
                  <option v-for="c in editCities" :key="c.id" :value="c.id">{{ c.City_Name }}</option>
                </select>
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm">CR</label>
                <input class="form-control radius-8" v-model="editVendor.CR_Number" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm">VAT</label>
                <input class="form-control radius-8" v-model="editVendor.VAT_Number" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm">Email</label>
                <input class="form-control radius-8" v-model="editVendor.Email_1" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm">Phone</label>
                <input class="form-control radius-8" v-model="editVendor.Phone_No" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm">Business Type</label>
                <input class="form-control radius-8" v-model="editVendor.Business_Type" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm">Contact Person</label>
                <input class="form-control radius-8" v-model="editVendor.Contact_Person_Name" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm">Contact Email</label>
                <input class="form-control radius-8" v-model="editVendor.Contact_Person_Email" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm">Contact Phone</label>
                <input class="form-control radius-8" v-model="editVendor.Contact_Person_Phone" />
              </div>

              <div class="col-lg-6">
                <label class="form-label fw-semibold text-sm">Address 1</label>
                <input class="form-control radius-8" v-model="editVendor.Address_Line1" />
              </div>

              <div class="col-lg-6">
                <label class="form-label fw-semibold text-sm">Address 2</label>
                <input class="form-control radius-8" v-model="editVendor.Address_Line2" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm">Postal Code</label>
                <input class="form-control radius-8" v-model="editVendor.Postal_Code" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm">PO Box</label>
                <input class="form-control radius-8" v-model="editVendor.PO_Box" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm">Bank Name</label>
                <input class="form-control radius-8" v-model="editVendor.Bank_Name" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm">Account Name</label>
                <input class="form-control radius-8" v-model="editVendor.Bank_Account_Name" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm">Account Number</label>
                <input class="form-control radius-8" v-model="editVendor.Bank_Account_Number" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm">IBAN</label>
                <input class="form-control radius-8" v-model="editVendor.Bank_IBAN" />
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm">Payout Method</label>
                <select v-model="editVendor.Payout_Method" class="form-select radius-8">
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="manual">Manual</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm">Payout Status</label>
                <select v-model="editVendor.Payout_Status" class="form-select radius-8">
                  <option value="not_configured">Not configured</option>
                  <option value="pending_review">Pending review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm">Status</label>
                <select v-model="editVendor.Status" class="form-select radius-8">
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm">Approval</label>
                <select v-model="editVendor.Approval_Status" class="form-select radius-8">
                  <option value="pending">Pending</option>
                  <option value="under_review">Under review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div class="col-lg-6">
                <label class="form-label fw-semibold text-sm">Approval Note</label>
                <input class="form-control radius-8" v-model="editVendor.Approval_Note" />
              </div>

              <div class="col-lg-6">
                <label class="form-label fw-semibold text-sm">Onboarding</label>
                <div class="d-flex align-items-center gap-2 mt-2">
                  <div class="progress flex-grow-1" style="height: 8px">
                    <div class="progress-bar bg-success" :style="{ width: `${editVendor.Onboarding_Completeness || 0}%` }"></div>
                  </div>
                  <span class="small fw-semibold">{{ editVendor.Onboarding_Completeness || 0 }}%</span>
                </div>
              </div>

              <div class="col-lg-3">
                <label class="form-label fw-semibold text-sm">Active?</label>
                <div class="form-check form-switch mt-2">
                  <input class="form-check-input" type="checkbox" v-model="editVendor.Is_Active" />
                  <label class="form-check-label">{{ editVendor.Is_Active ? 'Enabled' : 'Disabled' }}</label>
                </div>
              </div>

              <div v-if="editError" class="alert alert-danger py-8 px-12" role="alert">
                {{ editError }}
              </div>
            </div>

            <div class="d-flex justify-content-end gap-2 mt-24">
              <button type="button" class="btn btn-outline-secondary" @click="closeEdit">Cancel</button>
              <button type="button" class="btn btn-primary" :disabled="savingEdit" @click="saveEdit">
                <span v-if="savingEdit" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                Save
              </button>
            </div>

          </div>
        </div>
      </transition>
    </template>

    <style scoped>
    .fade-scale-enter-active, .fade-scale-leave-active { transition: opacity .18s ease, transform .18s ease; }
    .fade-scale-enter-from, .fade-scale-leave-to { opacity: 0; transform: scale(.94); }

    .vendor-admin-page {
      color: #111827;
    }

    .vendor-hero {
      padding: 1.25rem;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      box-shadow: 0 10px 30px rgba(15, 23, 42, .05);
    }

    .vendor-stat-card {
      height: 100%;
      display: flex;
      align-items: center;
      gap: .875rem;
      padding: 1rem;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      background: #fff;
      box-shadow: 0 10px 30px rgba(15, 23, 42, .045);
    }

    .vendor-stat-icon {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      flex: 0 0 auto;
    }

    .vendor-form-card,
    .vendor-table-card {
      border: 1px solid #e5e7eb;
      box-shadow: 0 12px 34px rgba(15, 23, 42, .055);
    }

    .vendor-action {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-inline-end: .25rem;
      transition: transform .16s ease, box-shadow .16s ease;
    }

    .vendor-action:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 18px rgba(15, 23, 42, .12);
    }
    </style>
