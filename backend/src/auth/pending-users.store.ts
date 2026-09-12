export interface InMemoryUserProfile {
  id: string;
  fullName: string;
  username: string;
  email: string;
  gender: string;
  mobileNumber: string;
  password?: string;
  primaryDivision: {
    id: string;
    name: string;
    code?: string;
    is_ho?: boolean;
  };
  authorizedDivisions?: Array<{
    id: string;
    name: string;
    code?: string;
    is_ho?: boolean;
  }>;
  roles?: Array<{
    id: string;
    name: string;
  }>;
  permissions?: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  isSuperAdmin: boolean;
  createdAt: string;
}

const defaultHoUser: InMemoryUserProfile = {
  id: '00000000-0000-0000-0000-000000000000',
  fullName: 'HO Administrator',
  username: 'ho_admin',
  email: 'ho_admin@skmsteels.com',
  gender: 'Male',
  mobileNumber: '+91 9876543210',
  password: 'admin123',
  status: 'APPROVED',
  isSuperAdmin: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  primaryDivision: {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'SKM STEELS LIMITED (HO)',
    code: 'DIV_HO',
    is_ho: true,
  },
  authorizedDivisions: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'SKM STEELS LIMITED (HO)',
      code: 'DIV_HO',
      is_ho: true,
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'SKM Inox',
      code: 'DIV_INOX',
      is_ho: false,
    },
  ],
  roles: [
    { id: 'role-super-admin', name: 'Super Admin' },
    { id: 'role-ho-admin', name: 'HO Administrator' },
  ],
  permissions: [
    'parameters.pincode.view',
    'parameters.pincode.create',
    'parameters.pincode.edit',
    'parameters.pincode.delete',
    'parameters.pincode.assign',
    'parameters.account_type.view',
    'parameters.account_type.create',
    'parameters.account_type.edit',
    'parameters.account_type.delete',
    'parameters.account_type.assign',
    'masters.party.view',
    'masters.party.create',
    'masters.party.edit',
    'masters.party.delete',
    'users.manage',
  ],
};

const defaultInoxUser: InMemoryUserProfile = {
  id: '99999999-9999-9999-9999-999999999999',
  fullName: 'Inox Operator',
  username: 'inox_user',
  email: 'inox@skmsteels.com',
  gender: 'Male',
  mobileNumber: '+91 9876543211',
  password: 'user123',
  status: 'APPROVED',
  isSuperAdmin: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  primaryDivision: {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'SKM Inox',
    code: 'DIV_INOX',
    is_ho: false,
  },
  authorizedDivisions: [
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'SKM Inox',
      code: 'DIV_INOX',
      is_ho: false,
    },
  ],
  roles: [{ id: 'role-div-user', name: 'Division User' }],
  permissions: [
    'parameters.pincode.view',
    'parameters.account_type.view',
    'masters.party.view',
  ],
};

/**
 * Shared memory fallback store for newly registered profiles and development standby users.
 * Keyed by normalized lowercase username.
 */
export const inMemoryUsersStore = new Map<string, InMemoryUserProfile>([
  ['ho_admin', defaultHoUser],
  ['inox_user', defaultInoxUser],
]);

