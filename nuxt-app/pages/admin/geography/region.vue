<script setup lang="ts">
definePageMeta({
    layout: 'admin',
    middleware: ['permission'],
    permissions: 'region'
})

import { ref, onMounted } from 'vue'
const { $axios } = useNuxtApp()

interface Country {
    id: number
    Country_Name: string
}

interface Region {
    id: number
    Region_Code: string
    Region_Name: string
    Region_Name_Ar: string
    Country_Id: number
    created_at?: string
    country?: { Country_Name: string }
}

const regions = ref<Region[]>([])
const countries = ref<Country[]>([])

/* ---------- CREATE FORM STATE ---------- */
const Region_Code = ref<string>('')
const Region_Name = ref<string>('')
const Region_Name_Ar = ref<string>('')
const Country_Id = ref<number | ''>('')

/* ---------- UI STATE ---------- */
const loadingList = ref(false)
const creating = ref(false)
const savingEdit = ref(false)
const errorMessage = ref<string | null>(null)

/* ---------- EDIT MODAL STATE ---------- */
const showEdit = ref(false)
const edit_id = ref<number | null>(null)
const edit_Region_Code = ref<string>('')
const edit_Region_Name = ref<string>('')
const edit_Region_Name_Ar = ref<string>('')
const edit_Country_Id = ref<number | ''>('')

/* ---------- API FETCH ---------- */
const fetchCountries = async () => {
    try {
        const response = await $axios.get('/api/regions/countries')
        countries.value = response.data
    } catch (err) {
        console.error('Failed to fetch countries:', err)
    }
}

const fetchRegions = async () => {
    try {
        loadingList.value = true
        const response = await $axios.get('/api/regions')
        regions.value = response.data
    } catch (err) {
        console.error('Failed to fetch regions:', err)
    } finally {
        loadingList.value = false
    }
}

/* ---------- CREATE ---------- */
const resetCreateForm = () => {
    Region_Code.value = ''
    Region_Name.value = ''
    Region_Name_Ar.value = ''
    Country_Id.value = ''
}

const submitForm = async () => {
    creating.value = true
    errorMessage.value = null
    try {
        await $axios.post('/api/regions', {
            Region_Code: Region_Code.value,
            Country_Id: Country_Id.value,
            Region_Name: Region_Name.value,
            Region_Name_Ar: Region_Name_Ar.value,
        })

        alert('Region created successfully')

        resetCreateForm()
        await fetchRegions()
    } catch (error: any) {
        console.error(error)
        errorMessage.value =
            error?.response?.data?.message ||
            error?.message ||
            'Failed to create region.'
        alert('Error: ' + errorMessage.value)
    } finally {
        creating.value = false
    }
}

/* ---------- EDIT OPEN ---------- */
const openEdit = (r: Region) => {
    errorMessage.value = null

    edit_id.value = r.id
    edit_Region_Code.value = r.Region_Code
    edit_Region_Name.value = r.Region_Name
    edit_Region_Name_Ar.value = r.Region_Name_Ar
    edit_Country_Id.value = r.Country_Id ?? ''

    showEdit.value = true
}

/* ---------- EDIT SAVE ---------- */
const saveEdit = async () => {
    if (!edit_id.value) return

    savingEdit.value = true
    errorMessage.value = null

    try {
        await $axios.put(`/api/regions/${edit_id.value}`, {
            Region_Code: edit_Region_Code.value,
            Country_Id: edit_Country_Id.value,
            Region_Name: edit_Region_Name.value,
            Region_Name_Ar: edit_Region_Name_Ar.value,
        })

        showEdit.value = false

        // clear edit refs
        edit_id.value = null
        edit_Region_Code.value = ''
        edit_Region_Name.value = ''
        edit_Region_Name_Ar.value = ''
        edit_Country_Id.value = ''

        await fetchRegions()
    } catch (error: any) {
        console.error('Failed to update region:', error)
        errorMessage.value =
            error?.response?.data?.message ||
            error?.message ||
            'Failed to update region.'
        // keep modal open, user can fix
    } finally {
        savingEdit.value = false
    }
}

