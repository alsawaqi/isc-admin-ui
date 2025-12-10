<script setup lang="ts">
import { useParam, useNuxtApp, navigateTo, definePageMeta } from '#imports';


definePageMeta({
     layout: 'admin',
     middleware: ['permission'],
     permissions: 'departments'
     
    });

    import {ref , onMounted} from 'vue';
   const { $axios } = (useNuxtApp() as any);

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


    const complete = async() => {
      try{

       const response = await $axios.post(`/api/orders-placed/complete/${Orders_Id}`);
         console.log('Order completed successfully:', response.data);
         navigateTo('/admin/orders/ordersshipment')
      }catch(error){
         console.error('Failed to complete order:', error);
      }
            
       

    }


    onMounted(async()=>{
       await getorders();
    
    });





</script>


<template>

      <div class="dashboard-main-body">

  <!-- Page header / breadcrumbs -->
  <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
    <div>
      <h6 class="fw-semibold mb-1">Shipment — Complete</h6>
      <div class="small text-muted">
        Invoice <span class="fw-semibold">#{{ orders.Transaction_Number || '-' }}</span>
        <span class="ms-2">Issued: {{ orders.created_at }}</span>
      </div>
    </div>
    <ul class="d-flex align-items-center gap-2 small mb-0">
      <li class="fw-medium">
        <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
          <iconify-icon icon="solar:home-smile-angle-outline" class="icon fs-5"></iconify-icon>
          Dashboard
        </NuxtLink>
      </li>
      <li>•</li>
      <li class="fw-medium text-muted">Invoice</li>
    </ul>
  </div>

  <div class="card border-0 shadow-sm">
    <!-- Actions -->
    <div class="card-header bg-white border-0 py-3">
      <div class="d-flex flex-wrap align-items-center justify-content-end gap-2">
        
        <button type="button" class="btn btn-sm btn-danger d-inline-flex align-items-center gap-1" onclick="printInvoice()">
          <iconify-icon icon="basil:printer-outline" class="fs-5"></iconify-icon>
          Print
        </button>
        <button type="button" class="btn btn-sm btn-outline-success" @click.prevent="complete">
          Complete
        </button>
      </div>
    </div>

    <div class="card-body py-4">
      <div id="invoice" class="mx-auto" style="max-width: 980px;">
        <div class="border rounded-3 overflow-hidden">
          <!-- Meta -->
          <div class="p-4 border-bottom bg-light">
            <div class="d-flex justify-content-between align-items-start gap-3">
              <div>
                <h3 class="h5 mb-1">Invoice <span class="text-muted">#{{ orders.Transaction_Number }}</span></h3>
                <div class="small text-muted">Date Issued: {{ orders.created_at }}</div>
              </div>
              <div class="text-end">
                <!-- Optional logo -->
                <!-- <img src="/logo.png" alt="Logo" class="img-fluid mb-1" style="max-height:48px;"> -->
              </div>
            </div>
          </div>

          <!-- Parties / quick totals -->
          <div class="p-4">
            <div class="row g-3 mb-3">
              <div class="col-md-7">
                <h6 class="text-uppercase text-muted small mb-2">Issued For</h6>
                <div class="border rounded-3 p-3">
                  <div class="fw-semibold">{{ orders.customer_contact?.Contact_Person_Name || '-' }}</div>
                  <div class="small text-muted">{{ orders.customer_contact?.Designation || '-' }}</div>
                  <div class="small text-muted">{{ orders.customer_contact?.Telephone || '-' }}</div>
                </div>
              </div>
              <div class="col-md-5">
                <h6 class="text-uppercase text-muted small mb-2">Summary</h6>
                <div class="border rounded-3 p-3">
                  <div class="d-flex justify-content-between small mb-1">
                    <span class="text-muted">Total Weight</span>
                    <span class="fw-semibold">{{ orders.Shipping_Weight_Kg }} kg</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Items -->
            <div class="table-responsive rounded-3 border">
              <table class="table table-hover table-striped align-middle mb-0">
                <thead class="table-light">
                  <tr class="text-muted text-uppercase small">
                    <th style="width:56px;">SL.</th>
                    <th>Items</th>
                    <th class="text-center" style="width:90px;">Qty</th>
                    <th class="text-end" style="width:140px;">Unit Price</th>
                    <th class="text-end" style="width:140px;">Price</th>
                    
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(order, index) in orders.orderlist" :key="order.id">
                    <td class="text-muted">{{ index + 1 }}</td>
                    <td class="fw-semibold">{{ order.product?.Product_Name }}</td>
                    <td class="text-center">{{ order.Quantity }}</td>
                    <td class="text-end">OMR {{ Number(order.Price || 0).toFixed(3) }}</td>
                    <td class="text-end">OMR {{ Number(order.Subtotal || 0).toFixed(3) }}</td>
                    
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Footer totals -->
            <div class="d-flex flex-wrap justify-content-between align-items-center mt-3">
              <div class="small text-muted">Thanks for your business.</div>
              <div class="fs-6">
                <span class="text-muted me-2">Total:</span>
                <span class="fw-semibold">OMR {{ Number(orders.Total_Price || 0).toFixed(3) }}</span>
              </div>
            </div>
          </div>

          <!-- Note -->
          <div class="px-4 py-3 bg-light border-top small text-muted d-flex justify-content-between flex-wrap gap-2">
            <div>Invoice was created electronically and is valid without a signature or seal.</div>
            <div>Kasr Althqt LTljart EST</div>
          </div>
        </div>
      </div>
    </div>
  </div>

</div>

</template>