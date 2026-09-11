import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';

import { SupabaseService } from '../../supabase/supabase.service';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { ParameterDivisionService } from '../../common/services/parameter-division.service';
import { AuditService } from '../../common/services/audit.service';
import { CreatePincodeDto } from './dto/create-pincode.dto';
import { UpdatePincodeDto } from './dto/update-pincode.dto';

export interface PincodeRecord {
  id: string;
  pincode: string;
  city: string;
  district: string;
  state: string;
  country: string;
  countryCode: string;
  area: string;
  postOffice: string;
  isActive: boolean;
  assignedDivisions: {
    id: string;
    name: string;
    code: string;
    isHo: boolean;
  }[];
  createdAt: string;
  updatedAt: string;
}

/**
 * The existing DTO files do not currently expose all of the
 * location fields used by the Pincode service.
 *
 * These extended types keep the service strongly typed while
 * remaining compatible with the existing DTO classes.
 */
type PincodeLocationFields = {
  district?: string;
  countryCode?: string;
  area?: string;
  postOffice?: string;
};

type CreatePincodeServiceDto =
  CreatePincodeDto &
  PincodeLocationFields;

type UpdatePincodeServiceDto =
  UpdatePincodeDto &
  PincodeLocationFields;

@Injectable()
export class PincodeService {
  private readonly logger =
    new Logger(PincodeService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly parameterDivisionService: ParameterDivisionService,
    private readonly auditService: AuditService,
  ) { }

  /**
   * List Pincode master records.
   *
   * HO:
   *   - Can see all records.
   *
   * Division:
   *   - Can see only records assigned to the active division.
   */
  async listPincodes(
    user: AuthUser,
    search?: string,
    activeOnly = true,
  ): Promise<PincodeRecord[]> {
    const supabase =
      this.supabaseService.getClient();

    const isHO = Boolean(user.is_ho_active);

    const activeDivId =
      user.active_division_id;

    let query = supabase
      .from('pincodes')
      .select(`
        id,
        pincode,
        city,
        district,
        state,
        country,
        country_code,
        area,
        post_office,
        is_active,
        created_at,
        updated_at,
        pincode_divisions(
          division:divisions(
            id,
            name,
            code,
            is_ho
          )
        )
      `)
      .order('created_at', {
        ascending: false,
      });

    if (activeOnly) {
      query = query.eq(
        'is_active',
        true,
      );
    }

    if (search) {
      const escapedSearch =
        search.replace(
          /[%_,]/g,
          (character) =>
            `\\${character}`,
        );

      query = query.or(
        `pincode.ilike.%${escapedSearch}%,city.ilike.%${escapedSearch}%,district.ilike.%${escapedSearch}%,state.ilike.%${escapedSearch}%,country.ilike.%${escapedSearch}%`,
      );
    }

    const {
      data,
      error,
    } = await query;

    if (error) {
      this.logger.error(
        `Database query error: ${error.message}`,
      );

      return [];
    }

    if (
      !data ||
      data.length === 0
    ) {
      return [];
    }

    const records: PincodeRecord[] =
      data.map((row: any) => {
        const assignedDivisions =
          (row.pincode_divisions || [])
            .map(
              (pd: any) =>
                pd.division,
            )
            .filter(Boolean)
            .map(
              (division: any) => ({
                id: division.id,
                name: division.name,
                code: division.code,
                isHo: division.is_ho,
              }),
            );

        return {
          id: row.id,
          pincode: row.pincode,
          city: row.city,
          district:
            row.district || '',
          state: row.state,
          country:
            row.country || 'India',
          countryCode:
            row.country_code ||
            this.getCountryCode(
              row.country,
            ),
          area:
            row.area || '',
          postOffice:
            row.post_office || '',
          isActive:
            row.is_active,
          assignedDivisions,
          createdAt:
            row.created_at,
          updatedAt:
            row.updated_at,
        };
      });

    /**
     * HO is the Single Source of Truth.
     * HO can see all authoritative Pincode records.
     */
    if (isHO) {
      return records;
    }

    /**
     * Normal divisions can only see Pincodes
     * assigned to their active division.
     */
    if (!activeDivId) {
      return [];
    }

    return records.filter(
      (record) =>
        record.assignedDivisions.some(
          (division) =>
            division.id ===
            activeDivId,
        ),
    );
  }

