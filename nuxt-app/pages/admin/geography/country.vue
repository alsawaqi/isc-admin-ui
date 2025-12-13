<script setup lang="ts">
import { useNuxtApp, definePageMeta } from '#imports'
import { ref, onMounted, reactive, watch } from 'vue'
import { useFlashStore } from '~/stores/flashs'
const flash = useFlashStore()

definePageMeta({
    layout: 'admin',
    middleware: ['permission'],
    permissions: 'countries',
})

const { $axios } = (useNuxtApp() as any);

interface Country {
    id: number | string;
    Country_Code: string;
    Country_Name: string;
    Country_Name_Ar: string;
    Created_By?: string;
    Created_Date?: string;
    created_at?: string;
    updated_at?: string;
}

const countries = ref<Country[]>([])

// create form
const Country_Code = ref('')
const Country_Name = ref('')
const Country_Name_Ar = ref('')

// edit modal state
const showEdit = ref<boolean>(false)
const edit_id = ref<number | string | null>(null)
const edit_Country_Code = ref('')
const edit_Country_Name = ref('')
const edit_Country_Name_Ar = ref('')

// loading states
const loadingList = ref(false)
const savingEdit = ref(false)
const creating = ref(false)

// error display (simple text, you can style in UI)
const errorMessage = ref<string | null>(null)


const table = reactive({
    page: 1,
    perPage: 10,
    search: '',
    sortBy: 'id',
    sortDir: 'desc',
})

// paginator info from backend
const pagination = ref({
    total: 0,
    from: 0,
    to: 0,
    last_page: 1,
})


const countryNameToCode: { [key: string]: string } = {
    afghanistan: 'AF',
    albania: 'AL',
    algeria: 'DZ',
    andorra: 'AD',
    angola: 'AO',
    argentina: 'AR',
    australia: 'AU',
    austria: 'AT',
    bangladesh: 'BD',
    bahrain: 'BH',
    belarus: 'BY',
    belgium: 'BE',
    brazil: 'BR',
    canada: 'CA',
    china: 'CN',
    egypt: 'EG',
    france: 'FR',
    germany: 'DE',
    india: 'IN',
    indonesia: 'ID',
    italy: 'IT',
    japan: 'JP',
    kenya: 'KE',
    kuwait: 'KW',
    malaysia: 'MY',
    morocco: 'MA',
    netherlands: 'NL',
    nigeria: 'NG',
    oman: 'OM',
    pakistan: 'PK',
    philippines: 'PH',
    qatar: 'QA',
    russia: 'RU',
    "saudi arabia": 'SA',
    singapore: 'SG',
    "south africa": 'ZA',
    "south korea": 'KR',
    spain: 'ES',
    "sri lanka": 'LK',
    sweden: 'SE',
    switzerland: 'CH',
    syria: 'SY',
    tanzania: 'TZ',
    thailand: 'TH',
    tunisia: 'TN',
    turkey: 'TR',
    uae: 'AE',
    uk: 'GB',
    "united arab emirates": 'AE',
    "united kingdom": 'GB',
    "united states": 'US',
    usa: 'US',
    vietnam: 'VN',
    yemen: 'YE'
}

const countryCode = (countryname: any) => {
    const name = String(countryname || '').trim().toLowerCase()
    return countryNameToCode[name] || null
}

/* ---------------- FETCH LIST ---------------- */
const fetchCountries = async (): Promise<void> => {
    try {
        loadingList.value = true
        const { data } = await $axios.get('/api/countries', {

            params: {
                page: table.page,
                per_page: table.perPage,
                search: table.search,
                sort_by: table.sortBy,
                sort_dir: table.sortDir,
            },
        })

        countries.value = data.data;
        pagination.value = {
            total: data.total,
            from: data.from,
            to: data.to,
            last_page: data.last_page,
        }

    } catch (error) {
        flash.error('Failed to fetch countries:')
    } finally {
        loadingList.value = false
    }
}

