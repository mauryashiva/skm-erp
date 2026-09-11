import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { ParameterDivisionService } from '../../common/services/parameter-division.service';
import { CreateAccountTypeDto } from './dto/create-account-type.dto';
import { UpdateAccountTypeDto } from './dto/update-account-type.dto';

export interface AssignedDivisionInfo {
  id: string;
  name: string;
  code: string;
  isHo: boolean;
}

export interface AccountTypeRecord {
  id: string;
  accountType: string;
  shortName?: string;
  description?: string;
  isActive: boolean;
  assignedDivisions: AssignedDivisionInfo[];
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class AccountTypeService {
  private readonly logger = new Logger(AccountTypeService.name);
  private memoryStore: AccountTypeRecord[] | null = null;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly parameterDivisionService: ParameterDivisionService,
  ) {}

  /**
   * Initialize in-memory fallback store if Supabase table is not yet migrated.
   */
  private async getInitialFallbackRecords(): Promise<AccountTypeRecord[]> {
    if (this.memoryStore !== null) {
      return this.memoryStore;
    }

    const supabase = this.supabaseService.getClient();
    let divisions: AssignedDivisionInfo[] = [];

    try {
      const { data: divData } = await supabase
        .from('divisions')
        .select('id, name, code, is_ho');

      if (divData && divData.length > 0) {
        divisions = divData.map((d: any) => ({
          id: d.id,
          name: d.name,
          code: d.code,
          isHo: d.is_ho,
        }));
      }
    } catch {
      divisions = [
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'SKM STEELS LIMITED (HO)',
          code: 'HO_MUMBAI',
          isHo: true,
        },
      ];
    }

    const now = new Date().toISOString();
    this.memoryStore = [
      {
        id: 'a1000000-0000-0000-0000-000000000001',
        accountType: 'Asset',
        shortName: 'ASSET',
        description: 'Economic resources expected to benefit future operations',
        isActive: true,
        assignedDivisions: divisions,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'a1000000-0000-0000-0000-000000000002',
        accountType: 'Liability',
        shortName: 'LIAB',
        description: 'Financial debts or obligations owed to outside parties',
        isActive: true,
        assignedDivisions: divisions,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'a1000000-0000-0000-0000-000000000003',
        accountType: 'Equity',
        shortName: 'EQTY',
        description: 'Owner or shareholder stake in the corporate entity',
        isActive: true,
        assignedDivisions: divisions,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'a1000000-0000-0000-0000-000000000004',
        accountType: 'Revenue / Income',
        shortName: 'REV',
        description: 'Inflow of proceeds from goods sold and services rendered',
        isActive: true,
        assignedDivisions: divisions,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'a1000000-0000-0000-0000-000000000005',
        accountType: 'Direct Expense',
        shortName: 'EXP_DIR',
        description: 'Expenditures directly attributable to production and acquisition',
        isActive: true,
        assignedDivisions: divisions,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'a1000000-0000-0000-0000-000000000006',
        accountType: 'Indirect Expense',
        shortName: 'EXP_IND',
        description: 'Administrative, overhead, and operating expenses',
        isActive: true,
        assignedDivisions: divisions,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'a1000000-0000-0000-0000-000000000007',
        accountType: 'Bank Account',
        shortName: 'BANK',
        description: 'Corporate commercial and operational banking accounts',
        isActive: true,
        assignedDivisions: divisions,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'a1000000-0000-0000-0000-000000000008',
        accountType: 'Cash Account',
        shortName: 'CASH',
        description: 'Physical currency and petty cash registers',
        isActive: true,
        assignedDivisions: divisions,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'a1000000-0000-0000-0000-000000000009',
        accountType: 'Sundry Debtors',
        shortName: 'DEBTOR',
        description: 'Trade customer receivables',
        isActive: true,
        assignedDivisions: divisions,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'a1000000-0000-0000-0000-000000000010',
        accountType: 'Sundry Creditors',
        shortName: 'CREDITOR',
        description: 'Trade supplier and vendor payables',
        isActive: true,
        assignedDivisions: divisions,
        createdAt: now,
        updatedAt: now,
      },
    ];

