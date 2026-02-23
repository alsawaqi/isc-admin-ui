<script setup lang="ts">
import {useRoute,useNuxtApp} from '#imports';
import { NuxtLink } from '#components';
import { useAdminUI } from '~/composables/useAdminUI'
import { useAuth } from '~/stores/auth'
import { onMounted,computed,ref } from 'vue';

 
useAdminUI()

 
const auth = useAuth()

const nuxtApp = useNuxtApp()

const { $axios } = (nuxtApp as any);

const hasPermission = (perm: string) => auth.permissions.includes(perm)


const route = useRoute();

const isDisabling = ref<boolean>(false)
const disableError = ref<string | null>(null)

const isActive = (path: string) => {
  return route.path === path;
};


const isAnyChildActive = (paths: string[]) => {
  return paths.some(path => isActive(path));
};

const getActiveColor = (path: string): string => {
  const colorMap: Record<string, string> = {
    // Categories / Products Features
    '/admin/categories': 'color: #6b8629;',
    '/admin/categories/subcategory': 'color: #73da1b;',
    '/admin/categories/subsubcategory': 'color: #41a5e3;',
    '/admin/categories/addproductsdescription': 'color: #4345e3;',
    '/admin/categories/viewproductdescription': 'color: #14b8a6;', // NEW

    // Product section
    '/admin/product/producttype': 'color: #f97316;',
    '/admin/product/brands': 'color: #eab308;',
    '/admin/product/manufacture': 'color: #10b981;',
    '/admin/product': 'color: #8b5676;',
    '/admin/product/viewproducts': 'color: #ef4444;',

    // Orders
    '/admin/orders/ordersplaced': 'color: #a855f7;', // NEW

    // Admin / Roles / Users
    '/admin/roles/createadmin': 'color: #6366f1;',
    '/admin/roles/roles-permission': 'color: #f43f5e;',
    '/admin/roles/': 'color: #0ea5e9;',
    '/admin/users': 'color: #22c55e;',

    // Geography
    '/admin/geography/country': 'color: #facc15;',   // NEW
    '/admin/geography/region': 'color: #4ade80;',    // NEW
    '/admin/geography/districts': 'color: #7c3aed;', // NEW
    '/admin/geography/city': 'color: #fb7185;',      // NEW

    // Shipping
    '/admin/shipping/shippers-create': 'color: #0f766e;', // NEW
    '/admin/shipping/shippers': 'color: #fbbf24;',        // NEW
    '/admin/vender': 'color: #fbbf24;',        // NEW
    '/admin/vender/user': 'color: #fbbf24;',        // NEW
  }

  // fallback color
  return colorMap[path] || 'color: #17a2b8;'
}


// Popup state
const showNotificationDialog = ref(false)
const isEnabling = ref(false)
const errorMessage = ref<string | null>(null)

const canUseNotifications = computed(() => {
  if (process.server) return false
  return typeof window !== 'undefined' && 'Notification' in window
})

 
// Collect basic device info from browser
const parseBrowserInfo = (ua: string) => {
  ua = ua || ''

  // Order matters (Edge before Chrome, etc.)
  if (ua.includes('Edg/')) {
    const match = ua.match(/Edg\/([\d.]+)/)
    return { name: 'Edge', version: match?.[1] || null }
  }

  if (ua.includes('OPR/') || ua.includes('Opera')) {
    const match = ua.match(/OPR\/([\d.]+)/) || ua.match(/Opera\/([\d.]+)/)
    return { name: 'Opera', version: match?.[1] || null }
  }

  if (ua.includes('Chrome/')) {
    const match = ua.match(/Chrome\/([\d.]+)/)
    return { name: 'Chrome', version: match?.[1] || null }
  }

  if (ua.includes('Firefox/')) {
    const match = ua.match(/Firefox\/([\d.]+)/)
    return { name: 'Firefox', version: match?.[1] || null }
  }

  if (ua.includes('Safari/') && ua.includes('Version/')) {
    const match = ua.match(/Version\/([\d.]+)/)
    return { name: 'Safari', version: match?.[1] || null }
  }

  return { name: null, version: null }
}