  /**
   * Create a Pincode master record.
   *
   * IMPORTANT:
   * Only HO should be allowed to call this operation.
   * The controller/guard should enforce that permission.
   *
   * One Pincode = one authoritative master record.
   * Division assignments are stored separately.
   */
  async createPincode(
    dto: CreatePincodeServiceDto,
    user: AuthUser,
  ): Promise<PincodeRecord> {
    const supabase =
      this.supabaseService.getClient();

    const pincode =
      dto.pincode.trim();

    const city =
      dto.city.trim();

    const district =
      dto.district?.trim() || '';

    const state =
      dto.state.trim();

    const country =
      dto.country?.trim() ||
      'India';

    const countryCode =
      dto.countryCode
        ?.trim()
        .toUpperCase() ||
      this.getCountryCode(
        country,
      );

    const area =
      dto.area?.trim() || '';

    const postOffice =
      dto.postOffice?.trim() || '';

    /*
     * Check for an existing authoritative
     * location before inserting.
     */
    const {
      data: existing,
      error: existingError,
    } = await supabase
      .from('pincodes')
      .select('id')
      .eq(
        'pincode',
        pincode,
      )
      .eq(
        'city',
        city,
      )
      .eq(
        'district',
        district,
      )
      .eq(
        'state',
        state,
      )
      .eq(
        'country',
        country,
      )
      .maybeSingle();

    if (
      existingError &&
      existingError.code !==
      'PGRST116'
    ) {
      this.logger.warn(
        `Existing pincode check failed: ${existingError.message}`,
      );
    }

    if (existing) {
      throw new BadRequestException(
        'This postal code and location already exists.',
      );
    }

    /*
     * Insert ONE central authoritative record.
     */
    const {
      data: pincodeRow,
      error: pError,
    } = await supabase
      .from('pincodes')
      .insert({
        pincode,
        city,
        district,
        state,
        country,
        country_code:
          countryCode,
        area,
        post_office:
          postOffice,
        is_active: true,
      })
      .select()
      .single();

    if (
      pError ||
      !pincodeRow
    ) {
      this.logger.error(
        `Supabase create pincode error: ${pError?.message || ''
        }`,
      );

      /*
       * PostgreSQL unique constraint may catch
       * the same record in a concurrent request.
       */
      if (
        pError?.code ===
        '23505'
      ) {
        throw new BadRequestException(
          'This postal code and location already exists.',
        );
      }

      throw new BadRequestException(
        pError?.message ||
        'Could not create pincode in Supabase database.',
      );
    }

    /*
     * Division assignment.
     *
     * IMPORTANT:
     * These are relationships to the SAME
     * Pincode master record.
     *
     * No duplicate Pincode rows are created.
     */
    await this.parameterDivisionService.syncDivisionAssignments(
      'pincodes',
      pincodeRow.id,
      dto.assignedDivisionIds || [],
    );

    const createdRecord = await this.getPincodeById(pincodeRow.id);

    await this.auditService.logAction({
      entityType: 'pincodes',
      entityId: createdRecord.id,
      action: 'CREATE',
      user,
      changes: {
        pincode: createdRecord.pincode,
        city: createdRecord.city,
        state: createdRecord.state,
        country: createdRecord.country,
        assignedDivisions: createdRecord.assignedDivisions.map((d) => d.name),
      },
    });

    return createdRecord;
  }

