export type AdminPermissionNode = {
  label: string
  permission: string
  icon?: string
  children?: AdminPermissionNode[]
}

export const adminPermissionTree: AdminPermissionNode[] = [
  {
    label: 'Dashboard',
    permission: 'dashboard',
    icon: 'solar:home-smile-angle-outline',
  },
  {
    label: 'Products',
    permission: 'products',
    icon: 'solar:box-outline',
    children: [
      {
        label: 'Product Departments',
        permission: 'product category',
        children: [
          { label: 'Departments', permission: 'departments' },
          { label: 'Sub Departments', permission: 'sub departments' },
          { label: 'Sub Sub Departments', permission: 'sub sub departments' },
          { label: 'Products Features', permission: 'addproductsdescription' },
          { label: 'View Products Features', permission: 'view products description' },
        ],
      },
      { label: 'Product Types', permission: 'product types' },
      { label: 'Product Brands', permission: 'product brands' },
      { label: 'Product Manufacture', permission: 'product manufacture' },
      { label: 'Product Master', permission: 'product master' },
      { label: 'Product Stock', permission: 'product stock' },
      { label: 'Product Activation', permission: 'product activation' },
      { label: 'Product Reports', permission: 'product reports' },
    ],
  },
  {
    label: 'Orders',
    permission: 'orders',
    icon: 'solar:cart-large-2-outline',
    children: [
      { label: 'Orders Placed', permission: 'orders placed' },
      { label: 'Order Packaging', permission: 'order packaging' },
      { label: 'Order Dispatched', permission: 'order dispatched' },
      { label: 'Order Shipments', permission: 'order shipments' },
      { label: 'Order Pickup', permission: 'order pickup' },
      { label: 'Completed / View All Orders', permission: 'order delivery' },
      { label: 'Order Verification', permission: 'order verification' },
    ],
  },
  {
    label: 'Supports',
    permission: 'support tickets',
    icon: 'solar:ticket-outline',
  },
  {
    label: 'Invoice',
    permission: 'invoice',
    icon: 'solar:bill-list-outline',
    children: [
      { label: 'List', permission: 'invoice list' },
      { label: 'Preview', permission: 'invoice preview' },
      { label: 'Add New', permission: 'invoice add new' },
    ],
  },
  {
    label: 'Other Services',
    permission: 'other services',
    icon: 'solar:widget-5-outline',
    children: [
      { label: 'Free Lancers', permission: 'free lancers' },
      { label: 'Collaborations', permission: 'collaborations' },
    ],
  },
  {
    label: 'Admin',
    permission: 'admin',
    icon: 'solar:settings-outline',
    children: [
      {
        label: 'User',
        permission: 'users',
        children: [
          { label: 'Add New User', permission: 'add new user' },
          { label: 'View User Profile', permission: 'view user profile' },
          { label: 'Print User Profile', permission: 'print user profile' },
          { label: 'Create Roles & Permissions', permission: 'define roles' },
          { label: 'View Users', permission: 'assign roles' },
        ],
      },
      {
        label: 'Geography',
        permission: 'geography',
        children: [
          { label: 'Country', permission: 'country' },
          { label: 'State', permission: 'state' },
          { label: 'Region', permission: 'region' },
          { label: 'Districts', permission: 'districts' },
          { label: 'City', permission: 'city' },
          { label: 'Locations', permission: 'locations' },
        ],
      },
      {
        label: 'Shipping Services',
        permission: 'shippingservices',
        children: [
          { label: 'Create Shippers', permission: 'create shippers' },
          { label: 'View Shippers', permission: 'view shippers' },
        ],
      },
      {
        label: 'Vendor Services',
        permission: 'vendor services',
        children: [
          { label: 'Vendors', permission: 'vendors' },
          { label: 'Registration Requests', permission: 'vendor registration requests' },
          { label: 'Vendor Users', permission: 'vendor users' },
          { label: 'Vendor Requests', permission: 'vendor requests' },
          { label: 'Vendor Orders', permission: 'vendor orders' },
          { label: 'Vendor Payouts', permission: 'vendor payouts' },
        ],
      },
      { label: 'Contact Departments', permission: 'contact departments' },
      { label: 'Customer Types', permission: 'customer types' },
      { label: 'Customers', permission: 'customers' },
      { label: 'System Parameters', permission: 'system parameters' },
      { label: 'Companies', permission: 'companies' },
      { label: 'Currencies', permission: 'currencies' },
      { label: 'Merchant', permission: 'merchant' },
      { label: 'Couriers', permission: 'couriers' },
      { label: 'Admin Report', permission: 'admin report' },
    ],
  },
]

