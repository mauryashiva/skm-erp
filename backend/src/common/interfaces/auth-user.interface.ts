export interface DivisionInfo {
  id: string;
  name: string;
  code: string;
  is_ho: boolean;
}

export interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  email?: string;
  gender?: string;
  mobile_number: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  is_super_admin: boolean;
  primary_division: DivisionInfo | null;
  authorized_divisions: DivisionInfo[];
  roles: string[];
  permissions: string[];
  active_division_id?: string;
  is_ho_active?: boolean;
}
