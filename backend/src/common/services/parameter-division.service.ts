import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

export type ParameterEntityKey = 'account_types' | 'pincodes';

export interface ParameterDivisionConfig {
  junctionTable: string;
  fkColumn: string;
}

export const PARAMETER_DIVISION_CONFIGS: Record<ParameterEntityKey, ParameterDivisionConfig> = {
  account_types: {
    junctionTable: 'account_type_divisions',
    fkColumn: 'account_type_id',
  },
  pincodes: {
    junctionTable: 'pincode_divisions',
    fkColumn: 'pincode_id',
  },
};

export interface AssignedDivisionInfo {
  id: string;
  name: string;
  code?: string;
  isHo: boolean;
}

@Injectable()
export class ParameterDivisionService {
  private readonly logger = new Logger(ParameterDivisionService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Synchronizes division assignments for a specific parameter record.
   * Ensures Head Office (HO) division is always included in final assignments.
   */
  async syncDivisionAssignments(
    entityKey: ParameterEntityKey,
    recordId: string,
    divisionIds: string[],
  ): Promise<string[]> {
    const config = PARAMETER_DIVISION_CONFIGS[entityKey];
    if (!config) {
      throw new Error(`Invalid parameter entity key: ${entityKey}`);
    }

    const supabase = this.supabaseService.getClient();

    // Fetch HO division ID to guarantee HO remains assigned
    const { data: hoDiv } = await supabase
      .from('divisions')
      .select('id')
      .eq('is_ho', true)
      .maybeSingle();

    const finalDivIds = new Set(divisionIds || []);
    if (hoDiv?.id) {
      finalDivIds.add(hoDiv.id);
    }

    // Delete existing assignments for this record
    const { error: deleteError } = await supabase
      .from(config.junctionTable)
      .delete()
      .eq(config.fkColumn, recordId);

    if (deleteError) {
      this.logger.warn(`Supabase assignment delete error for ${entityKey} (${recordId}): ${deleteError.message}`);
      throw deleteError;
    }

    // Insert new assignment rows
    const insertRows = Array.from(finalDivIds).map((divId) => ({
      [config.fkColumn]: recordId,
      division_id: divId,
    }));

    if (insertRows.length > 0) {
      const { error: insertError } = await supabase
        .from(config.junctionTable)
        .insert(insertRows);

      if (insertError) {
        this.logger.warn(`Supabase assignment insert error for ${entityKey} (${recordId}): ${insertError.message}`);
        throw insertError;
      }
    }

    return Array.from(finalDivIds);
  }

  /**
   * Fetches assigned divisions for a given parameter record.
   */
  async getAssignedDivisions(
    entityKey: ParameterEntityKey,
    recordId: string,
  ): Promise<AssignedDivisionInfo[]> {
    const config = PARAMETER_DIVISION_CONFIGS[entityKey];
    if (!config) return [];

    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from(config.junctionTable)
      .select('division_id, division:divisions(id, name, code, is_ho)')
      .eq(config.fkColumn, recordId);

    if (error || !data) {
      this.logger.warn(`Error fetching assigned divisions for ${entityKey} (${recordId}): ${error?.message}`);
      return [];
    }

    return data
      .map((row: any) => row.division)
      .filter(Boolean)
      .map((div: any) => ({
        id: div.id,
        name: div.name,
        code: div.code,
        isHo: div.is_ho,
      }));
  }

  /**
   * Checks if a parameter record is assigned to a specific division.
   */
  async isRecordAssignedToDivision(
    entityKey: ParameterEntityKey,
    recordId: string,
    divisionId: string,
  ): Promise<boolean> {
    const config = PARAMETER_DIVISION_CONFIGS[entityKey];
    if (!config) return false;

    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from(config.junctionTable)
      .select('division_id')
      .eq(config.fkColumn, recordId)
      .eq('division_id', divisionId)
      .maybeSingle();

    if (error || !data) return false;
    return true;
  }

  /**
   * Helper to filter records by division accessibility in memory.
   * If user is operating from HO, returns all records.
   * If non-HO, filters to active records assigned to the user's active division ID.
   */
  filterRecordsByDivisionAccess<T extends { assignedDivisions?: AssignedDivisionInfo[]; isActive?: boolean }>(
    records: T[],
    activeDivisionId?: string,
    isHoActive?: boolean,
  ): T[] {
    if (isHoActive) {
      return records;
    }

    if (!activeDivisionId) {
      return [];
    }

    return records.filter(
      (rec) =>
        rec.isActive &&
        Array.isArray(rec.assignedDivisions) &&
        rec.assignedDivisions.some((d) => d.id === activeDivisionId),
    );
  }
}