  /**
   * Update the ONE authoritative Pincode master record.
   *
   * Only HO should be permitted to call this operation.
   */
  async updatePincode(
    id: string,
    dto: UpdatePincodeServiceDto,
    user: AuthUser,
  ): Promise<PincodeRecord> {
    const supabase =
      this.supabaseService.getClient();

    const existing = await this.getPincodeById(id);

    const updatePayload: Record<
      string,
      unknown
    > = {
      updated_at:
        new Date().toISOString(),
    };

    if (
      dto.city !== undefined
    ) {
      updatePayload.city =
        dto.city.trim();
    }

    if (
      dto.district !==
      undefined
    ) {
      updatePayload.district =
        dto.district.trim();
    }

    if (
      dto.state !== undefined
    ) {
      updatePayload.state =
        dto.state.trim();
    }

    if (
      dto.country !== undefined
    ) {
      updatePayload.country =
        dto.country.trim();
    }

    if (
      dto.countryCode !==
      undefined
    ) {
      updatePayload.country_code =
        dto.countryCode
          .trim()
          .toUpperCase();
    }

    if (
      dto.area !== undefined
    ) {
      updatePayload.area =
        dto.area.trim();
    }

    if (
      dto.postOffice !==
      undefined
    ) {
      updatePayload.post_office =
        dto.postOffice.trim();
    }

    if (
      dto.isActive !==
      undefined
    ) {
      updatePayload.is_active =
        dto.isActive;

      if (!dto.isActive) {
        updatePayload.deactivated_at =
          new Date().toISOString();
      } else {
        updatePayload.deactivated_at =
          null;
      }
    }

    const {
      error,
    } = await supabase
      .from('pincodes')
      .update(
        updatePayload,
      )
      .eq(
        'id',
        id,
      );

    if (error) {
      throw new BadRequestException(
        `Failed to update pincode in Supabase: ${error.message}`,
      );
    }

    if (Array.isArray(dto.assignedDivisionIds)) {
      await this.assignDivisions(
        id,
        dto.assignedDivisionIds,
        user,
      );
    }

    const updatedRecord = await this.getPincodeById(id);

    const diffs = this.auditService.computeFieldDiffs(
      existing as any,
      {
        city: dto.city,
        district: dto.district,
        state: dto.state,
        country: dto.country,
        countryCode: dto.countryCode,
        area: dto.area,
        postOffice: dto.postOffice,
        isActive: dto.isActive,
      },
    );

    if (Object.keys(diffs).length > 0) {
      await this.auditService.logAction({
        entityType: 'pincodes',
        entityId: id,
        action: 'UPDATE',
        user,
        changes: diffs,
      });
    }

    return updatedRecord;
  }

  /**
   * Soft-deactivate a Pincode.
   *
   * Only HO should be permitted to call this operation.
   */
  async deactivatePincode(
    id: string,
    user: AuthUser,
  ): Promise<{
    message: string;
    id: string;
  }> {
    await this.updatePincode(
      id,
      {
        isActive: false,
      },
      user,
    );

    await this.auditService.logAction({
      entityType: 'pincodes',
      entityId: id,
      action: 'DEACTIVATE',
      user,
      changes: {
        status: {
          label: 'Status',
          before: 'Active',
          after: 'Deactivated',
        },
      },
    });

    return {
      message:
        'Pincode deactivated in Supabase database (Soft Deleted).',
      id,
    };
  }

  /**
   * Activate a previously deactivated Pincode.
   *
   * Only HO should be permitted to call this operation.
   * Preserves existing division assignments so assigned divisions regain access.
   */
  async activatePincode(
    id: string,
    user: AuthUser,
  ): Promise<PincodeRecord> {
    const res = await this.updatePincode(
      id,
      {
        isActive: true,
      },
      user,
    );

    await this.auditService.logAction({
      entityType: 'pincodes',
      entityId: id,
      action: 'ACTIVATE',
      user,
      changes: {
        status: {
          label: 'Status',
          before: 'Deactivated',
          after: 'Active',
        },
      },
    });

    return res;
  }

  /**
   * Delete a Pincode master record.
   *
   * Only HO can delete a Parameter/Master record.
   */
  async deletePincode(
    id: string,
    user: AuthUser,
  ): Promise<{
    message: string;
    id: string;
  }> {
    const supabase =
      this.supabaseService.getClient();

    // Verify existence first
    const snapshot = await this.getPincodeById(id);

    // Remove relationships and master record
    await supabase
      .from('pincode_divisions')
      .delete()
      .eq('pincode_id', id);

    const { error } =
      await supabase
        .from('pincodes')
        .delete()
        .eq('id', id);

    if (error) {
      throw new BadRequestException(
        `Failed to delete pincode: ${error.message}`,
      );
    }

    await this.auditService.logAction({
      entityType: 'pincodes',
      entityId: id,
      action: 'DELETE',
      user,
      changes: {
        pincode: snapshot.pincode,
        city: snapshot.city,
        state: snapshot.state,
        country: snapshot.country,
        note: 'Record permanently deleted',
      },
    });

    return {
      message: 'Pincode permanently deleted from database.',
      id,
    };
  }

