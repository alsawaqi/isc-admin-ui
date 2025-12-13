<script setup lang="ts">
import { definePageMeta, useNuxtApp } from '#imports';
import { ref, onMounted, reactive, watch } from 'vue';

import { useFlashStore } from '~/stores/flashs'

definePageMeta({
    layout: 'admin',
    middleware: ['permission'],
    permissions: 'departments'
});

const { $axios } = (useNuxtApp() as any);
const flash = useFlashStore()


interface ProductDepartments {
    id: number;
    Product_Department_Name: string;
}

interface Department {
    id: number;
    Product_Department_Name: string;
}

interface Manufacture {
    id: number;
    Products_Manufacture_Name: string;
    Products_Manufacture_Name_Ar?: string;
    department: Department;
    created_at?: string;
    updated_at?: string;
}

const ProductDepartments = ref<ProductDepartments[]>([]);
const ProductManufactures = ref<Manufacture[]>([]);

// create form
const name = ref<string>('');
const nameAr = ref<string>('');
const Product_Department_Id = ref<string>('');

// table/list loading
const loading = ref<boolean>(false);

// edit modal state
const showEditModal = ref<boolean>(false);
const edit_id = ref<number | null>(null);
const edit_name = ref<string>('');
const edit_nameAr = ref<string>('');
const edit_department_id = ref<string>('');

// simple error/success message handling (optional UI hook)
const errorMessage = ref<string | null>(null);


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


const getProductDepartment = async () => {
    try {
        const response = await $axios.get('/api/productdepartment/all');
        ProductDepartments.value = response.data;

    } catch (error) {
        flash.error('Failed to fetch product departments');
        throw error;
    }
};

const getManufactures = async () => {
    loading.value = true;
    try {
        const { data } = await $axios.get('/api/productmanufacture', {
            params: {
                page: table.page,
                per_page: table.perPage,
                search: table.search,
                sortBy: table.sortBy,
                sortDir: table.sortDir,
            }
        });
        ProductManufactures.value = data.data;

        pagination.value = {
            total: data.total,
            from: data.from,
            to: data.to,
            last_page: data.last_page,
        }


    } catch (error) {
        flash.error('Failed to fetch product manufactures');
        throw error;
    } finally {
        loading.value = false;
    }
};

watch(
    () => [table.page, table.perPage, table.search, table.sortBy, table.sortDir],
    async () => {
        await getManufactures()
    }
)

const resetCreateForm = () => {
    name.value = '';
    nameAr.value = '';
    Product_Department_Id.value = '';
};

const submit = async () => {
    errorMessage.value = null;
    try {
        await $axios.post('/api/productmanufacture', {
            name: name.value,
            name_ar: nameAr.value,
            product_department_id: Product_Department_Id.value
        });

        resetCreateForm();
        await getManufactures();
        flash.success('Manufacture created successfully.');
    } catch (error: any) {
        flash.error('Failed to create manufacture.');
        errorMessage.value =
            error?.response?.data?.message || 'Failed to create manufacture.';
    }
};

// ---- EDIT LOGIC ----

// open modal & preload fields
const openEdit = (m: Manufacture) => {
    showEditModal.value = true;
    edit_id.value = m.id;
    edit_name.value = m.Products_Manufacture_Name;
    edit_nameAr.value = m.Products_Manufacture_Name_Ar ?? '';
    // we assume backend expects `product_department_id`
    edit_department_id.value = m.department?.id
        ? String(m.department.id)
        : '';
};

// close modal & clear fields
const closeEdit = () => {
    showEditModal.value = false;
    edit_id.value = null;
    edit_name.value = '';
    edit_nameAr.value = '';
    edit_department_id.value = '';
    errorMessage.value = null;
};

// save updated data
const saveEdit = async () => {
    if (!edit_id.value) return;

    errorMessage.value = null;

    try {
        await $axios.post(`/api/productmanufacture/${edit_id.value}`, {
            name: edit_name.value,
            name_ar: edit_nameAr.value,
            product_department_id: edit_department_id.value
        });

        closeEdit();
        await getManufactures();
        flash.success('Manufacture updated successfully.');
    } catch (error: any) {
        flash.error('Failed to update manufacture.');
        errorMessage.value =
            error?.response?.data?.message || 'Failed to update manufacture.';
    }
};