/* ---------------- CREATE ---------------- */
const resetCreateForm = () => {
    Country_Code.value = ''
    Country_Name.value = ''
    Country_Name_Ar.value = ''
}

const submitForm = async () => {
    creating.value = true
    errorMessage.value = null

    try {
        await $axios.post('/api/countries', {
            Country_Code: Country_Code.value,
            Country_Name: Country_Name.value,
            Country_Name_Ar: Country_Name_Ar.value,
        })

       

        resetCreateForm()

        flash.success('Country created successfully.')
    } catch (error: any) {
        errorMessage.value =
            error?.response?.data?.message ||
            error?.message ||
            'Failed to create country.'
        flash.error('Failed to create country.')
    } finally {
        creating.value = false
        await fetchCountries()
    }
}

/* ---------------- EDIT MODAL OPEN ---------------- */
const openEdit = (c: Country) => {
    errorMessage.value = null
    edit_id.value = c.id
    edit_Country_Code.value = c.Country_Code
    edit_Country_Name.value = c.Country_Name
    edit_Country_Name_Ar.value = c.Country_Name_Ar
    showEdit.value = true
}

/* ---------------- EDIT SAVE ---------------- */
const saveEdit = async () => {
    if (!edit_id.value) return

    savingEdit.value = true
    errorMessage.value = null

    try {
        await $axios.put(`/api/countries/${edit_id.value}`, {
            Country_Code: edit_Country_Code.value,
            Country_Name: edit_Country_Name.value,
            Country_Name_Ar: edit_Country_Name_Ar.value,
        })

        showEdit.value = false
        edit_id.value = null
        edit_Country_Code.value = ''
        edit_Country_Name.value = ''
        edit_Country_Name_Ar.value = ''

        await fetchCountries()
        flash.success('Country updated successfully.')
    } catch (error: any) {
        flash.error('Failed to update country.')
        errorMessage.value =
            error?.response?.data?.message ||
            error?.message ||
            'Failed to update country.'
        // keep modal open so user can fix
    } finally {
        savingEdit.value = false
    }
}

/* ---------------- EDIT CLOSE ---------------- */
const closeEdit = () => {
    showEdit.value = false
    edit_id.value = null
    edit_Country_Code.value = ''
    edit_Country_Name.value = ''
    edit_Country_Name_Ar.value = ''
    errorMessage.value = null
}

/* ---------------- DELETE ---------------- */
const deleteCountry = async (id: number | string) => {
    const ok = await flash.confirm({
    title: 'Delete department?',
    message: `Are you sure you want to delete "${name}"? This cannot be undone.`,
    confirmText: 'Yes, delete',
    cancelText: 'No, cancel',
  })
  if (!ok) return;

    try {
       const success =   await $axios.delete(`/api/countries/${id}`)
        flash.success('Department deleted successfully') 
       await fetchCountries()
    } catch (error) {
        flash.error('Failed to delete country.')
    }
}


watch(
    () => [table.page, table.perPage, table.search, table.sortBy, table.sortDir],
    async () => {
        await fetchCountries()
    }
)



/* ---------------- INIT ---------------- */
onMounted(async () => {
    await fetchCountries()
})
</script>

