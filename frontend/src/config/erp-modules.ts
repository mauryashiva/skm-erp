export interface ErpActionDefinition {
  key: string;
  label: string;
  description?: string;
}

export interface ErpFormDefinition {
  id: string;
  name: string;
  code: string;
  sectionId: string;
  actions: ErpActionDefinition[];
}

export interface ErpSectionDefinition {
  id: string;
  name: string;
  code: string;
  forms: ErpFormDefinition[];
}

// Standard action definitions for reuse and role matrices
export const ERP_ACTION_PERMISSIONS: ErpActionDefinition[] = [
  { key: 'create', label: 'Create', description: 'Add new authoritative records (Head Office controlled)' },
  { key: 'edit', label: 'Edit', description: 'Modify existing master or parameter record fields' },
  { key: 'delete', label: 'Delete / Deactivate', description: 'Activate, deactivate, or permanently delete records' },
  { key: 'assign', label: 'Assign', description: 'Authorize and copy/assign records to operating divisions' },
  { key: 'audit', label: 'Audit History', description: 'Inspect full historical changelog, timestamps, and who-edited-what audit logs' },
];

const STANDARD_ACTIONS = ERP_ACTION_PERMISSIONS;

/**
 * Authoritative Registry of Real ERP Sections and Forms.
 * Only includes sections and forms that physically exist in the application.
 * Dynamic and extensible: future forms plug in seamlessly.
 */
export const ERP_SECTIONS_REGISTRY: ErpSectionDefinition[] = [
  {
    id: 'parameters',
    name: 'Parameters',
    code: 'PARAM',
    forms: [
      {
        id: 'pincode',
        name: 'Pincode',
        code: 'parameters.pincode',
        sectionId: 'parameters',
        actions: STANDARD_ACTIONS,
      },
      {
        id: 'account_type',
        name: 'Account Type',
        code: 'parameters.account_type',
        sectionId: 'parameters',
        actions: STANDARD_ACTIONS,
      },
    ],
  },
  {
    id: 'masters',
    name: 'Masters',
    code: 'MAST',
    // Unbuilt forms removed. When Master forms (e.g. Party, Item) are implemented, they plug in here.
    forms: [],
  },
  {
    id: 'settings',
    name: 'Settings',
    code: 'SETTINGS',
    forms: [
      {
        id: 'users',
        name: 'Users',
        code: 'settings.users',
        sectionId: 'settings',
        actions: [
          { key: 'approve', label: 'Approve' },
          { key: 'edit', label: 'Edit' },
          { key: 'delete', label: 'Delete' },
          { key: 'assign', label: 'Assign' },
          { key: 'audit', label: 'Audit History' },
        ],
      },
      {
        id: 'roles',
        name: 'Role & Rights',
        code: 'settings.roles',
        sectionId: 'settings',
        actions: [
          { key: 'create', label: 'Create' },
          { key: 'edit', label: 'Edit' },
          { key: 'delete', label: 'Delete' },
          { key: 'audit', label: 'Audit History' },
        ],
      },
      {
        id: 'form_access',
        name: 'Form Access',
        code: 'settings.form_access',
        sectionId: 'settings',
        actions: [
          { key: 'edit', label: 'Edit / Assign' },
          { key: 'audit', label: 'Audit History' },
        ],
      },
    ],
  },
];
