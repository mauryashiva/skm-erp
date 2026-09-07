import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface FinancialYearDto {
  id: string;
  code: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

const DEFAULT_FINANCIAL_YEARS: FinancialYearDto[] = [
  { id: 'fy-2024-25', code: 'FY 2024-25', startDate: '2024-04-01', endDate: '2025-03-31', isCurrent: false },
  { id: 'fy-2025-26', code: 'FY 2025-26', startDate: '2025-04-01', endDate: '2026-03-31', isCurrent: true },
  { id: 'fy-2026-27', code: 'FY 2026-27', startDate: '2026-04-01', endDate: '2027-03-31', isCurrent: false },
  { id: 'fy-2027-28', code: 'FY 2027-28', startDate: '2027-04-01', endDate: '2028-03-31', isCurrent: false },
  { id: 'fy-2028-29', code: 'FY 2028-29', startDate: '2028-04-01', endDate: '2029-03-31', isCurrent: false },
  { id: 'fy-2029-30', code: 'FY 2029-30', startDate: '2029-04-01', endDate: '2030-03-31', isCurrent: false },
];

@Injectable()
export class FinancialYearsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getAllFinancialYears(): Promise<FinancialYearDto[]> {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('financial_years')
      .select('id, code, start_date, end_date, is_current')
      .eq('is_active', true)
      .order('start_date', { ascending: false });

    if (error || !data || data.length === 0) {
      return DEFAULT_FINANCIAL_YEARS;
    }

    return data.map((fy) => ({
      id: fy.id,
      code: fy.code,
      startDate: fy.start_date,
      endDate: fy.end_date,
      isCurrent: fy.is_current,
    }));
  }
}