<template>
    <!-- CREATE FORM -->
    <div class="dashboard-main-body">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
            <h6 class="fw-semibold mb-0" style="color: #ef4444">Country</h6>
            <ul class="d-flex align-items-center gap-2">
                <li class="fw-medium">
                    <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
                        <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
                        Dashboard
                    </a>
                </li>
                <li>-</li>
                <li class="fw-medium">Country</li>
            </ul>
        </div>

        <div class="card h-100 p-0 radius-12 overflow-hidden">
            <div class="card-body p-40">
                <form @submit.prevent="submitForm()" class="row g-4">
                    <div class="row">
                        <div class="col-sm-12">

                            <!-- Country Name -->
                            <div class="mb-20">
                                <label for="countryNameInput"
                                    class="form-label fw-semibold text-primary-light text-sm mb-8">
                                    Name <span class="text-danger-600">*</span>
                                </label>
                                <input type="text" class="form-control radius-8" id="countryNameInput"
                                    v-model="Country_Name" placeholder="Enter Country Name (English)">
                            </div>

                            <!-- Arabic Name -->
                            <div class="mb-20">
                                <label for="countryNameArInput"
                                    class="form-label fw-semibold text-primary-light text-sm mb-8">
                                    Name (Arabic)
                                </label>
                                <input type="text" class="form-control radius-8" id="countryNameArInput"
                                    v-model="Country_Name_Ar" placeholder="اسم الدولة">
                            </div>


                        </div>

                        <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
                            <button type="reset"
                                class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8"
                                @click.prevent="
                                    Country_Code = ''; Country_Name = ''; Country_Name_Ar = ''; errorMessage = null
                                    ">
                                Reset
                            </button>
                            <button type="submit"
                                class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"
                                :disabled="creating">
                                <span v-if="creating">Saving...</span>
                                <span v-else>Save Change</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>


    <!-- LIST -->
    <div class="dashboard-main-body">
        <div class="col-lg-12">
            <div class="card">
                <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
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
                            <input type="text" name="#0" class="form-control form-control-sm w-auto"
                                placeholder="Search" v-model="table.search">
                            <span class="icon">
                                <iconify-icon icon="ion:search-outline"></iconify-icon>
                            </span>
                        </div>
                    </div>
                </div>

                <div class="card-body">
                    <table class="table bordered-table mb-0">
                        <thead>
                            <tr>
                                <th scope="col">
                                    <div class="form-check style-check d-flex align-items-center">
                                        <input class="form-check-input" type="checkbox" value="" id="checkAll">
                                        <label class="form-check-label" for="checkAll">
                                            S.L
                                        </label>
                                    </div>
                                </th>

                                <th scope="col">Name</th>
                                <th scope="col" class="text-end">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            <!-- loading row -->
                            <tr v-if="loadingList">
                                <td colspan="3" class="text-center py-24 text-muted">
                                    Loading...
                                </td>
                            </tr>

                            <!-- country rows -->
                            <tr v-for="(country, index) in countries" :key="country.id">
                                <td>
                                    <div class="form-check style-check d-flex align-items-center">
                                        <input class="form-check-input" type="checkbox" :value="country.id"
                                            :id="'check' + index">
                                        <label class="form-check-label" :for="'check' + index">
                                            {{ index + 1 }}
                                        </label>
                                    </div>
                                </td>

                                <td>
                                    <div class="d-flex align-items-center">
                                        <div v-if="countryCode(country.Country_Name)" class="flex items-center gap-2">
                                            <img :src="(() => {
                                                const code = countryCode(country.Country_Name)
                                                return code
                                                    ? `https://flagcdn.com/24x18/${code.toLowerCase()}.png`
                                                    : '/logo.jpg'
                                            })()" :alt="country.Country_Name + ' flag'" width="24" height="18" />
                                        </div>
                                        <div v-else>
                                            <img src="/logo.jpg" alt="isc" width="54" height="40" />
                                        </div>

                                        <div class="ms-3 d-flex flex-column">
                                            <span class="text-md fw-semibold">{{ country.Country_Name }}</span>
                                            <small class="text-muted" v-if="country.Country_Name_Ar">
                                                {{ country.Country_Name_Ar }}
                                            </small>

                                        </div>
                                    </div>
                                </td>

                                <td class="text-end">
                                    <!-- EDIT -->
                                    <a href="javascript:void(0)"
                                        class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center me-1"
                                        @click="openEdit(country)" title="Edit">
                                        <iconify-icon icon="lucide:edit"></iconify-icon>
                                    </a>

                                    <!-- DELETE -->
                                    <a href="javascript:void(0)"
                                        class="w-32-px h-32-px bg-danger-light text-danger-600 rounded-circle d-inline-flex align-items-center justify-content-center"
                                        @click="deleteCountry(country.id)" title="Delete">
                                        <iconify-icon icon="iconamoon:trash-light"></iconify-icon>
                                    </a>
                                </td>
                            </tr>

                            <!-- empty -->
                            <tr v-if="!loadingList && countries.length === 0">
                                <td colspan="3" class="text-center py-24 text-muted">
                                    No Countries Found
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-24">
                        <span>
                            Showing {{ pagination.from || 0 }} to {{ pagination.to || 0 }} of {{ pagination.total || 0
                            }} entries
                        </span>
                        <ul class="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
                            <!-- Prev -->
                            <li class="page-item" :class="{ disabled: table.page === 1 }">
                                <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                                    href="javascript:void(0)" @click="table.page > 1 && (table.page -= 1)">
                                    <iconify-icon icon="ep:d-arrow-left" class="text-xl"></iconify-icon>
                                </a>
                            </li>

                            <!-- Page numbers -->
                            <li v-for="p in pagination.last_page" :key="p" class="page-item">
                                <a href="javascript:void(0)" @click="table.page = p" :class="[
                                    'page-link fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px',
                                    p === table.page
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-primary-50 text-secondary-light'
                                ]">
                                    {{ p }}
                                </a>
                            </li>

                            <!-- Next -->
                            <li class="page-item" :class="{ disabled: table.page === pagination.last_page }">
                                <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                                    href="javascript:void(0)"
                                    @click="table.page < pagination.last_page && (table.page += 1)">
                                    <iconify-icon icon="ep:d-arrow-right" class="text-xl"></iconify-icon>
                                </a>
                            </li>
                        </ul>

                    </div>
                </div>

            </div>
        </div>
    </div>


    <!-- EDIT POPUP WITH TRANSITION -->
    <transition name="fade-scale" appear>
        <div v-if="showEdit"
            class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style="background:rgba(0,0,0,0.5); z-index:1050;">
            <div class="bg-white radius-12 shadow p-24"
                style="min-width:320px; max-width:420px; width:100%; position:relative;">
                <!-- header -->
                <div class="d-flex justify-content-between align-items-start mb-16">
                    <div>
                        <h5 class="fw-semibold mb-4">Edit Country</h5>
                        <small class="text-muted d-block">Update name, Arabic name, and code</small>
                    </div>
                    <button type="button" class="btn-close" aria-label="Close" @click="closeEdit"></button>
                </div>

                <!-- body -->
                <div>
                    <div class="mb-16">
                        <label for="editCountryName" class="form-label fw-semibold text-primary-light text-sm mb-8">
                            Name <span class="text-danger-600">*</span>
                        </label>
                        <input id="editCountryName" type="text" class="form-control radius-8"
                            v-model="edit_Country_Name" placeholder="Country Name">
                    </div>

                    <div class="mb-16">
                        <label for="editCountryNameAr" class="form-label fw-semibold text-primary-light text-sm mb-8">
                            Name (Arabic)
                        </label>
                        <input id="editCountryNameAr" type="text" class="form-control radius-8"
                            v-model="edit_Country_Name_Ar" placeholder="اسم الدولة" dir="auto" ي>
                    </div>



                    <div v-if="errorMessage" class="alert alert-danger py-8 px-12" role="alert">
                        {{ errorMessage }}
                    </div>
                </div>

                <!-- footer -->
                <div class="d-flex justify-content-end gap-2 mt-24">
                    <button type="button"
                        class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-24 py-12 radius-8"
                        @click="closeEdit">
                        Cancel
                    </button>

                    <button type="button" class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"
                        :disabled="savingEdit" @click="saveEdit">
                        <span v-if="savingEdit">Saving...</span>
                        <span v-else>Save Changes</span>
                    </button>
                </div>
            </div>
        </div>
    </transition>
</template>

<style scoped>
/* transition for the dim background + popup "pop" */
.fade-scale-enter-active,
.fade-scale-leave-active {
    transition: opacity 0.18s ease, transform 0.18s ease;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
    opacity: 0;
    transform: scale(0.9);
}
</style>
