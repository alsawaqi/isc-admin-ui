<script setup lang="ts">
import { NuxtLink } from '#components';
import { useAdminUI } from '~/composables/useAdminUI'
import { useAuth } from '~/stores/auth'
import { onMounted } from 'vue';
 
useAdminUI()

 
const auth = useAuth()

const hasPermission = (perm: string) => auth.permissions.includes(perm)


onMounted(() => {
  console.log('User:', auth.user)
  console.log('Permissions:', auth.permissions)
})

</script>

<template>
    <aside class="sidebar">
    <button type="button" class="sidebar-close-btn !mt-4">
      <iconify-icon icon="radix-icons:cross-2"></iconify-icon>
    </button>

    <div>
      <a href="/home" class="sidebar-logo">
        <img src="https://midnightblue-llama-681520.hostingersite.com/logonew1.jpg" alt="site logo" class="light-logo">
        <img src="https://midnightblue-llama-681520.hostingersite.com/logonew1.jpg" alt="site logo" class="dark-logo">
        <img src="https://midnightblue-llama-681520.hostingersite.com/logonew1.jpg" alt="site logo" class="logo-icon">
      </a>
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
            <li><NuxtLink  :to="'/admin'">eCommerce</NuxtLink></li>
          </ul>
        </li>

        
    <!-- Products -->
    <li v-if="hasPermission('products')" class="has-child">
      <a href="javascript:void(0)">Products</a>
      <ul class="open" style="display: block;">
        <li v-if="hasPermission('product category')" class="has-child">
          <a href="javascript:void(0)">Product Category</a>
          <ul>
            <li v-if="hasPermission('departments')"><NuxtLink to="/admin/categories">Departments</NuxtLink></li>
            <li v-if="hasPermission('sub departments')"><NuxtLink to="/admin/categories/subcategory">Sub Departments</NuxtLink></li>
            <li v-if="hasPermission('sub sub departments')"><NuxtLink to="/admin/categories/subsubcategory">Sub Sub Departments</NuxtLink></li>
          </ul>
        </li>
        <li v-if="hasPermission('product types')"><NuxtLink to="/admin/product/producttype">Product Types</NuxtLink></li>
        <li v-if="hasPermission('product brands')"><NuxtLink to="/admin/product/brands">Product Brands</NuxtLink></li>
        <li v-if="hasPermission('product manufacture')"><NuxtLink to="/admin/product/manufacture">Product Manufacture</NuxtLink></li>
        <li v-if="hasPermission('product master')"><NuxtLink to="/admin/product">Product Master</NuxtLink></li>
        <li v-if="hasPermission('product activation')"><a href="/viewproducts">Product Activation</a></li>
        <li v-if="hasPermission('product reports')"><a href="/productreports">Product Reports</a></li>
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
        <li v-if="hasPermission('invoice list')"><a href="/invoicelist">List</a></li>
        <li v-if="hasPermission('invoice preview')"><a href="/invoice-preview">Preview</a></li>
        <li v-if="hasPermission('invoice add new')"><a href="/invoice-add">Add new</a></li>
      </ul>
    </li>

    <!-- Other Services -->
    <li v-if="hasPermission('other services')" class="has-child">
      <a href="javascript:void(0)">Other Services</a>
      <ul class="open" style="display: block;">
        <li v-if="hasPermission('free lancers')"><a href="/freelancers">Free Lancers</a></li>
        <li v-if="hasPermission('collaborations')"><a href="/collab">Collaborations</a></li>
      </ul>
    </li>

    <!-- Admin -->
    <li v-if="hasPermission('admin')" class="has-child">
      <a href="javascript:void(0)">Admin</a>
      <ul class="open" style="display: block;">
        <li v-if="hasPermission('users')" class="has-child">
          <a href="javascript:void(0)">User</a>
          <ul>
            <li v-if="hasPermission('add new user')"><NuxtLink to="/admin/roles/createadmin">Add New User</NuxtLink></li>
            <li v-if="hasPermission('define roles')"><NuxtLink to="/admin/roles/roles-permission">Create Roles & Permissions</NuxtLink></li>
            <li v-if="hasPermission('define roles')"><NuxtLink to="/admin/roles/">View Roles</NuxtLink></li>
            <li v-if="hasPermission('assign roles')"><NuxtLink to="/admin/users">View Users</NuxtLink></li>

            
          </ul>
        </li>
        <li v-if="hasPermission('system parameters')"><a href="#">System Parameters</a></li>
        <li v-if="hasPermission('companies')"><a href="/company">Companies</a></li>
        <li v-if="hasPermission('currencies')"><a href="/currency">Currencies</a></li>
        <li v-if="hasPermission('merchant')"><a href="#">Merchant</a></li>
        <li v-if="hasPermission('couriers')"><a href="#">Couriers</a></li>
        <li v-if="hasPermission('admin report')"><a href="#">Admin Report</a></li>
      </ul>
    </li>
  </ul>
     
 
    </div>
  </aside>

</template>