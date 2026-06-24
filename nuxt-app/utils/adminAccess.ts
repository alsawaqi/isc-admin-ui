export type AdminAccessTarget = {
  permission: string
  path: string
  label: string
}

export const adminAccessTargets: AdminAccessTarget[] = [
  { permission: 'dashboard', path: '/admin', label: 'Dashboard' },

  { permission: 'departments', path: '/admin/categories', label: 'Departments' },
  { permission: 'sub departments', path: '/admin/categories/subcategory', label: 'Sub Departments' },
  { permission: 'sub sub departments', path: '/admin/categories/subsubcategory', label: 'Sub Sub Departments' },
  { permission: 'addproductsdescription', path: '/admin/categories/addproductsdescription', label: 'Products Features' },
  { permission: 'view products description', path: '/admin/categories/viewproductdescription', label: 'View Products Features' },
  { permission: 'product types', path: '/admin/product/producttype', label: 'Product Types' },
  { permission: 'product brands', path: '/admin/product/brands', label: 'Product Brands' },
  { permission: 'product manufacture', path: '/admin/product/manufacture', label: 'Product Manufacture' },
  { permission: 'product master', path: '/admin/product', label: 'Product Master' },
  { permission: 'product stock', path: '/admin/product/stock', label: 'Product Stock' },
  { permission: 'product activation', path: '/admin/product/viewproducts', label: 'Product Activation' },

  { permission: 'orders placed', path: '/admin/orders/ordersplaced', label: 'Orders Placed' },
  { permission: 'order packaging', path: '/admin/orders/orderspacking', label: 'Order Packaging' },
  { permission: 'order dispatched', path: '/admin/orders/ordersdispatch', label: 'Order Dispatched' },
  { permission: 'order shipments', path: '/admin/orders/ordersshipment', label: 'Order Shipments' },
  { permission: 'order pickup', path: '/admin/orders/orderspickup', label: 'Order Pickup' },
  { permission: 'order delivery', path: '/admin/orders/completed', label: 'Completed Orders' },

  { permission: 'support tickets', path: '/admin/support/tickets', label: 'Support Tickets' },

  { permission: 'add new user', path: '/admin/roles/createadmin', label: 'Add New User' },
  { permission: 'define roles', path: '/admin/roles/roles-permission', label: 'Roles & Permissions' },
  { permission: 'assign roles', path: '/admin/users', label: 'View Users' },
  { permission: 'country', path: '/admin/geography/country', label: 'Country' },
  { permission: 'state', path: '/admin/geography/state', label: 'State' },
  { permission: 'region', path: '/admin/geography/region', label: 'Region' },
  { permission: 'districts', path: '/admin/geography/districts', label: 'Districts' },
  { permission: 'city', path: '/admin/geography/city', label: 'City' },
  { permission: 'locations', path: '/admin/geography/location', label: 'Locations' },
  { permission: 'create shippers', path: '/admin/shipping/shippers-create', label: 'Create Shippers' },
  { permission: 'view shippers', path: '/admin/shipping/shippers', label: 'View Shippers' },
  { permission: 'vendors', path: '/admin/vendor', label: 'Vendors' },
  { permission: 'vendor users', path: '/admin/vendor/user', label: 'Vendor Users' },
  { permission: 'vendor requests', path: '/admin/products-temp', label: 'Vendor Requests' },
  { permission: 'vendor orders', path: '/admin/vendor-orders', label: 'Vendor Orders' },
  { permission: 'vendor payouts', path: '/admin/vendor-orders/vendor-payouts', label: 'Vendor Payouts' },
  { permission: 'contact departments', path: '/admin/department', label: 'Contact Departments' },
  { permission: 'customer types', path: '/admin/customer/type', label: 'Customer Types' },
  { permission: 'customers', path: '/admin/customer', label: 'Customers' },
  { permission: 'system parameters', path: '/admin/system-parameters', label: 'System Parameters' },
]

export const getFirstAllowedAdminTarget = (permissions: string[] = []) => {
  const allowed = new Set(permissions.filter(Boolean))
  return adminAccessTargets.find((target) => allowed.has(target.permission)) ?? null
}

export const getAdminLandingPath = (permissions: string[] = []) => {
  return getFirstAllowedAdminTarget(permissions)?.path ?? '/403'
}

export const getAdminLandingLabel = (permissions: string[] = []) => {
  return getFirstAllowedAdminTarget(permissions)?.label ?? 'Allowed Page'
}