const parseOSInfo = (ua: string) => {
  ua = ua || ''

  if (ua.includes('Windows NT 10.0')) {
    return { name: 'Windows', version: '10' }
  }
  if (ua.includes('Windows NT 6.3')) {
    return { name: 'Windows', version: '8.1' }
  }
  if (ua.includes('Windows NT 6.2')) {
    return { name: 'Windows', version: '8' }
  }
  if (ua.includes('Windows NT 6.1')) {
    return { name: 'Windows', version: '7' }
  }

  if (ua.includes('Mac OS X')) {
    const match = ua.match(/Mac OS X ([\d_]+)/)
    return {
      name: 'macOS',
      version: match?.[1]?.replace(/_/g, '.') || null,
    }
  }

  if (ua.includes('Android')) {
    const match = ua.match(/Android ([\d.]+)/)
    return {
      name: 'Android',
      version: match?.[1] || null,
    }
  }

  if (ua.includes('iPhone OS') || ua.includes('iPad; CPU OS')) {
    const match = ua.match(/OS ([\d_]+)/)
    return {
      name: 'iOS',
      version: match?.[1]?.replace(/_/g, '.') || null,
    }
  }

  return { name: null, version: null }
}

const buildDevicePayload = async (deviceId: string) => {
  if (!process.client) return null

  const ua = navigator.userAgent || ''
  const platform =
    // @ts-ignore
    (navigator.userAgentData && navigator.userAgentData.platform) ||
    navigator.platform ||
    'unknown'

  const browser = parseBrowserInfo(ua)
  const os = parseOSInfo(ua)

  return {
    device_id: deviceId,
    device_name: `${browser.name || 'Browser'} on ${os.name || platform}`,
    browser_name: browser.name,
    browser_version: browser.version,
    os_name: os.name || platform,
    os_version: os.version,
    user_agent: ua,
  }
}

 

const registerDeviceOnBackend = async (deviceId: string) => {
  const payload = await buildDevicePayload(deviceId)
  if (!payload) return

  try {
    // assuming you have $axios plugin already
    // adjust URL if your admin API uses prefix
    // @ts-ignore
 


    await $axios.post('/api/notification-devices', payload)
    console.log('📡 Device registered in backend')
  } catch (err) {
    console.error('Failed to register notification device', err)
    // we don't block notifications for this; just log
  }
}

const enableNotifications = async () => {
  if (!hasPermission('orders placed')) {
    console.warn('User does not have permission to enable notifications')
    errorMessage.value = 'You do not have permission to enable order notifications.'
    return
  }

  if (!canUseNotifications.value) {
    errorMessage.value = 'This browser does not support notifications.'
    return
  }

  const beams = nuxtApp.$beams
  if (!beams) {
    console.warn('Beams client not ready')
    errorMessage.value = 'Notifications system not ready. Please try again later.'
    return
  }

  try {
    isEnabling.value = true
    errorMessage.value = null

    // Start Beams
    await beams.start()

    // Get Beams internal device ID
    const deviceId: string | null = await beams.getDeviceId()
    if (!deviceId) {
      console.warn('Beams deviceId is null')
      errorMessage.value = 'Could not register this device for notifications.'
      return
    }

    // Subscribe to interest
    await beams.addDeviceInterest('admins')
    console.log('✅ Subscribed to "admins" interest')

    // Register in your own DB
    await registerDeviceOnBackend(deviceId)

    showNotificationDialog.value = false
  } catch (error) {
    console.error('❌ Beams error', error)
    if (typeof Notification !== 'undefined') {
      console.log('Notification permission:', Notification.permission)
    }
    errorMessage.value = 'Could not enable notifications. Please check browser permissions.'
  } finally {
    isEnabling.value = false
  }
}