  /**
   * Replace the complete division assignment
   * list for one Pincode.
   */
  async assignDivisions(
    id: string,
    divisionIds: string[],
    user: AuthUser,
  ): Promise<PincodeRecord> {
    // Verify record exists first
    const existing = await this.getPincodeById(id);

    const supabase = this.supabaseService.getClient();
    const { data: divData } = await supabase.from('divisions').select('id, name');
    const allDivs = divData || [];

    const divisionDiff = this.auditService.computeDivisionAssignmentDiff(
      existing.assignedDivisions,
      divisionIds,
      allDivs,
    );

    try {
      await this.parameterDivisionService.syncDivisionAssignments(
        'pincodes',
        id,
        divisionIds,
      );
    } catch (err: any) {
      throw new BadRequestException(
        `Failed to update division assignments: ${err.message}`,
      );
    }

    if (divisionDiff.added.length > 0 || divisionDiff.removed.length > 0) {
      await this.auditService.logAction({
        entityType: 'pincodes',
        entityId: id,
        action: 'ASSIGN_DIVISIONS',
        user,
        changes: {
          assignedDivisions: {
            label: 'Assigned Divisions',
            added: divisionDiff.added,
            removed: divisionDiff.removed,
          },
        },
      });
    }

    return this.getPincodeById(id);
  }

  /**
   * Get one authoritative Pincode record
   * together with its division assignments.
   */
  private async getPincodeById(
    id: string,
  ): Promise<PincodeRecord> {
    const supabase =
      this.supabaseService.getClient();

    const {
      data,
      error,
    } = await supabase
      .from('pincodes')
      .select(`
        id,
        pincode,
        city,
        district,
        state,
        country,
        country_code,
        area,
        post_office,
        is_active,
        created_at,
        updated_at,
        pincode_divisions(
          division:divisions(
            id,
            name,
            code,
            is_ho
          )
        )
      `)
      .eq(
        'id',
        id,
      )
      .single();

    if (
      error ||
      !data
    ) {
      throw new NotFoundException(
        'Pincode record not found in Supabase database.',
      );
    }

    const assignedDivisions =
      (
        data.pincode_divisions ||
        []
      )
        .map(
          (pd: any) =>
            pd.division,
        )
        .filter(Boolean)
        .map(
          (division: any) => ({
            id: division.id,
            name: division.name,
            code: division.code,
            isHo: division.is_ho,
          }),
        );

    return {
      id: data.id,
      pincode: data.pincode,
      city: data.city,
      district:
        data.district || '',
      state: data.state,
      country:
        data.country || 'India',
      countryCode:
        data.country_code ||
        this.getCountryCode(
          data.country,
        ),
      area:
        data.area || '',
      postOffice:
        data.post_office || '',
      isActive:
        data.is_active,
      assignedDivisions,
      createdAt:
        data.created_at,
      updatedAt:
        data.updated_at,
    };
  }

  /**
   * Convert common country names into ISO-2 codes
   * when an older record does not yet have country_code.
   */
  private getCountryCode(
    country?: string,
  ): string {
    const normalized =
      (country || '')
        .trim()
        .toLowerCase();

    const countryMap: Record<
      string,
      string
    > = {
      india: 'IN',
      china: 'CN',
      'south korea': 'KR',
      korea: 'KR',
      afghanistan: 'AF',
      'united states': 'US',
      'united states of america':
        'US',
      usa: 'US',
      'united kingdom': 'GB',
      uk: 'GB',
      germany: 'DE',
      canada: 'CA',
      france: 'FR',
      australia: 'AU',
      'united arab emirates':
        'AE',
      japan: 'JP',
      indonesia: 'ID',
      mexico: 'MX',
      netherlands: 'NL',
      peru: 'PE',
      poland: 'PL',
      portugal: 'PT',
      singapore: 'SG',
    };

    return (
      countryMap[normalized] ||
      'IN'
    );
  }
}