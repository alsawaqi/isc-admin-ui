<script setup lang="ts">
import { definePageMeta, useNuxtApp } from '#imports';
import { ref, onMounted, reactive, watch } from 'vue';

definePageMeta({
    layout: 'admin',
    middleware: ['permission'],
    permissions: 'departments'

});

const { $axios } = (useNuxtApp() as any);

interface CustomerType {
    id: number;
    Customer_Type_Name: string;
    Customer_Type_Name_Ar: string;
    Customer_Type_Description: string;
    created_at: string;
}

const customerTypes = ref<CustomerType[]>([]);
const isLoading = ref<boolean>(false);
const CustomerTypeName = ref<string>('');
const CustomerTypeNameAr = ref<string>('');
const CustomerTypeDescription = ref<string>('');
const successMessage = ref<boolean>(false);
const errorMessage = ref<string>('');
const isSubmitting = ref<boolean>(false);
const showEdit = ref<boolean>(false);
const savingEdit = ref<boolean>(false);


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


const EditCustomer = reactive<CustomerType>({
    id: 0,
    Customer_Type_Name: '',
    Customer_Type_Name_Ar: '',
    Customer_Type_Description: '',
    created_at: ''
});



const getCustomerTypes = async (): Promise<void> => {
    isLoading.value = true;
    try {
        const { data } = await $axios.get('/api/customer-types', {
            params: {
                page: table.page,
                per_page: table.perPage,
                search: table.search,
                sort_by: table.sortBy,
                sort_dir: table.sortDir,
            },
        });

        customerTypes.value = data.data;
        pagination.value = {
            total: data.total,
            from: data.from,
            to: data.to,
            last_page: data.last_page,
        };
    } catch (error) {
    
    } finally {
        isLoading.value = false;
    }
};

const submitCustomerType = async (): Promise<void> => {

    isSubmitting.value = true;

    try {
        const payload = {
            Customer_Type_Name: CustomerTypeName.value,
            Customer_Type_Name_Ar: CustomerTypeNameAr.value,
            Customer_Type_Description: CustomerTypeDescription.value
        };

        const response = await $axios.post('/api/customer-types', payload);
      
        successMessage.value = true;
        errorMessage.value = '';
        CustomerTypeName.value = '';
        CustomerTypeNameAr.value = '';
        CustomerTypeDescription.value = '';
        await getCustomerTypes();

    } catch (error) {
        console.error('Error creating customer type:', error);
        errorMessage.value = 'Failed to create customer type.';
    } finally {
        isSubmitting.value = false;
    }


}


const closeEdit = () => {
    showEdit.value = false;
    errorMessage.value = '';
    EditCustomer.id = 0;
    EditCustomer.Customer_Type_Name = '';
    EditCustomer.Customer_Type_Name_Ar = '';
    EditCustomer.Customer_Type_Description = '';
    EditCustomer.created_at = '';
}


const openEdit = (customerType: CustomerType) => {
    showEdit.value = true;
    EditCustomer.id = customerType.id;
    EditCustomer.Customer_Type_Name = customerType.Customer_Type_Name;
    EditCustomer.Customer_Type_Name_Ar = customerType.Customer_Type_Name_Ar;
    EditCustomer.Customer_Type_Description = customerType.Customer_Type_Description;
    EditCustomer.created_at = customerType.created_at;

}



const saveEdit = async () => {

    savingEdit.value = true;
    try {
        const payload = {
            Customer_Type_Name: EditCustomer.Customer_Type_Name,
            Customer_Type_Name_Ar: EditCustomer.Customer_Type_Name_Ar,
            Customer_Type_Description: EditCustomer.Customer_Type_Description
        };

        const response = await $axios.put(`/api/customer-types/${EditCustomer.id}`, payload);
     
        await getCustomerTypes();
        closeEdit();
    } catch (error) {
        console.error('Error updating customer type:', error);
        errorMessage.value = 'Failed to update customer type.';
    } finally {
        savingEdit.value = false;
    }
};

const deleteCustomerType = async (id: number) => {
    const confirmed = confirm('Are you sure you want to delete this customer type?');
    if (!confirmed) return;

    try {
        await $axios.delete(`/api/customer-types/${id}`);
        console.log('Customer type deleted');
        await getCustomerTypes();
    } catch (error) {
        console.error('Error deleting customer type:', error);
    }
};




onMounted(async (): Promise<void> => {
    await getCustomerTypes();
});

watch(
  () => [table.page, table.perPage, table.search, table.sortBy, table.sortDir],
  async () => {
    await getCustomerTypes();
  }
);