// Dialog button handlers
const onAcceptClick = async () => {
  await enableNotifications()
}

const onDeclineClick = () => {
  showNotificationDialog.value = false
  // Optional: call backend to record that user declined, if you want
}
 


const disableNotificationsOnThisBrowser = async () => {
  const beams = nuxtApp.$beams
  // @ts-ignore
  

  if (!beams) {
    console.warn('Beams client not ready')
    disableError.value = 'Notifications client is not ready.'
    return
  }

  if (!canUseNotifications.value) {
    disableError.value = 'This browser does not support notifications.'
    return
  }

  try {
    isDisabling.value = true
    disableError.value = null

    // 1) Get the Beams device id for THIS browser
    const deviceId = await beams.getDeviceId()
    if (!deviceId) {
      disableError.value = 'Could not find device id for this browser.'
      return
    }

    // 2) Stop Beams on this device (removes state locally and remotely)
    await beams.stop()
    console.log('🔕 Beams stopped on this browser')

    // 3) Tell backend to disable / delete this device record
    await $axios.post('/api/notification-devices/disable', {
      device_id: deviceId,
    })

    console.log('📡 Device disabled in backend')

    // Optionally hide the popup / toggle UI
    showNotificationDialog.value = false
  } catch (e) {
    console.error('Failed to disable notifications', e)
    disableError.value = 'Could not disable notifications on this browser.'
  } finally {
    isDisabling.value = false
  }
}


onMounted(async () => {
  if (!canUseNotifications.value) return

  // User does NOT have permission anymore
  if (!hasPermission('orders placed')) {
    // If this browser was previously registered, clean it up
    try {
      await disableNotificationsOnThisBrowser()
    } catch (e) {
      console.error('Failed to disable notifications for this browser', e)
    }
    return
  }

  // User *does* have permission -> show popup only if browser hasn't decided yet
  if (Notification.permission === 'default') {
    showNotificationDialog.value = true
  }
})

</script>

