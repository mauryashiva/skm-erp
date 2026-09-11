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

/**
 * Shared memory fallback store for newly registered profiles and development standby users.
 * Keyed by normalized lowercase username.
 */
export const inMemoryUsersStore = new Map<string, InMemoryUserProfile>();
