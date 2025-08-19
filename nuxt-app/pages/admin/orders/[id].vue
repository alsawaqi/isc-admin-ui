<script setup lang="ts">
definePageMeta({
     layout: 'admin',
     middleware: ['permission'],
     permissions: 'departments'
     
    });

    import {ref , onMounted} from 'vue';
   const { $axios } = useNuxtApp();

    const Orders_Id = useParam('id');

    const orders = ref<any>([]);


    const getorders = async () => {
      try {
      
        const response = await $axios.get(`/api/orders-placed/${Orders_Id}`);
        orders.value = response.data;
        console.log('Orders fetched successfully:', orders.value);
      } catch (error) {
        console.error('Failed to fetch order details:', error);
        return null;
      }
    };


    const packing = async() => {
      try{

       const response = await $axios.get(`/api/orders-placed/pack/${Orders_Id}`);
         console.log('Order packed successfully:', response.data);
         navigateTo('/admin/orders/orderspacking')
      }catch(error){
         console.error('Failed to pack order:', error);
      }
            
       

    }


    onMounted(async()=>{
       await getorders();
    
    });





</script>


<template>

      <div class="dashboard-main-body">

    <div class="flex flex-wrap items-center justify-between gap-2 mb-6">
  <h6 class="font-semibold mb-0 dark:text-white">Invoice List</h6>
  <ul class="flex items-center gap-[6px]">
    <li class="font-medium">
      <a href="index.html" class="flex items-center gap-2 hover:text-primary-600 dark:text-white">
        <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
        Dashboard
      </a>
    </li>
    <li class="dark:text-white">-</li>
    <li class="font-medium dark:text-white">Invoice List</li>
  </ul>
</div>
    
    <div class="card border-0">
      <div class="card-header">
        <div class="flex flex-wrap items-center justify-end gap-2">
          <a href="javascript:void(0)" class="btn btn-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg inline-flex items-center gap-1">
            <iconify-icon icon="pepicons-pencil:paper-plane" class="text-xl"></iconify-icon>
            Send Invoice
          </a>
          <a href="javascript:void(0)" class="btn btn-sm bg-warning-600 hover:bg-warning-700 text-white rounded-lg inline-flex items-center gap-1">
            <iconify-icon icon="solar:download-linear" class="text-xl"></iconify-icon>
            Download
          </a>
          <a href="javascript:void(0)" class="btn btn-sm bg-success-600 hover:bg-success-700 text-white rounded-lg inline-flex items-center gap-1">
            <iconify-icon icon="uil:edit" class="text-xl"></iconify-icon>
            Edit
          </a>
          <button type="button" class="btn btn-sm bg-danger-600 hover:bg-danger-700 text-white rounded-lg inline-flex items-center gap-1" onclick="printInvoice()">
            <iconify-icon icon="basil:printer-outline" class="text-xl"></iconify-icon>
            Print
          </button>

          <button type="button" class="btn btn-sm bg-success-600" @click.prevent="packing">

             Packing
          </button>
        </div>
      </div>
      <div class="card-body py-[60px]">
        <div class="grid grid-cols-1" id="invoice">
          <div class="max-w-[1174px] mx-auto w-full">
            <div class="shadow-4 border border-neutral-200 dark:border-neutral-600 rounded-lg">
              <div class="p-5 flex flex-wrap justify-between gap-3 border-b border-neutral-200 dark:border-neutral-600">
                <div>
                  <h3 class="text-xl">Invoice #{{ orders.Transaction_Number}}</h3>
                  <p class="mb-1 text-sm">Date Issued:  {{ orders.created_at }}</p>
   
                </div>
                <div>
                  <img src="#" alt="image" class="mb-2">
                  
                </div>
              </div>
              <div class="py-7 px-5">
                <div class="flex flex-wrap justify-between align-items-end gap-3">
                  <div>
                    <h6 class="text-base">Issus For:</h6>
                    <table class="text-sm text-secondary-light">
                      <tbody>
                        <tr>
                          <td>Name</td>
                          <td class="ps-2">:{{ orders.customer_contact?.Contact_Person_Name }}</td>
                        </tr>
                        <tr>
                          <td>Address</td>
                          <td class="ps-2">:{{ orders.customer_contact?.Designation }}</td>
                        </tr>
                        <tr>
                          <td>Phone number</td>
                          <td class="ps-2">:{{ orders.customer_contact?.Telephone }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <table class="text-sm text-secondary-light">
                      <tbody>
                        <tr>
                          <td>Issus Date</td>
                          <td class="ps-2">:25 Jan 2024</td>
                        </tr>
                        <tr>
                          <td>Order ID</td>
                          <td class="ps-2">:#653214</td>
                        </tr>
                        <tr>
                          <td>Shipment ID</td>
                          <td class="ps-2">:#965215</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div class="mt-6">
                  <div class="table-responsive scroll-sm">
                    <table class="table bordered-table text-sm">
                      <thead>
                        <tr>
                          <th scope="col" class="text-sm">SL.</th>
                          <th scope="col" class="text-sm">Items</th>
                          <th scope="col" class="text-sm">Qty</th>
                          
                          <th scope="col" class="text-sm">Unit Price </th>
                          <th scope="col" class="text-end text-sm">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(order,index) in orders.orderlist" :key="order.id">
                          <td>{{ index + 1 }}</td>
                          <td>{{ order.product?.Product_Name }}</td>
                          <td>{{ order.Quantity}}</td>

                          <td>{{ order.Price }} OMR</td>
                          <td class="text-end">{{ order.Subtotal}} OMR</td>
                        </tr>
                        
                         
                        
                      </tbody>
                    </table>
                  </div>
                  <div class="flex flex-wrap justify-between gap-3">
                    <div>
                
                      <p class="text-sm mb-0">Thanks for your business</p>
                    </div>
                    <div>
                      <table class="text-sm">
                        <tbody>
                         
                          <tr>
                            <td class="pe-[64px] pt-4">
                              <span class="text-neutral-600 dark:text-neutral-200 font-semibold">Total:</span>
                            </td>
                            <td class="ps-6 pt-4">
                              <span class="text-neutral-600 dark:text-neutral-200 font-semibold">$1690</span>
                            </td>
                            </tr>
                        
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div class="mt-16">
            
                </div>

              
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
  </div>
</template>