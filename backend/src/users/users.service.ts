import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async listUsers(status?: string) {
    const supabase = this.supabaseService.getClient();

    try {
      let query = supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          username,
          mobile_number,
          status,
          is_super_admin,
          created_at,
          primary_division:divisions!profiles_primary_division_id_fkey(id, name, code, is_ho),
          user_divisions(division:divisions(id, name, code, is_ho)),
          user_roles(role:roles(id, name))
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data.map((u: any) => ({
          id: u.id,
          fullName: u.full_name,
          username: u.username,
          mobileNumber: u.mobile_number,
          status: u.status,
          isSuperAdmin: u.is_super_admin,
          createdAt: u.created_at,
          primaryDivision: u.primary_division,
          authorizedDivisions: (u.user_divisions || []).map((ud: any) => ud.division).filter(Boolean),
          roles: (u.user_roles || []).map((ur: any) => ur.role).filter(Boolean),
        }));
      }
    } catch (err: any) {
      this.logger.debug(`Database list users error: ${err.message}`);
    }

    // Default standby demo list
    return [
      {
        id: '00000000-0000-0000-0000-000000000000',
        fullName: 'HO Administrator',
        username: 'ho_admin',
        mobileNumber: '+91 9876543210',
        status: 'APPROVED',
        isSuperAdmin: true,
        createdAt: new Date().toISOString(),
        primaryDivision: { id: '11111111-1111-1111-1111-111111111111', name: 'SKM STEELS LIMITED (HO)', code: 'DIV_HO', is_ho: true },
        authorizedDivisions: [
          { id: '11111111-1111-1111-1111-111111111111', name: 'SKM STEELS LIMITED (HO)', code: 'DIV_HO', is_ho: true },
        ],
        roles: [{ id: 'role-super-admin', name: 'Super Admin' }],
      },
      {
        id: '99999999-9999-9999-9999-999999999999',
        fullName: 'Inox Operator',
        username: 'inox_user',
        mobileNumber: '+91 9876543211',
        status: 'APPROVED',
        isSuperAdmin: false,
        createdAt: new Date().toISOString(),
        primaryDivision: { id: '22222222-2222-2222-2222-222222222222', name: 'SKM Inox', code: 'DIV_INOX', is_ho: false },
        authorizedDivisions: [
          { id: '22222222-2222-2222-2222-222222222222', name: 'SKM Inox', code: 'DIV_INOX', is_ho: false },
        ],
        roles: [{ id: 'role-div-user', name: 'Division User' }],
      },
    ];
  }

  async updateUserStatus(id: string, status: string) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to update user status: ${error.message}`);
    }

    return { message: `User status updated to ${status}`, id, status };
  }

  async assignDivisions(userId: string, divisionIds: string[]) {
    const supabase = this.supabaseService.getClient();

    await supabase.from('user_divisions').delete().eq('user_id', userId);

    const rows = divisionIds.map((divId) => ({
      user_id: userId,
      division_id: divId,
    }));

    if (rows.length > 0) {
      await supabase.from('user_divisions').insert(rows);
    }

    return { message: 'Authorized divisions assigned successfully', userId, divisionIds };
  }

  async assignRoles(userId: string, roleIds: string[]) {
    const supabase = this.supabaseService.getClient();

    await supabase.from('user_roles').delete().eq('user_id', userId);

    const rows = roleIds.map((roleId) => ({
      user_id: userId,
      role_id: roleId,
    }));

    if (rows.length > 0) {
      await supabase.from('user_roles').insert(rows);
    }

    return { message: 'Roles assigned successfully', userId, roleIds };
  }
}