<template>
<aside class="sidebar">
    <button type="button" class="sidebar-close-btn !mt-4">
      <iconify-icon icon="radix-icons:cross-2"></iconify-icon>
    </button>

    <div>
      <NuxtLink
    to="/admin" class="sidebar-logo">
        <img src="/logo.jpg" alt="site logo" class="light-logo">
        <img src="/logo.jpg" alt="site logo" class="dark-logo">
        <img src="/logo.jpg" alt="site logo" class="logo-icon">
      </NuxtLink>
    </div>

    <div class="sidebar-menu-area">
         <ul id="sidebar-menu" class="tree">

                <!-- Dashboard --------------------------------------------------- -->
                <li class="has-child">
                  <a href="javascript:void(0)">
                    <iconify-icon icon="solar:home-smile-angle-outline" class="menu-icon"></iconify-icon>
                    Dashboard
                  </a>
                  <ul class="open" style="display: block;">
                    <li><NuxtLink  to="/admin">Status</NuxtLink></li>
                  </ul>
                </li>

                
            <!-- Products -->
            <li v-if="hasPermission('products')" class="has-child">
              <a href="javascript:void(0)">Products</a>
              <ul class="open" style="display: block;">
                <li v-if="hasPermission('product category')" class="has-child">
                  <a href="javascript:void(0)"
                  :style="isAnyChildActive(['/admin/categories', '/admin/categories/subcategory', '/admin/categories/subsubcategory'])
                      ? getActiveColor(route.path)
                      : ''">
                       Product Departments</a>
                 <ul>
                        <li v-if="hasPermission('departments')" class="text-blue-600">
                    <NuxtLink to="/admin/categories"
                      :style="isActive('/admin/categories') ? getActiveColor('/admin/categories') : 'color: #17a2b8;'">
                    Departments
                    </NuxtLink>
                        </li>

                    <li v-if="hasPermission('sub departments')">
                      <NuxtLink to="/admin/categories/subcategory"
                      :style="isActive('/admin/categories/subcategory') ? getActiveColor('/admin/categories/subcategory') : 'color: #17a2b8;'"
                          >
                      Sub Departments
                      
                      </NuxtLink>
                    </li>

                    <li
                      v-if="hasPermission('sub sub departments')"
                    >
                      <NuxtLink
                            to="/admin/categories/subsubcategory"
                            :style="isActive('/admin/categories/subsubcategory') ? getActiveColor('/admin/categories/subsubcategory') : 'color: #17a2b8;'"
                          >
                            Sub Sub Departments
                          </NuxtLink>
                      </li>



                      <li v-if="hasPermission('addproductsdescription')">
                      <NuxtLink
                            to="/admin/categories/addproductsdescription"
                            :style="isActive('/admin/categories/addproductsdescription') ? getActiveColor('/admin/categories/addproductsdescription') : 'color: #17a2b8;'"
                          >
                            Products Features
                          </NuxtLink>
                      </li>



                      <li>
                      <NuxtLink
                            to="/admin/categories/viewproductdescription"
                            :style="isActive('/admin/categories/viewproductdescription') ? getActiveColor('/admin/categories/viewproductdescription') : 'color: #17a2b8;'"
                          >
                            View Products Features
                          </NuxtLink>
                      </li>


          
                  </ul>
                </li>

                <!-- Product Types to Activation -->
        <li v-if="hasPermission('product types')">
          <NuxtLink
            to="/admin/product/producttype"
            :style="isActive('/admin/product/producttype') ? getActiveColor('/admin/product/producttype') : ''"
          >
            Product Types
          </NuxtLink>
        </li>

        <li v-if="hasPermission('product brands')">
          <NuxtLink
            to="/admin/product/brands"
            :style="isActive('/admin/product/brands') ? getActiveColor('/admin/product/brands') : ''"
          >
            Product Brands
          </NuxtLink>
        </li>

        <li v-if="hasPermission('product manufacture')">
          <NuxtLink
            to="/admin/product/manufacture"
            :style="isActive('/admin/product/manufacture') ? getActiveColor('/admin/product/manufacture') : ''"
          >
            Product Manufacture
          </NuxtLink>
        </li>

        <li v-if="hasPermission('product master')">
          <NuxtLink
            to="/admin/product"
            :style="isActive('/admin/product') ? getActiveColor('/admin/product') : ''"
          >
            Product Master
          </NuxtLink>
        </li>

        <li v-if="hasPermission('product activation')">
          <NuxtLink
            to="/admin/product/viewproducts"
            :style="isActive('/admin/product/viewproducts') ? getActiveColor('/admin/product/viewproducts') : ''"
          >
            Product Activation
          </NuxtLink>
        </li>
                <!-- <li v-if="hasPermission('product reports')"><a href="#">Product Reports</a></li> -->
              </ul>
            </li>

            <!-- Orders -->
            <li v-if="hasPermission('orders')" class="has-child">
              <a href="javascript:void(0)">Orders</a>
              <ul class="open" style="display: block;">
                <li v-if="hasPermission('orders placed')">


                  

                  <NuxtLink
                    to="/admin/orders/ordersplaced"
                    :style="isActive('/admin/orders/ordersplaced') ? getActiveColor('/admin/orders/ordersplaced') : ''"
                  >
                    Orders Placed
                  </NuxtLink>

                </li>
                <li v-if="hasPermission('order packaging')"><NuxtLink to="/admin/orders/orderspacking">Order Packaging</NuxtLink></li>
                <li v-if="hasPermission('order dispatched')"><NuxtLink to="/admin/orders/ordersdispatch">Order Dispatched</NuxtLink></li>
                <li v-if="hasPermission('order shipments')"><NuxtLink to="/admin/orders/ordersshipment">Order Shipments</NuxtLink></li>
                <li v-if="hasPermission('order delivery')"><NuxtLink to="/admin/orders/ordersdeliveried">View All Orders</NuxtLink></li>
               <!-- <li v-if="hasPermission('order verification')"><a href="#">Order Verification</a></li> -->
              </ul>
            </li>

            <!-- Invoice -->
            <!-- <li v-if="hasPermission('invoice')" class="has-child">
              <a href="javascript:void(0)">Invoice</a>
              <ul class="open" style="display: block;">
                <li v-if="hasPermission('invoice list')"><a href="#">List</a></li>
                <li v-if="hasPermission('invoice preview')"><a href="#">Preview</a></li>
                <li v-if="hasPermission('invoice add new')"><a href="#">Add new</a></li>
              </ul>
            </li> -->




            <li class="has-child">
              <a href="javascript:void(0)">Supports</a>
              <ul class="open" style="display: block;">
                <li><NuxtLink to="/admin/support/tickets">Support Tickets</NuxtLink></li>
              </ul>
            </li>

            <!-- Other Services -->
            <!-- <li v-if="hasPermission('other services')" class="has-child">
              <a href="javascript:void(0)">Other Services</a>
              <ul class="open" style="display: block;">
                <li v-if="hasPermission('free lancers')"><a href="#">Free Lancers</a></li>
                <li v-if="hasPermission('collaborations')"><a href="#">Collaborations</a></li>
              </ul>
            </li> -->

            <!-- Admin -->
            <li v-if="hasPermission('admin')" class="has-child">
                <a href="javascript:void(0)"
                    :style="isAnyChildActive([
                                '/admin/roles/createadmin',
                                '/admin/roles/roles-permission',
                                '/admin/roles/',
                                '/admin/users'
                              ]) ? getActiveColor(route.path) : ''">
                    Admin
                  </a>
              <ul class="open" style="display: block;">
                <li v-if="hasPermission('users')" class="has-child">
                    <a href="javascript:void(0)"
                         :style="isAnyChildActive([
                            '/admin/roles/createadmin',
                            '/admin/roles/roles-permission',
                            '/admin/roles/',
                            '/admin/users'
                          ]) ? getActiveColor(route.path) : ''">
                          User
                        </a>
                  <ul>
                    <li v-if="hasPermission('add new user')">
                  <NuxtLink
                    to="/admin/roles/createadmin"
                    :style="isActive('/admin/roles/createadmin') ? getActiveColor('/admin/roles/createadmin') : ''"
                  >
                    Add New User
                  </NuxtLink>
                </li>
                  <li v-if="hasPermission('define roles')">
                  <NuxtLink
                    to="/admin/roles/roles-permission"
                    :style="isActive('/admin/roles/roles-permission') ? getActiveColor('/admin/roles/roles-permission') : ''"
                  >
                    Create Roles & Permissions
                  </NuxtLink>
                </li>   
                
                <li v-if="hasPermission('define roles')">
                  <NuxtLink
                    to="/admin/roles/"
                    :style="isActive('/admin/roles/') ? getActiveColor('/admin/roles/') : ''"
                  >
                    View Roles
                  </NuxtLink>
                </li>
                    <li v-if="hasPermission('assign roles')">
                  <NuxtLink
                    to="/admin/users"
                    :style="isActive('/admin/users') ? getActiveColor('/admin/users') : ''"
                  >
                    View Users
                  </NuxtLink>
                </li>

                    
                  </ul>
                </li>

                <li v-if="hasPermission('geography')" class="has-child">
                    <a href="#"
                        :style="isAnyChildActive([
                            '/admin/geography/country',
                            '/admin/geography/state',
                            '/admin/geography/city',
                          ]) ? getActiveColor(route.path) : ''">
                       Geography
                     </a>
                   <ul>
                    <li v-if="hasPermission('country')">
                  <NuxtLink 
                    to="/admin/geography/country"
                    :style="isActive('/admin/geography/country') ? getActiveColor('/admin/geography/country') : ''"
                  >
                    Country
                  </NuxtLink>
                </li>
            <!-- <li v-if="hasPermission('state')">
                  <NuxtLink
                    to="/admin/geography/state"
                    :style="isActive('/admin/geography/state') ? getActiveColor('/admin/geography/state') : ''"   
                  >
                    State 
                      
                  </NuxtLink>
                </li> -->

                  <li>
                  <NuxtLink
                    to="/admin/geography/region"
                    :style="isActive('/admin/geography/region') ? getActiveColor('/admin/geography/region') : ''"   
                  >
                    Region
                      
                  </NuxtLink>
                  </li>


                <li>
                  <NuxtLink
                    to="/admin/geography/districts"
                    :style="isActive('/admin/geography/districts') ? getActiveColor('/admin/geography/districts') : ''"   
                  >
                    Districts
                      
                  </NuxtLink>
                </li>
                    <li v-if="hasPermission('city')">

                  <NuxtLink
                    to="/admin/geography/city"  
                    :style="isActive('/admin/geography/city') ? getActiveColor('/admin/geography/city') : ''"
                      
                  >

                    City

                      
                  </NuxtLink>
                </li>




                <li >

                  <NuxtLink
                    to="/admin/geography/location"  
                    :style="isActive('/admin/geography/location') ? getActiveColor('/admin/geography/location') : ''"
                      
                  >

                    Locations

                      
                  </NuxtLink>
                </li>
                    
                  </ul>
                </li>


                <li class="has-child" v-if="hasPermission('shippingservices')">
                    <a href="javascript:void(0)"
                             :style="isAnyChildActive([
                            '/admin/shipping/shippers-create',
                            '/admin/shipping/shippers'
                            ]) ? getActiveColor(route.path) : ''">
                  Shipping Services
                  </a>

                 <ul> 
                   <li v-if="hasPermission('create shippers')">
                     <NuxtLink
                       to="/admin/shipping/shippers-create"
                       :style="isActive('/admin/shipping/shippers-create') ? getActiveColor('/admin/shipping/shippers-create') : ''"
                     >
                       Create Shippers
                     </NuxtLink>
                   </li>


                    <li>
                     <NuxtLink
                       to="/admin/shipping/shippers"
                       :style="isActive('/admin/shipping/shippers') ? getActiveColor('/admin/shipping/shippers') : ''"
                        v-if="hasPermission('view shippers')"
                        >
                       View Shippers
                     </NuxtLink>
                   </li>
                 </ul>

                </li>


                <li class="has-child">
                    <a href="javascript:void(0)"
                             :style="isAnyChildActive([
                               '/admin/vender',
                               '/admin/vendor/user'
                            ]) ? getActiveColor(route.path) : ''">
                    Vendor Services
                  </a>

                 <ul> 
                  <li>
                    <NuxtLink to="/admin/vendor">Vendors</NuxtLink>
                  </li>
                  
                  <li>
                    <NuxtLink to="/admin/vendor/user">Vendors Login</NuxtLink>
                  </li>



                  <li>
                    <NuxtLink to="/admin/products-temp">Vendors Request</NuxtLink>
                  </li>
                  
                      <li>
                        <NuxtLink to="/admin/vendor-orders">Vendor Orders</NuxtLink>
                      </li>

                      <li> 
                        <NuxtLink to="/admin/vendor-orders/vendor-payouts">Vendor Payouts</NuxtLink>
                      </li>

                  </ul>
                </li>


                <li v-if="hasPermission('contact departments')"><NuxtLink to="/admin/department">Contact Departments</NuxtLink></li>
                <li v-if="hasPermission('customer types')"><NuxtLink to="/admin/customer/type">Customer Types</NuxtLink></li>

                <li v-if="hasPermission('customers')"><NuxtLink to="/admin/customer">Customers</NuxtLink></li>
                <li v-if="hasPermission('system parameters')"><NuxtLink to="/admin/system-parameters">System Parameters</NuxtLink></li>
                <!-- <li v-if="hasPermission('companies')"><a href="#">Companies</a></li>
                <li v-if="hasPermission('currencies')"><a href="#">Currencies</a></li>
                <li v-if="hasPermission('merchant')"><a href="#">Merchant</a></li>
                <li v-if="hasPermission('couriers')"><a href="#">Couriers</a></li>
                <li v-if="hasPermission('admin report')"><a href="#">Admin Report</a></li> -->
              </ul>
            </li>
          </ul>
     
 
    </div>
