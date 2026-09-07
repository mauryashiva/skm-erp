export interface Division {
  id: string;
  name: string;
  code: string;
  is_ho: boolean;
}

export interface FinancialYear {
  id: string;
  code: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  mobile_number: string;
  status:
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';
  is_super_admin: boolean;
  primary_division: Division | null;
  authorized_divisions: Division[];
  roles: string[];
  permissions: string[];
  active_division_id?: string;
  is_ho_active?: boolean;
}

export interface AssignedDivision {
  id: string;
  name: string;
  code: string;
  isHo: boolean;
}

export interface PincodeRecord {
  id: string;
  pincode: string;
  city: string;
  district?: string;
  state: string;
  country: string;
  countryCode?: string;
  area?: string;
  postOffice?: string;
  isActive: boolean;
  assignedDivisions: AssignedDivision[];
  createdAt: string;
  updatedAt: string;
}

export interface PostalLocation {
  postalCode: string;
  city: string;
  district: string;
  state: string;
  area: string;
  postOffice: string;
  country: string;
  countryCode: string;
  latitude?: string;
  longitude?: string;
  accuracy?: string;
}

export interface LocationLookupResult {
  found: boolean;
  postalCode: string;
  city: string;
  district: string;
  state: string;
  area: string;
  postOffice: string;
  country: string;
  countryCode: string;
  locations: PostalLocation[];
  source: 'local' | 'manual';
  message?: string;
}