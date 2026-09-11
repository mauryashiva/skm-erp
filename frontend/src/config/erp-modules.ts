export interface ErpActionPermission {
  key: string;
  label: string;
  description: string;
}

export const ERP_ACTION_PERMISSIONS: ErpActionPermission[] = [
  { key: 'view', label: 'View', description: 'Read-only access to view records in authorized active division' },
  { key: 'create', label: 'Create', description: 'Create new authoritative master/parameter records (HO controlled)' },
  { key: 'edit', label: 'Edit', description: 'Modify existing master/parameter record fields' },
  { key: 'assign', label: 'Assign Division', description: 'Authorize and copy/assign records to child operating divisions' },
  { key: 'activate', label: 'Activate', description: 'Restore previously deactivated records' },
  { key: 'deactivate', label: 'Deactivate', description: 'Soft-delete/deactivate records from operating division visibility' },
  { key: 'delete', label: 'Delete', description: 'Permanently remove record (HO Super Admin only)' },
];

export interface ErpFormDefinition {
  id: string;
  name: string;
  code: string;
  sectionId: string;
  description: string;
  defaultActions: string[];
}

export interface ErpSectionDefinition {
  id: string;
  name: string;
  code: string;
  description: string;
  forms: ErpFormDefinition[];
}

/**
 * Authoritative Registry of ERP Sections and Forms.
 * Designed to dynamically accommodate future forms and modules
 * without modifying the core permission or division-scoping architecture.
 */
export const ERP_SECTIONS_REGISTRY: ErpSectionDefinition[] = [
  {
    id: 'parameters',
    name: 'Parameters',
    code: 'PARAM',
    description: 'Centrally managed master reference parameters and geographic definitions',
    forms: [
      {
        id: 'pincode',
        name: 'Pincode',
        code: 'parameters.pincode',
        sectionId: 'parameters',
        description: 'Postal code directories with geographic lookup and multi-division assignment',
        defaultActions: ['view', 'create', 'edit', 'assign', 'activate', 'deactivate', 'delete'],
      },
      {
        id: 'account_type',
        name: 'Account Type',
        code: 'parameters.account_type',
        sectionId: 'parameters',
        description: 'Authoritative accounting classifications and ledger grouping hierarchies',
        defaultActions: ['view', 'create', 'edit', 'assign', 'activate', 'deactivate', 'delete'],
      },
    ],
  },
  {
    id: 'masters',
    name: 'Masters',
    code: 'MAST',
    description: 'Authoritative corporate entity catalogs including customers, vendors, and inventory SKUs',
    forms: [
      {
        id: 'party',
        name: 'Party / Ledger Master',
        code: 'masters.party',
        sectionId: 'masters',
        description: 'Trade customer and vendor master accounts with tax and banking details',
        defaultActions: ['view', 'create', 'edit', 'delete', 'assign'],
      },
      {
        id: 'item',
        name: 'Item / SKU Catalog',
        code: 'masters.item',
        sectionId: 'masters',
        description: 'Steel grades, product dimensions, finishes, and unit conversion standards',
        defaultActions: ['view', 'create', 'edit', 'delete', 'assign'],
      },
    ],
  },
  {
    id: 'transactions',
    name: 'Transactions',
    code: 'TXN',
    description: 'Operational business documents, orders, dispatches, and invoicing',
    forms: [
      {
        id: 'sales_order',
        name: 'Sales Order',
        code: 'transactions.sales_order',
        sectionId: 'transactions',
        description: 'Commercial sales bookings and contract allocations',
        defaultActions: ['view', 'create', 'edit', 'delete'],
      },
      {
        id: 'purchase_order',
        name: 'Purchase Order',
        code: 'transactions.purchase_order',
        sectionId: 'transactions',
        description: 'Raw material procurement and supplier purchase contracts',
        defaultActions: ['view', 'create', 'edit', 'delete'],
      },
    ],
  },
];