/* ---------- EDIT CLOSE ---------- */
const closeEdit = () => {
    showEdit.value = false
    edit_id.value = null
    edit_Region_Code.value = ''
    edit_Region_Name.value = ''
    edit_Region_Name_Ar.value = ''
    edit_Country_Id.value = ''
    errorMessage.value = null
}

/* ---------- DELETE ---------- */
const deleteRegion = async (id: number) => {
    const yes = confirm('Are you sure you want to delete this region?')
    if (!yes) return

    try {
        await $axios.delete(`/api/regions/${id}`)
        await fetchRegions()
    } catch (err) {
        console.error('Failed to delete region:', err)
        alert('Delete failed')
    }
}

/* ---------- INIT ---------- */
onMounted(async () => {
    await fetchCountries()
    await fetchRegions()
})
</script>

<template>
    <div class="dashboard-main-body">
        <!-- HEADER -->
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
            <h6 class="fw-semibold mb-0" style="color: #f97316">Create Region</h6>
            <ul class="d-flex align-items-center gap-2">
                <li class="fw-medium">
                    <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
                        <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
                        Dashboard
                    </a>
                </li>
                <li>-</li>
                <li class="fw-medium">Create Region</li>
            </ul>
        </div>

        <!-- CREATE FORM CARD -->
        <div class="card h-100 p-0 radius-12 overflow-hidden mb-24">
            <div class="card-body p-40">
                <form @submit.prevent="submitForm()" class="row g-4">
                    <div class="row">
                        <div class="col-sm-12">

                            <!-- Country -->
                            <div class="mb-20">
                                <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                                    Country <span class="text-danger-600">*</span>
                                </label>
                                <select v-model="Country_Id" class="form-control radius-8 w-full">
                                    <option value="">-- Select Country --</option>
                                    <option
                                        v-for="country in countries"
                                        :key="country.id"
                                        :value="country.id"
                                    >
                                        {{ country.Country_Name }}
                                    </option>
                                </select>
                            </div>

                            <!-- Region Code -->
                         

                            <!-- Region Name -->
                            <div class="mb-20">
                                <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                                    Region Name <span class="text-danger-600">*</span>
                                </label>
                                <input
                                    type="text"
                                    class="form-control radius-8 w-full"
                                    v-model="Region_Name"
                                    placeholder="Region Name (English)"
                                />
                            </div>

                            <!-- Region Name Arabic -->
                            <div class="mb-20">
                                <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                                    Region Name (Arabic)
                                </label>
                                <input
                                    type="text"
                                    class="form-control radius-8 w-full"
                                    v-model="Region_Name_Ar"
                                    placeholder="اسم المنطقة"
                                    dir="auto"
                                />
                            </div>

                            <div v-if="errorMessage" class="alert alert-danger py-8 px-12" role="alert">
                                {{ errorMessage }}
                            </div>
                        </div>

                        <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
                            <button
                                type="reset"
                                class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8"
                                @click.prevent="
                                    Region_Code='';Region_Name='';Region_Name_Ar='';Country_Id='';errorMessage=null
                                "
                            >
                                Reset
                            </button>
                            <button
                                type="submit"
                                class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"
                                :disabled="creating"
                            >
                                <span v-if="creating">Saving...</span>
                                <span v-else>Save Change</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>

        <!-- LIST TABLE CARD -->
        <div class="col-lg-12">
            <div class="card">
                <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div class="d-flex flex-wrap align-items-center gap-3">
                        <div class="d-flex align-items-center gap-2">
                            <span>Show</span>
                            <select class="form-select form-select-sm w-auto">
                                <option>10</option>
                                <option>15</option>
                                <option>20</option>
                            </select>

                            <select class="form-select form-select-sm w-auto">
                                <option>status</option>
                                <option>Paid</option>
                                <option>Pending</option>
                            </select>
                        </div>
                        <div class="icon-field">
                            <input
                                type="text"
                                name="#0"
                                class="form-control form-control-sm w-auto"
                                placeholder="Search"
                            >
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
                                <th>Country</th>
                               
                                <th>Region Name</th>
                                <th class="text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- loading -->
                            <tr v-if="loadingList">
                                <td colspan="4" class="text-center py-24 text-muted">
                                    Loading...
                                </td>
                            </tr>

                            <!-- data -->
                            <tr
                                v-for="state in regions"
                                :key="state.id"
                            >
                                <td>{{ state.country?.Country_Name }}</td>
                               
                                <td>
                                    <div class="d-flex flex-column">
                                        <span class="fw-semibold">{{ state.Region_Name }}</span>
                                        <small class="text-muted" v-if="state.Region_Name_Ar">
                                            {{ state.Region_Name_Ar }}
                                        </small>
                                    </div>
                                </td>
                                <td class="text-end">
                                    <a
                                        href="javascript:void(0)"
                                        class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center me-1"
                                        title="Edit"
                                        @click="openEdit(state)"
                                    >
                                        <iconify-icon icon="lucide:edit"></iconify-icon>
                                    </a>
                                    <a
                                        href="javascript:void(0)"
                                        class="w-32-px h-32-px bg-danger-light text-danger-600 rounded-circle d-inline-flex align-items-center justify-content-center"
                                        title="Delete"
                                        @click="deleteRegion(state.id)"
                                    >
                                        <iconify-icon icon="iconamoon:trash-light"></iconify-icon>
                                    </a>
                                </td>
                            </tr>

                            <!-- empty -->
                            <tr v-if="!loadingList && regions.length === 0">
                                <td colspan="4" class="text-center py-24 text-muted">
                                    No Regions Found
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    </div>

    <!-- EDIT POPUP WITH FADE+SCALE -->
    <transition name="fade-scale" appear>
        <div
            v-if="showEdit"
            class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style="background:rgba(0,0,0,0.5); z-index:1050;"
        >
            <div
                class="bg-white radius-12 shadow p-24"
                style="min-width:320px; max-width:480px; width:100%; position:relative;"
            >
                <!-- header -->
                <div class="d-flex justify-content-between align-items-start mb-16">
                    <div>
                        <h5 class="fw-semibold mb-4">Edit Region</h5>
                        <small class="text-muted d-block">Update region details</small>
                    </div>
                    <button
                        type="button"
                        class="btn-close"
                        aria-label="Close"
                        @click="closeEdit"
                    ></button>
                </div>

                <!-- body -->
                <div>
                    <!-- Country -->
                    <div class="mb-16">
                        <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                            Country <span class="text-danger-600">*</span>
                        </label>
                        <select
                            v-model="edit_Country_Id"
                            class="form-control radius-8 w-full"
                        >
                            <option value="">-- Select Country --</option>
                            <option
                                v-for="country in countries"
                                :key="country.id"
                                :value="country.id"
                            >
                                {{ country.Country_Name }}
                            </option>
                        </select>
                    </div>

                  

                    <!-- Region Name -->
                    <div class="mb-16">
                        <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                            Region Name <span class="text-danger-600">*</span>
                        </label>
                        <input
                            type="text"
                            class="form-control radius-8 w-full"
                            v-model="edit_Region_Name"
                            placeholder="Region Name (English)"
                        />
                    </div>

                    <!-- Region Name Arabic -->
                    <div class="mb-16">
                        <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                            Region Name (Arabic)
                        </label>
                        <input
                            type="text"
                            class="form-control radius-8 w-full"
                            v-model="edit_Region_Name_Ar"
                            placeholder="اسم المنطقة"
                            dir="auto"
                        />
                    </div>

                    <div v-if="errorMessage" class="alert alert-danger py-8 px-12" role="alert">
                        {{ errorMessage }}
                    </div>
                </div>

                <!-- footer -->
                <div class="d-flex justify-content-end gap-2 mt-24">
                    <button
                        type="button"
                        class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-24 py-12 radius-8"
                        @click="closeEdit"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"
                        :disabled="savingEdit"
                        @click="saveEdit"
                    >
                        <span v-if="savingEdit">Saving...</span>
                        <span v-else>Save Changes</span>
                    </button>
                </div>
            </div>
        </div>
    </transition>
</template>

<style scoped>
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