</aside>


  <!-- Notifications permission modal -->
  <div
    v-if="showNotificationDialog"
    class="notification-modal-backdrop"
    role="dialog"
    aria-modal="true"
  >
    <div class="notification-modal">
      <!-- Header -->
      <div class="notification-modal-header">
        <h5 class="notification-modal-title">
          Enable Order Notifications
        </h5>
        <button
          type="button"
          class="notification-modal-close"
          @click="onDeclineClick"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <!-- Body -->
      <div class="notification-modal-body">
        <p class="notification-modal-text">
          We can send you real-time notifications when new orders are placed.
          You can change this later in your browser’s notification settings.
        </p>

        <div class="notification-modal-info">
          <div class="notification-modal-info-icon">🔔</div>
          <div class="notification-modal-info-text">
            After you click <strong>Allow</strong>, your browser will also show its
            own permission prompt to confirm notifications for this site.
          </div>
        </div>

        <p v-if="errorMessage" class="notification-modal-error">
          {{ errorMessage }}
        </p>
      </div>

      <!-- Footer -->
      <div class="notification-modal-footer">
        <button
          type="button"
          class="notification-btn-secondary"
          @click="onDeclineClick"
        >
          Not now
        </button>

        <button
          type="button"
          class="notification-btn-primary"
          :disabled="isEnabling"
          @click="onAcceptClick"
        >
          <span
            v-if="isEnabling"
            class="notification-btn-spinner"
          ></span>
          Allow notifications
        </button>
      </div>
    </div>
  </div>

  