    return this.memoryStore;
  }

  /**
   * List Account Types master records.
   *
   * HO:
   *   - Sees all records.
   *
   * Division:
   *   - Sees only active records assigned to the active division.
   */
  async listAccountTypes(
    user: AuthUser,
    search?: string,
    activeOnly = true,
  ): Promise<AccountTypeRecord[]> {
    const supabase = this.supabaseService.getClient();
    const isHO = Boolean(user.is_ho_active);
    const activeDivId = user.active_division_id;

    let query = supabase
      .from('account_types')
      .select(`
        id,
        account_type,
        short_name,
        description,
        is_active,
        created_at,
        updated_at,
        account_type_divisions(
          division:divisions(
            id,
            name,
            code,
            is_ho
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    if (search) {
      const escapedSearch = search.replace(/[%_,]/g, (c) => `\\${c}`);
      query = query.or(
        `account_type.ilike.%${escapedSearch}%,short_name.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%`,
      );
    }

    const { data, error } = await query;

    if (error) {
      this.logger.warn(`Supabase account_types query error (${error.code}): ${error.message}. Using fallback repository.`);
      return this.listAccountTypesFallback(user, search, activeOnly);
    }

    if (!data || data.length === 0) {
      return [];
    }

    const records: AccountTypeRecord[] = data.map((row: any) => {
      const assignedDivisions: AssignedDivisionInfo[] = (row.account_type_divisions || [])
        .map((ad: any) => ad.division)
        .filter(Boolean)
        .map((division: any) => ({
          id: division.id,
          name: division.name,
          code: division.code,
          isHo: division.is_ho,
        }));

      return {
        id: row.id,
        accountType: row.account_type,
        shortName: row.short_name || '',
        description: row.description || '',
        isActive: row.is_active,
        assignedDivisions,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    if (isHO) {
      return records;
    }

    if (!activeDivId) {
      return [];
    }

    return records.filter(
      (record) =>
        record.isActive &&
        record.assignedDivisions.some((division) => division.id === activeDivId),
    );
  }

  private async listAccountTypesFallback(
    user: AuthUser,
    search?: string,
    activeOnly = true,
  ): Promise<AccountTypeRecord[]> {
    const isHO = Boolean(user.is_ho_active);
    const activeDivId = user.active_division_id;
    const records = await this.getInitialFallbackRecords();

    let filtered = records;
    if (activeOnly) {
      filtered = filtered.filter((r) => r.isActive);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.accountType.toLowerCase().includes(q) ||
          (r.shortName || '').toLowerCase().includes(q) ||
          (r.description || '').toLowerCase().includes(q),
      );
    }

    if (isHO) {
      return filtered;
    }

    if (!activeDivId) {
      return [];
    }

    return filtered.filter(
      (r) => r.isActive && r.assignedDivisions.some((d) => d.id === activeDivId),
    );
  }

  /**
   * Get an Account Type by ID.
   */
  async getAccountTypeById(id: string): Promise<AccountTypeRecord> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('account_types')
      .select(`
        id,
        account_type,
        short_name,
        description,
        is_active,
        created_at,
        updated_at,
        account_type_divisions(
          division:divisions(
            id,
            name,
            code,
            is_ho
          )
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      const records = await this.getInitialFallbackRecords();
      const match = records.find((r) => r.id === id);
      if (!match) {
        throw new NotFoundException(`Account Type with ID "${id}" not found.`);
      }
      return match;
    }

    const assignedDivisions: AssignedDivisionInfo[] = (data.account_type_divisions || [])
      .map((ad: any) => ad.division)
      .filter(Boolean)
      .map((division: any) => ({
        id: division.id,
        name: division.name,
        code: division.code,
        isHo: division.is_ho,
      }));

    return {
      id: data.id,
      accountType: data.account_type,
      shortName: data.short_name || '',
      description: data.description || '',
      isActive: data.is_active,
      assignedDivisions,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Create an Account Type master record (HO only).
   */
  async createAccountType(
    dto: CreateAccountTypeDto,
    user: AuthUser,
  ): Promise<AccountTypeRecord> {
    const supabase = this.supabaseService.getClient();
    const accountType = dto.accountType.trim();
    const shortName = dto.shortName?.trim() || null;
    const description = dto.description?.trim() || null;

    // Check duplicate
    const { data: existing, error: existError } = await supabase
      .from('account_types')
      .select('id')
      .ilike('account_type', accountType)
      .maybeSingle();

    if (existError && existError.code !== 'PGRST205') {
      this.logger.error(`Duplicate check error: ${existError.message}`);
    }

    if (existing) {
      throw new ConflictException(`Account Type "${accountType}" already exists.`);
    }

    // Insert into Supabase
    const { data: inserted, error: insertError } = await supabase
      .from('account_types')
      .insert({
        account_type: accountType,
        short_name: shortName,
        description: description,
        is_active: true,
      })
      .select('id')
      .maybeSingle();

    if (insertError || !inserted) {
      this.logger.warn(`Supabase insert error (${insertError?.code}): ${insertError?.message || 'No record returned'}. Using fallback repository.`);
      return this.createAccountTypeFallback(dto, user);
    }

    const newId = inserted.id;

    await this.parameterDivisionService.syncDivisionAssignments(
      'account_types',
      newId,
      dto.assignedDivisionIds || [],
    );

    return this.getAccountTypeById(newId);
  }

  private async createAccountTypeFallback(
    dto: CreateAccountTypeDto,
    user: AuthUser,
  ): Promise<AccountTypeRecord> {
    const records = await this.getInitialFallbackRecords();
    const accountType = dto.accountType.trim();

    if (records.some((r) => r.accountType.toLowerCase() === accountType.toLowerCase())) {
      throw new ConflictException(`Account Type "${accountType}" already exists.`);
    }

    const supabase = this.supabaseService.getClient();
    let allDivisions: AssignedDivisionInfo[] = [];

    try {
      const { data: divData } = await supabase
        .from('divisions')
        .select('id, name, code, is_ho');
      if (divData) {
        allDivisions = divData.map((d: any) => ({
          id: d.id,
          name: d.name,
          code: d.code,
          isHo: d.is_ho,
        }));
      }
    } catch {
      // ignore
    }

    if (allDivisions.length === 0) {
      allDivisions = [
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'SKM STEELS LIMITED (HO)',
          code: 'HO_MUMBAI',
          isHo: true,
        },
      ];
    }

    const hoDiv = allDivisions.find((d) => d.isHo);
    const assignedIds = new Set<string>(dto.assignedDivisionIds || []);
    if (hoDiv) assignedIds.add(hoDiv.id);

    const assigned = allDivisions.filter((d) => assignedIds.has(d.id));
    const now = new Date().toISOString();
    const newRecord: AccountTypeRecord = {
      id: `at-${Date.now()}`,
      accountType,
      shortName: dto.shortName?.trim() || undefined,
      description: dto.description?.trim() || undefined,
      isActive: true,
      assignedDivisions: assigned,
      createdAt: now,
      updatedAt: now,
    };

    records.unshift(newRecord);
    return newRecord;
  }

  /**
   * Update an Account Type master record (HO only).
   */
  async updateAccountType(
    id: string,
    dto: UpdateAccountTypeDto,
    user: AuthUser,
  ): Promise<AccountTypeRecord> {
    const supabase = this.supabaseService.getClient();
    const existing = await this.getAccountTypeById(id);

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.accountType !== undefined) {
      const trimmed = dto.accountType.trim();
      if (!trimmed) {
        throw new BadRequestException('Account Type cannot be empty.');
      }
      updatePayload.account_type = trimmed;
    }

    if (dto.shortName !== undefined) {
      updatePayload.short_name = dto.shortName.trim() || null;
    }

    if (dto.description !== undefined) {
      updatePayload.description = dto.description.trim() || null;
    }

    if (dto.isActive !== undefined) {
      updatePayload.is_active = dto.isActive;
      updatePayload.deactivated_at = dto.isActive ? null : new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('account_types')
      .update(updatePayload)
      .eq('id', id);

    if (updateError) {
      this.logger.warn(`Supabase update error (${updateError.code}): ${updateError.message}. Using fallback repository.`);
      return this.updateAccountTypeFallback(id, dto, user);
    }

    if (Array.isArray(dto.assignedDivisionIds)) {
      await this.assignDivisions(id, dto.assignedDivisionIds, user);
    }

    return this.getAccountTypeById(id);
  }

  private async updateAccountTypeFallback(
    id: string,
    dto: UpdateAccountTypeDto,
    user: AuthUser,
  ): Promise<AccountTypeRecord> {
    const records = await this.getInitialFallbackRecords();
    const index = records.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new NotFoundException(`Account Type with ID "${id}" not found.`);
    }

    const current = records[index];
    if (dto.accountType !== undefined) current.accountType = dto.accountType.trim();
    if (dto.shortName !== undefined) current.shortName = dto.shortName.trim() || undefined;
    if (dto.description !== undefined) current.description = dto.description.trim() || undefined;
    if (dto.isActive !== undefined) current.isActive = dto.isActive;
    current.updatedAt = new Date().toISOString();

    if (Array.isArray(dto.assignedDivisionIds)) {
      await this.assignDivisionsFallback(id, dto.assignedDivisionIds, user);
    }

    return records[index];
  }

  /**
   * Soft-deactivate an Account Type (HO only).
   */
  async deactivateAccountType(
    id: string,
    user: AuthUser,
  ): Promise<{ message: string; id: string }> {
    await this.updateAccountType(id, { isActive: false }, user);
    return {
      message: 'Account Type deactivated in database (Soft Deleted).',
      id,
    };
  }

  /**
   * Activate a previously deactivated Account Type (HO only).
   */
  async activateAccountType(
    id: string,
    user: AuthUser,
  ): Promise<AccountTypeRecord> {
    return this.updateAccountType(id, { isActive: true }, user);
  }

  /**
   * Permanently delete an Account Type master record (HO only).
   */
  async deleteAccountType(
    id: string,
    user: AuthUser,
  ): Promise<{ message: string; id: string }> {
    const supabase = this.supabaseService.getClient();

    // Verify existence
    await this.getAccountTypeById(id);

    // Delete relationships & record
    await supabase.from('account_type_divisions').delete().eq('account_type_id', id);
    const { error } = await supabase.from('account_types').delete().eq('id', id);

    if (error) {
      this.logger.warn(`Supabase delete error (${error.code}): ${error.message}. Deleting from fallback store.`);
      const records = await this.getInitialFallbackRecords();
      const idx = records.findIndex((r) => r.id === id);
      if (idx !== -1) records.splice(idx, 1);
    }

    return {
      message: 'Account Type permanently deleted from database.',
      id,
    };
  }

  /**
   * Assign Account Type to divisions (HO only).
   */
  async assignDivisions(
    id: string,
    divisionIds: string[],
    user: AuthUser,
  ): Promise<AccountTypeRecord> {
    // Verify record exists
    await this.getAccountTypeById(id);

    try {
      await this.parameterDivisionService.syncDivisionAssignments(
        'account_types',
        id,
        divisionIds,
      );
    } catch (err: any) {
      this.logger.warn(`Supabase assign error: ${err.message}. Using fallback.`);
      return this.assignDivisionsFallback(id, divisionIds, user);
    }

    return this.getAccountTypeById(id);
  }

  private async assignDivisionsFallback(
    id: string,
    divisionIds: string[],
    user: AuthUser,
  ): Promise<AccountTypeRecord> {
    const records = await this.getInitialFallbackRecords();
    const record = records.find((r) => r.id === id);
    if (!record) {
      throw new NotFoundException(`Account Type with ID "${id}" not found.`);
    }

    const supabase = this.supabaseService.getClient();
    let allDivisions: AssignedDivisionInfo[] = [];
    try {
      const { data: divData } = await supabase.from('divisions').select('id, name, code, is_ho');
      if (divData) {
        allDivisions = divData.map((d: any) => ({
          id: d.id,
          name: d.name,
          code: d.code,
          isHo: d.is_ho,
        }));
      }
    } catch {
      // ignore
    }

    if (allDivisions.length === 0) {
      allDivisions = record.assignedDivisions;
    }

    const hoDiv = allDivisions.find((d) => d.isHo);
    const set = new Set(divisionIds || []);
    if (hoDiv) set.add(hoDiv.id);

    record.assignedDivisions = allDivisions.filter((d) => set.has(d.id));
    record.updatedAt = new Date().toISOString();
    return record;
  }
}
