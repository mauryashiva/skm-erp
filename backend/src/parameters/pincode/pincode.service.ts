import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';

import { SupabaseService } from '../../supabase/supabase.service';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
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

    const isHO =
      user.is_ho_active ||
      user.is_super_admin;

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
    const assignedIds =
      new Set<string>(
        dto.assignedDivisionIds ||
        [],
      );

    /*
     * Existing behavior:
     * Keep the current user's active division
     * assigned when available.
     */
    if (
      user.active_division_id
    ) {
      assignedIds.add(
        user.active_division_id,
      );
    }

    /*
     * HO must always have access.
     */
    const {
      data: hoDiv,
    } = await supabase
      .from('divisions')
      .select('id')
      .eq(
        'is_ho',
        true,
      )
      .limit(1)
      .maybeSingle();

    if (hoDiv) {
      assignedIds.add(
        hoDiv.id,
      );
    }

    const assignments =
      Array.from(
        assignedIds,
      ).map(
        (divisionId) => ({
          pincode_id:
            pincodeRow.id,
          division_id:
            divisionId,
        }),
      );

    if (
      assignments.length > 0
    ) {
      const {
        error: assignErr,
      } = await supabase
        .from(
          'pincode_divisions',
        )
        .insert(
          assignments,
        );

      if (assignErr) {
        this.logger.warn(
          `Could not save division assignments: ${assignErr.message}`,
        );
      }
    }

    return this.getPincodeById(
      pincodeRow.id,
    );
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

    return this.getPincodeById(
      id,
    );
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

    return {
      message:
        'Pincode deactivated in Supabase database (Soft Deleted).',
      id,
    };
  }

  /**
   * Replace the complete division assignment
   * list for one Pincode.
   *
   * Example:
   *
   * Existing:
   *   HO + Indore + Mumbai
   *
   * New:
   *   HO + Indore
   *
   * Result:
   *   Mumbai immediately loses access.
   *
   * The Pincode master itself is NOT deleted.
   */
  async assignDivisions(
    id: string,
    divisionIds: string[],
    user: AuthUser,
  ): Promise<PincodeRecord> {
    const supabase =
      this.supabaseService.getClient();

    /*
     * Make sure the Pincode exists first.
     */
    const {
      data: existingPincode,
      error: pincodeError,
    } =
      await supabase
        .from('pincodes')
        .select('id')
        .eq(
          'id',
          id,
        )
        .maybeSingle();

    if (
      pincodeError ||
      !existingPincode
    ) {
      throw new NotFoundException(
        'Pincode record not found.',
      );
    }

    /*
     * HO must always remain assigned.
     */
    const {
      data: hoDiv,
    } = await supabase
      .from('divisions')
      .select('id')
      .eq(
        'is_ho',
        true,
      )
      .limit(1)
      .maybeSingle();

    const finalDivIds =
      new Set(
        divisionIds || [],
      );

    if (hoDiv) {
      finalDivIds.add(
        hoDiv.id,
      );
    }

    /*
     * Remove old assignments.
     *
     * This is what makes removing a division
     * from "Copy To" immediately remove that
     * division's access.
     */
    const {
      error: deleteError,
    } = await supabase
      .from(
        'pincode_divisions',
      )
      .delete()
      .eq(
        'pincode_id',
        id,
      );

    if (deleteError) {
      throw new BadRequestException(
        `Failed to remove existing division assignments: ${deleteError.message}`,
      );
    }

    /*
     * Insert the new assignment relationships.
     */
    const insertRows =
      Array.from(
        finalDivIds,
      ).map(
        (divisionId) => ({
          pincode_id: id,
          division_id:
            divisionId,
        }),
      );

    if (
      insertRows.length > 0
    ) {
      const {
        error: insertError,
      } = await supabase
        .from(
          'pincode_divisions',
        )
        .insert(
          insertRows,
        );

      if (insertError) {
        throw new BadRequestException(
          `Failed to update division assignments: ${insertError.message}`,
        );
      }
    }

    return this.getPincodeById(
      id,
    );
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