// ---- DELETE LOGIC ----
const deleteManufacture = async (id: number) => {
    const ok = await flash.confirm({
        title: 'Delete manufacture?',
        message: `Are you sure you want to delete "${name}"? This cannot be undone.`,
        confirmText: 'Yes, delete',
        cancelText: 'No, cancel',
    })
    if (!ok) return;

    try {
        const success = await $axios.delete(`/api/productmanufacture/${id}`);

        if (success) {
            flash.success('Manufacture deleted successfully')
        }

        await getManufactures();
    } catch (error) {
        flash.error('Failed to delete manufacture')
    }
};

onMounted(async () => {
    await getManufactures();
    await getProductDepartment();
});
</script>

<template>
    <div class="dashboard-main-body">

        <!-- HEADER / BREADCRUMB -->
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
            <h6 class="fw-semibold mb-0" style="color: #10b981">Create Manufacture</h6>
            <ul class="d-flex align-items-center gap-2">
                <li class="fw-medium">
                    <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
                        <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
                        Dashboard
                    </a>
                </li>
                <li>-</li>
                <li class="fw-medium">Create Manufacture</li>
            </ul>
        </div>

        <!-- CREATE CARD -->
        <div class="card h-100 p-0 radius-12 overflow-hidden mb-24">
            <div class="card-body p-40">
                <form @submit.prevent="submit()" class="row g-4">
                    <div class="row">

                        <div class="col-sm-12">

                            <!-- Department Select -->
                            <div class="mb-20">
                                <label for="departmentSelect"
                                    class="form-label fw-semibold text-primary-light text-sm mb-8">
                                    Department
                                </label>

                                <select class="form-control radius-8" id="departmentSelect"
                                    v-model="Product_Department_Id">
                                    <option value="" disabled>Select Department</option>
                                    <option v-for="department in ProductDepartments" :key="department.id"
                                        :value="department.id">
                                        {{ department.Product_Department_Name }}
                                    </option>
                                </select>
                            </div>

                            <!-- Name Input -->
                            <div class="mb-20">
                                <label for="manufactureName"
                                    class="form-label fw-semibold text-primary-light text-sm mb-8">
                                    Name <span class="text-danger-600">*</span>
                                </label>
                                <input type="text" class="form-control radius-8" id="manufactureName" v-model="name"
                                    placeholder="Enter Manufacture Name">
                            </div>


                            <div class="mb-20">
                                <label for="manufactureName"
                                    class="form-label fw-semibold text-primary-light text-sm mb-8">
                                    Name (Arabic)<span class="text-danger-600">*</span>
                                </label>
                                <input type="text" class="form-control radius-8" id="manufactureName" v-model="nameAr"
                                    placeholder="Enter Manufacture Name in Arabic">
                            </div>

                            <!-- Error message (create) -->
                            <div v-if="errorMessage" class="alert alert-danger py-8 px-12" role="alert">
                                {{ errorMessage }}
                            </div>

                        </div>

                        <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
                            <button type="reset"
                                class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8"
                                @click.prevent="resetCreateForm()">
                                Reset
                            </button>

                            <button type="submit"
                                class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8">
                                Save Change
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
                            <select v-model.number="table.perPage" class="form-select form-select-sm w-auto">
                                <option :value="10">10</option>
                                <option :value="15">15</option>
                                <option :value="20">20</option>
                            </select>


                        </div>
                        <div class="icon-field">
                            <input type="text" class="form-control form-control-sm w-auto" placeholder="Search"
                                v-model="table.search" />
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

                                        <label class="form-check-label" for="checkAll">
                                            S.L
                                        </label>
                                    </div>
                                </th>
                                <th scope="col">Department</th>
                                <th scope="col">Name</th>
                                <th scope="col" class="text-end">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            <!-- loading row -->
                            <tr v-if="loading">
                                <td colspan="4" class="text-center py-24 text-muted">
                                    Loading...
                                </td>
                            </tr>

                            <!-- data rows -->
                            <tr v-for="(manufacture, index) in ProductManufactures" :key="manufacture.id">


                                <td>
                                    <div class="form-check style-check d-flex align-items-center">

                                        <label class="form-check-label" :for="'check-' + manufacture.id">
                                            {{ index + 1 }}
                                        </label>
                                    </div>
                                </td>

                                <td>
                                    <div class="d-flex align-items-center">
                                        <h6 class="text-md mb-0 fw-medium flex-grow-1">
                                            {{ manufacture.department?.Product_Department_Name }}
                                        </h6>
                                    </div>
                                </td>

                                <td>
                                    <div class="d-flex align-items-center">
                                        <h6 class="text-md mb-0 fw-medium flex-grow-1">
                                            {{ manufacture.Products_Manufacture_Name }}
                                        </h6>
                                    </div>
                                </td>

                                <td class="text-end">
                                    <!-- view (placeholder) -->


                                    <!-- edit -->
                                    <a href="javascript:void(0)"
                                        class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center me-1"
                                        title="Edit" @click.prevent="openEdit(manufacture)">
                                        <iconify-icon icon="lucide:edit"></iconify-icon>
                                    </a>

                                    <!-- delete -->
                                    <a href="javascript:void(0)"
                                        class="w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center"
                                        title="Delete" @click="deleteManufacture(manufacture.id)">
                                        <iconify-icon icon="mingcute:delete-2-line"></iconify-icon>
                                    </a>
                                </td>
                            </tr>

                            <!-- empty state -->
                            <tr v-if="!loading && ProductManufactures.length === 0">
                                <td colspan="4" class="text-center py-24 text-muted">
                                    No Manufacturers Found
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

        <!-- EDIT MODAL -->
        <transition name="fade-scale" appear>

            <div v-if="showEditModal" class="modal fade show" style="display:block; background:rgba(0,0,0,0.5);"
                tabindex="-1" role="dialog">
                <div class="modal-dialog modal-dialog-centered" role="document">
                    <div class="modal-content radius-12">
                        <div class="modal-header d-flex justify-content-between align-items-start">
                            <div>
                                <h5 class="modal-title fw-semibold mb-4">Edit Manufacture</h5>
                                <small class="text-muted d-block">Update name or department</small>
                            </div>
                            <button type="button" class="btn-close" aria-label="Close" @click="closeEdit"></button>
                        </div>

                        <div class="modal-body">
                            <!-- Department -->
                            <div class="mb-20">
                                <label for="editDepartmentSelect"
                                    class="form-label fw-semibold text-primary-light text-sm mb-8">
                                    Department
                                </label>


                                <select class="form-control radius-8" id="editDepartmentSelect"
                                    v-model="edit_department_id">
                                    <option value="" disabled>Select Department</option>
                                    <option v-for="dep in ProductDepartments" :key="dep.id" :value="dep.id">
                                        {{ dep.Product_Department_Name }}
                                    </option>
                                </select>
                            </div>

                            <!-- Name -->
                            <div class="mb-20">
                                <label for="editManufactureName"
                                    class="form-label fw-semibold text-primary-light text-sm mb-8">
                                    Name <span class="text-danger-600">*</span>
                                </label>
                                <input type="text" class="form-control radius-8" id="editManufactureName"
                                    v-model="edit_name" placeholder="Enter Manufacture Name">
                            </div>




                            <div class="mb-20">
                                <label for="editManufactureNameAr"
                                    class="form-label fw-semibold text-primary-light text-sm mb-8">
                                    Name (Arabic)<span class="text-danger-600">*</span>
                                </label>
                                <input type="text" class="form-control radius-8" id="editManufactureNameAr"
                                    v-model="edit_nameAr" placeholder="Enter Manufacture Name in Arabic">
                            </div>

                            <!-- error in modal -->
                            <div v-if="errorMessage" class="alert alert-danger py-8 px-12" role="alert">
                                {{ errorMessage }}
                            </div>
                        </div>

                        <div class="modal-footer d-flex justify-content-end gap-2">
                            <button type="button"
                                class="btn border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-24 py-12 radius-8"
                                @click="closeEdit">
                                Cancel
                            </button>
                            <button type="button"
                                class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"
                                @click="saveEdit">
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </transition>

        <!-- /EDIT MODAL -->

    </div>
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
