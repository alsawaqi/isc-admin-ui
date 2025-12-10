<script lang="ts" setup>
import { useNuxtApp, definePageMeta } from '#imports';
import { ref, onMounted,reactive, watch } from 'vue';

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'departments'
})
const { $axios } = (useNuxtApp() as any);

interface Department {
  id: number;
  Department_Name: string;
  Department_Initials: string;
  // Add other fields as necessary
}

const departments = ref<Department[]>([]);
const departmentName = ref<string>('');
const departmentInitials = ref<string>('');
const isSubmit = ref<boolean>(false);
const isLoading = ref<boolean>(false);


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



const getDepartments = async () => {
    isLoading.value = true;
  try {
    const { data } = await $axios.get('/api/contact/departments', {

            params: {
                page: table.page,
                per_page: table.perPage,
                search: table.search,
                sort_by: table.sortBy,
                sort_dir: table.sortDir,
            },
        })

    departments.value = data.data;
    pagination.value = {
        total: data.total,
        from: data.from,
        to: data.to,
        last_page: data.last_page,
    }
 
  } catch (error) {
    console.error('Failed to fetch departments:', error);
  } finally {
    isLoading.value = false;
  }
};

const Submit = async () => {
  isSubmit.value = true;
  try {
    await $axios.post('/api/contact/departments', {
      Department_Name: departmentName.value,
      Department_Initials: departmentInitials.value,
    });
  
    departmentName.value = '';
    departmentInitials.value = '';
    await getDepartments();
  
  } catch (error) {
    console.error('Failed to create department:', error);
  } finally {
    isSubmit.value = false;
  }
};


watch(
    () => [table.page, table.perPage, table.search, table.sortBy, table.sortDir],
    async () => {
        await getDepartments();
    }
);



onMounted(async () => {
  await getDepartments();
});

</script>


<template>

 <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 class="fw-semibold mb-0" style="color: #6b8629">Contact Department</h6>
        <ul class="d-flex align-items-center gap-2">
            <li class="fw-medium">
                <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
                    <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
                    Dashboard
                </a>
            </li>
            <li>-</li>
            <li class="fw-medium">Contact Department</li>
        </ul>
    </div>



    <div class="card h-100 p-0 radius-12 overflow-hidden">
        <div class="card-body p-40">
            <form @submit.prevent="Submit()">
                <div class="row">

                    <div class="col-sm-12">
                        <div class="mb-20">
                            <label for="address" class="form-label fw-semibold text-primary-light text-sm mb-8"> Name* <span class="text-danger-600">*</span></label>
                            <input type="text" v-model="departmentName" class="form-control radius-8" id="address" placeholder="Enter Department Name" required>
                        </div>


                       
                    </div>


                     <div class="col-sm-12">
                        <div class="mb-20">
                            <label for="address" class="form-label fw-semibold text-primary-light text-sm mb-8"> Initials* <span class="text-danger-600">*</span></label>
                            <input type="text" v-model="departmentInitials" class="form-control radius-8" id="address" placeholder="Enter Department Initials" required>
                        </div>


                       
                    </div>
                    <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
                        <button type="reset" class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8">
                            Reset
                        </button>
                        <button type="submit"  class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8" :disable="isSubmit">
                            <span v-if="isSubmit" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
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
                        <input v-model="table.search" type="text" name="#0" class="form-control form-control-sm w-auto" placeholder="Search">
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
                                    <input class="form-check-input" type="checkbox" value="" id="checkAll">
                                    <label class="form-check-label" for="checkAll">
                                        S.L
                                    </label>
                                </div>
                            </th>

                            <th scope="col">Name</th>
                            <th scope="col">Initials</th>


                            <th scope="col">Action</th>
                        </tr>
                    </thead>
                     <tbody>
                                <tr v-for="(dept, index) in departments" :key="dept.id">
                                    <td>
                                    <div class="form-check style-check d-flex align-items-center">
                                        <input class="form-check-input" type="checkbox" :id="'check-' + dept.id" />
                                        <label class="form-check-label" :for="'check-' + dept.id">
                                        {{ index + 1 }}
                                        </label>
                                    </div>
                                    </td>

                                    <td>
                                        {{ dept.Department_Name || '-' }}
                                    </td>

                                    <td>
                                        {{ dept.Department_Initials|| '-' }}
                                    </td>

                                    <td>
                                    
                                    <a href="javascript:void(0)" class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center">
                                        <iconify-icon icon="lucide:edit"></iconify-icon>
                                    </a>
                                    <a class="w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center">
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

    
</template>