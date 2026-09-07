import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthUser, DivisionInfo } from '../common/interfaces/auth-user.interface';

// Authoritative 26 divisions
export const AUTHORITATIVE_DIVISIONS: Omit<DivisionInfo, 'id'>[] = [
  { name: 'SKM STEELS LIMITED (HO)', code: 'DIV_HO', is_ho: true },
  { name: 'SKM Inox', code: 'DIV_INOX', is_ho: false },
  { name: 'Strandply OSB', code: 'DIV_STRANDPLY_OSB', is_ho: false },
  { name: 'SKM Global - Mumbai', code: 'DIV_GLOBAL_MUM', is_ho: false },
  { name: 'SKM Global - Ahmedabad', code: 'DIV_GLOBAL_AHM', is_ho: false },
  { name: 'SKM Metal Processors', code: 'DIV_METAL_PROC', is_ho: false },
  { name: 'SKM CRHR- MP', code: 'DIV_CRHR_MP', is_ho: false },
  { name: 'SKM TISCON - MP', code: 'DIV_TISCON_MP', is_ho: false },
  { name: 'SKM Constra', code: 'DIV_CONSTRA', is_ho: false },
  { name: 'SKM Alucom', code: 'DIV_ALUCOM', is_ho: false },
  { name: 'SKM Steels Ltd. (CRHR)', code: 'DIV_STEELS_CRHR', is_ho: false },
  { name: 'SKM Galva', code: 'DIV_GALVA', is_ho: false },
  { name: 'SKM Ispat', code: 'DIV_ISPAT', is_ho: false },
  { name: 'SKM Energy', code: 'DIV_ENERGY', is_ho: false },
  { name: 'Strandply OSB Trading', code: 'DIV_STRANDPLY_TRD', is_ho: false },
  { name: 'SKM COMMODITIES - Mumbai', code: 'DIV_COMM_MUM', is_ho: false },
  { name: 'SKM Commodities - Gujarat', code: 'DIV_COMM_GUJ', is_ho: false },
  { name: 'SKM Commodities - Rajsthan', code: 'DIV_COMM_RAJ', is_ho: false },
  { name: 'SKM Commodities - Indore', code: 'DIV_COMM_IND', is_ho: false },
  { name: 'SKM Impex - Mumbai', code: 'DIV_IMPEX_MUM', is_ho: false },
  { name: 'SKM Impex - Chennai', code: 'DIV_IMPEX_CHE', is_ho: false },
  { name: 'SKM Impex - Cuttack', code: 'DIV_IMPEX_CUT', is_ho: false },
  { name: 'SKM Impex - Ahmedabad', code: 'DIV_IMPEX_AHM', is_ho: false },
  { name: 'SKM Impex - Hyderabad', code: 'DIV_IMPEX_HYD', is_ho: false },
  { name: 'SKM Impex - UP', code: 'DIV_IMPEX_UP', is_ho: false },
  { name: 'SKM Stainless', code: 'DIV_STAINLESS', is_ho: false },
];

@Injectable()
export class DivisionsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getAllDivisions(): Promise<DivisionInfo[]> {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('divisions')
      .select('id, name, code, is_ho')
      .eq('is_active', true)
      .order('is_ho', { ascending: false })
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      // Fallback deterministic representation
      return AUTHORITATIVE_DIVISIONS.map((d, index) => ({
        id: `10000000-0000-0000-0000-${index.toString().padStart(12, '0')}`,
        ...d,
      }));
    }

    return data;
  }

  async getUserAuthorizedDivisions(user: AuthUser): Promise<DivisionInfo[]> {
    if (user.is_super_admin) {
      return this.getAllDivisions();
    }
    return user.authorized_divisions || [];
  }
}
