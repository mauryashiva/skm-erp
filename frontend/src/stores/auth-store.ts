import { create } from 'zustand';
import { UserProfile } from '../types';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (user: UserProfile, token: string) => void;
  updateUser: (user: Partial<UserProfile>) => void;
  logout: () => void;
  hasPermission: (permissionCode: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Initialize from localStorage if present
  let initialUser: UserProfile | null = null;
  let initialToken: string | null = null;

  if (typeof window !== 'undefined') {
    try {
      const storedUser = localStorage.getItem('skm_erp_user');
      const storedToken = localStorage.getItem('skm_erp_token');
      if (storedUser && storedToken) {
        initialUser = JSON.parse(storedUser);
        initialToken = storedToken;
      }
    } catch {
      // ignore parsing error
    }
  }

  return {
    user: initialUser,
    token: initialToken,
    isAuthenticated: !!initialToken && !!initialUser,
    isLoading: false,

    setSession: (user, token) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('skm_erp_user', JSON.stringify(user));
        localStorage.setItem('skm_erp_token', token);
      }
      set({ user, token, isAuthenticated: true });
    },

    updateUser: (updated) => {
      const current = get().user;
      if (!current) return;
      const next = { ...current, ...updated };
      if (typeof window !== 'undefined') {
        localStorage.setItem('skm_erp_user', JSON.stringify(next));
      }
      set({ user: next });
    },

    logout: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('skm_erp_user');
        localStorage.removeItem('skm_erp_token');
        localStorage.removeItem('skm_erp_active_division');
        localStorage.removeItem('skm_erp_active_fy');
      }
      set({ user: null, token: null, isAuthenticated: false });
    },

    hasPermission: (permissionCode: string) => {
      const user = get().user;
      if (!user) return false;
      if (user.is_super_admin) return true;
      return user.permissions?.includes(permissionCode) || false;
    },
  };
});