</template>
<style scoped>
.notification-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-modal {
  background: #ffffff;
  border-radius: 8px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.25);
  overflow: hidden;
  font-family: inherit;
}

.notification-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.notification-modal-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.notification-modal-close {
  border: none;
  background: transparent;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  cursor: pointer;
  color: #6b7280;
  font-size: 18px;
  line-height: 1;
}

.notification-modal-close:hover {
  background: #f3f4f6;
  color: #111827;
}

.notification-modal-body {
  padding: 14px 16px 8px;
}

.notification-modal-text {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: #374151;
}

.notification-modal-info {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #fbbf24;
  background: #fffbeb;
  font-size: 12px;
  color: #92400e;
}

.notification-modal-info-icon {
  font-size: 16px;
  line-height: 1;
  margin-top: 2px;
}

.notification-modal-info-text strong {
  font-weight: 600;
}

.notification-modal-error {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: #ef4444;
}

.notification-modal-footer {
  padding: 10px 16px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  background: #f9fafb;
}

/* Buttons */
.notification-btn-secondary {
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #4b5563;
  cursor: pointer;
}

.notification-btn-secondary:hover {
  background: #f3f4f6;
}

.notification-btn-primary {
  border-radius: 6px;
  border: none;
  background: #059669;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.notification-btn-primary:hover {
  background: #047857;
}

.notification-btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.notification-btn-spinner {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  border: 2px solid #ffffff;
  border-bottom-color: transparent;
  display: inline-block;
  animation: notification-spin 0.6s linear infinite;
}

@keyframes notification-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