</script>
<template>


    <div class="dashboard-main-body">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
            <h6 class="fw-semibold mb-0" style="color: #6b8629">Customer Type</h6>
            <ul class="d-flex align-items-center gap-2">
                <li class="fw-medium">
                    <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
                        <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
                        Dashboard
                    </a>
                </li>
                <li>-</li>
                <li class="fw-medium">Customer Type</li>
            </ul>
        </div>



        <div class="card h-100 p-0 radius-12 overflow-hidden">
            <div class="card-body p-40">
                <form @submit.prevent="submitCustomerType()">
                    <div class="row">

                        <div class="col-sm-12">
                            <div class="mb-20">
                                <label for="address" class="form-label fw-semibold text-primary-light text-sm mb-8">
                                    Customer Type Name* <span class="text-danger-600">*</span></label>
                                <input type="text" v-model="CustomerTypeName" class="form-control radius-8" id="address"
                                    placeholder="Enter Customer Type Name" required>
                            </div>



                        </div>

                        <div class="col-sm-12">
                            <div class="mb-20">
                                <label for="address" class="form-label fw-semibold text-primary-light text-sm mb-8">
                                    Customer Type Name Arabic* <span class="text-danger-600">*</span></label>
                                <input type="text" v-model="CustomerTypeNameAr" class="form-control radius-8"
                                    id="address" placeholder="Enter Customer Type Name Arabic" required>
                            </div>



                        </div>


                        <div class="col-sm-12">
                            <div class="mb-20">
                                <label for="address" class="form-label fw-semibold text-primary-light text-sm mb-8">
                                    Descripition* <span class="text-danger-600">*</span></label>
                                <input type="text" v-model="CustomerTypeDescription" class="form-control radius-8"
                                    id="address" placeholder="Enter Customer Type Description">
                            </div>



                        </div>
                        <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
                            <button type="reset"
                                class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8">
                                Reset
                            </button>
                            <button type="submit"
                                class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"
                                :disable="isSubmitting">
                                <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"
                                    aria-hidden="true"></span>
                                Save Change
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>







    </div>


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




                    <div class="spinner-border" role="status" v-if="isLoading">
                        <span class="sr-only">Loading...</span>
                    </div>


                    <table class="table bordered-table mb-0" v-else>
                        <thead>
                            <tr>
                                <th scope="col">
                                    <div class="form-check style-check d-flex align-items-center">

                                        <label class="form-check-label" for="checkAll">
                                            S.L
                                        </label>
                                    </div>
                                </th>

                                <th scope="col">Customer Type Name</th>
                                <th scope="col">Customer Type Description</th>


                                <th scope="col">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(type, index) in customerTypes" :key="type.id">
                                <td>
                                    <div class="form-check style-check d-flex align-items-center">
                                        {{ index + 1 }}
                                    </div>
                                </td>
                                <td>{{ type.Customer_Type_Name }}</td>
                                <td>{{ type.Customer_Type_Description }}</td>
                                <td>

                                    <a @click.prevent="openEdit(type)"
                                        class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center">
                                        <iconify-icon icon="lucide:edit"></iconify-icon>
                                    </a>
                                    <a @click.prevent="deleteCustomerType(type.id)"
                                        class="w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center">
                                        <iconify-icon icon="mingcute:delete-2-line"></iconify-icon>
                                    </a>
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
                        <h5 class="fw-semibold mb-4">Edit Customer Type</h5>

                    </div>
                    <button type="button" class="btn-close" aria-label="Close" @click="closeEdit"></button>
                </div>

                <!-- body -->
                <div>
                    <div class="mb-16">
                        <label for="editCountryName" class="form-label fw-semibold text-primary-light text-sm mb-8">
                            Customer Type Name <span class="text-danger-600">*</span>
                        </label>
                        <input id="editCountryName" type="text" class="form-control radius-8"
                            v-model="EditCustomer.Customer_Type_Name" placeholder="Country Name">
                    </div>


                    <div class="mb-16">
                        <label for="editCountryName" class="form-label fw-semibold text-primary-light text-sm mb-8">
                            Customer Type Name <span class="text-danger-600">*</span>
                        </label>
                        <input id="editCountryName" type="text" class="form-control radius-8"
                            v-model="EditCustomer.Customer_Type_Name_Ar" placeholder="Country Name">
                    </div>

                    <div class="mb-16">
                        <label for="editCountryNameAr" class="form-label fw-semibold text-primary-light text-sm mb-8">
                            Customer Type Description
                        </label>
                        <input id="editCountryNameAr" type="text" class="form-control radius-8"
                            v-model="EditCustomer.Customer_Type_Description" dir="auto">
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