const walkTree = (
  nodes: AdminPermissionNode[],
  visitor: (node: AdminPermissionNode, parents: AdminPermissionNode[]) => void,
  parents: AdminPermissionNode[] = [],
) => {
  nodes.forEach((node) => {
    visitor(node, parents)
    if (node.children?.length) {
      walkTree(node.children, visitor, [...parents, node])
    }
  })
}

export const collectNodePermissions = (node: AdminPermissionNode): string[] => {
  const values = [node.permission]
  node.children?.forEach((child) => {
    values.push(...collectNodePermissions(child))
  })
  return Array.from(new Set(values))
}

export const collectDescendantPermissions = (node: AdminPermissionNode): string[] => {
  const values: string[] = []
  node.children?.forEach((child) => {
    values.push(...collectNodePermissions(child))
  })
  return Array.from(new Set(values))
}

export const allAdminPermissionValues = (() => {
  const values: string[] = []
  walkTree(adminPermissionTree, (node) => values.push(node.permission))
  return Array.from(new Set(values))
})()

export const getNodeByPermission = (permission: string) => {
  let found: AdminPermissionNode | null = null
  walkTree(adminPermissionTree, (node) => {
    if (node.permission === permission) found = node
  })
  return found
}

export const getAncestorPermissions = (permission: string) => {
  let ancestors: string[] = []
  walkTree(adminPermissionTree, (node, parents) => {
    if (node.permission === permission) {
      ancestors = parents.map((parent) => parent.permission)
    }
  })
  return ancestors
}

const pruneEmptyParents = (values: Set<string>) => {
  const nodes: AdminPermissionNode[] = []
  walkTree(adminPermissionTree, (node) => {
    if (node.children?.length) nodes.push(node)
  })

  nodes.reverse().forEach((node) => {
    const descendants = collectDescendantPermissions(node)
    const hasSelectedDescendant = descendants.some((permission) => values.has(permission))
    if (!hasSelectedDescendant) values.delete(node.permission)
  })
}

export const normalizePermissionSelection = (values: string[]) => {
  const normalized = new Set(values.filter(Boolean))

  Array.from(normalized).forEach((permission) => {
    getAncestorPermissions(permission).forEach((ancestor) => normalized.add(ancestor))
  })

  pruneEmptyParents(normalized)

  return Array.from(normalized)
}

export const togglePermissionSelection = (
  currentValues: string[],
  permission: string,
  checked: boolean,
) => {
  const next = new Set(currentValues)
  const node = getNodeByPermission(permission)
  const affected = node ? collectNodePermissions(node) : [permission]

  if (checked) {
    affected.forEach((value) => next.add(value))
    getAncestorPermissions(permission).forEach((ancestor) => next.add(ancestor))
  } else {
    affected.forEach((value) => next.delete(value))
  }

  return normalizePermissionSelection(Array.from(next))
}

export const isNodeFullySelected = (node: AdminPermissionNode, selectedValues: string[]) => {
  const selected = new Set(selectedValues)
  return collectNodePermissions(node).every((permission) => selected.has(permission))
}

export const isNodePartiallySelected = (node: AdminPermissionNode, selectedValues: string[]) => {
  const selected = new Set(selectedValues)
  return collectNodePermissions(node).some((permission) => selected.has(permission))
}
