<script setup lang="ts">
import { NuxtLink } from '#components';
import { useAdminUI } from '~/composables/useAdminUI'
import { useAuth } from '~/stores/auth'
import { onMounted } from 'vue';
 
useAdminUI()

 
const auth = useAuth()

const hasPermission = (perm: string) => auth.permissions.includes(perm)


const route = useRoute();

const isActive = (path: string) => {
  return route.path === path;
};


const isAnyChildActive = (paths: string[]) => {
  return paths.some(path => isActive(path));
};

const getActiveColor = (path: string): string => {

  const colorMap: Record<string, string> = {
    '/admin/categories': 'color: #6b8629;',
    '/admin/categories/subcategory': 'color: #73da1b;',
    '/admin/categories/subsubcategory': 'color: #41a5e3;',
    '/admin/product/producttype': 'color: #f97316;',
    '/admin/product/brands': 'color: #eab308;',
    '/admin/product/manufacture': 'color: #10b981;',
    '/admin/product': 'color: #8b5676;',
    '/admin/product/viewproducts': 'color: #ef4444;',
    '/admin/roles/createadmin': 'color: #6366f1;',
    '/admin/roles/roles-permission': 'color: #f43f5e;',
    '/admin/roles/': 'color: #0ea5e9;',
    '/admin/users': 'color: #22c55e;',
  };

  return colorMap[path] || 'color: #17a2b8;';

};

onMounted(() => {
 
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
        <img src="https://midnightblue-llama-681520.hostingersite.com/logonew1.jpg" alt="site logo" class="light-logo">
        <img src="https://midnightblue-llama-681520.hostingersite.com/logonew1.jpg" alt="site logo" class="dark-logo">
        <img src="https://midnightblue-llama-681520.hostingersite.com/logonew1.jpg" alt="site logo" class="logo-icon">
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
            <li><NuxtLink  to="/admin">eCommerce</NuxtLink></li>
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
           
           Product Category</a>
          <ul>
            <li v-if="hasPermission('departments')" class="text-blue-600">
        <NuxtLink to="/admin/categories"
          :style="isActive('/admin/categories') ? getActiveColor('/admin/categories') : 'color: #17a2b8;'">
        Departments
        </NuxtLink>
</li>

<li
  v-if="hasPermission('sub departments')"
 
>
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
         <li v-if="hasPermission('product reports')"><a href="#">Product Reports</a></li>
      </ul>
    </li>

    <!-- Orders -->
    <li v-if="hasPermission('orders')" class="has-child">
      <a href="javascript:void(0)">Orders</a>
      <ul class="open" style="display: block;">
        <li v-if="hasPermission('orders placed')"><a href="#">Orders Placed</a></li>
        <li v-if="hasPermission('order packaging')"><a href="#">Order Packaging</a></li>
        <li v-if="hasPermission('order dispatched')"><a href="#">Order Dispatched</a></li>
        <li v-if="hasPermission('order shipments')"><a href="#">Order Shipments</a></li>
        <li v-if="hasPermission('order delivery')"><a href="#">Order Delivery</a></li>
        <li v-if="hasPermission('order verification')"><a href="#">Order Verification</a></li>
      </ul>
    </li>

    <!-- Invoice -->
    <li v-if="hasPermission('invoice')" class="has-child">
      <a href="javascript:void(0)">Invoice</a>
      <ul class="open" style="display: block;">
        <li v-if="hasPermission('invoice list')"><a href="#">List</a></li>
        <li v-if="hasPermission('invoice preview')"><a href="#">Preview</a></li>
        <li v-if="hasPermission('invoice add new')"><a href="#">Add new</a></li>
      </ul>
    </li>

    <!-- Other Services -->
    <li v-if="hasPermission('other services')" class="has-child">
      <a href="javascript:void(0)">Other Services</a>
      <ul class="open" style="display: block;">
        <li v-if="hasPermission('free lancers')"><a href="#">Free Lancers</a></li>
        <li v-if="hasPermission('collaborations')"><a href="#">Collaborations</a></li>
      </ul>
    </li>

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
        <li v-if="hasPermission('system parameters')"><a href="#">System Parameters</a></li>
        <li v-if="hasPermission('companies')"><a href="#">Companies</a></li>
        <li v-if="hasPermission('currencies')"><a href="#">Currencies</a></li>
        <li v-if="hasPermission('merchant')"><a href="#">Merchant</a></li>
        <li v-if="hasPermission('couriers')"><a href="#">Couriers</a></li>
        <li v-if="hasPermission('admin report')"><a href="#">Admin Report</a></li>
      </ul>
    </li>
  </ul>
     
 
    </div>
  </aside>

</template>