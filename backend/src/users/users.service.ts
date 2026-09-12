import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { inMemoryUsersStore } from '../auth/pending-users.store';
import { AUTHORITATIVE_DIVISIONS } from '../divisions/divisions.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async listUsers(status?: string) {
    const supabase = this.supabaseService.getClient();

    let dbUsers: any[] = [];
    try {
      let query = supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          username,
          email,
          gender,
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
        dbUsers = data.map((u: any) => ({
          id: u.id,
          fullName: u.full_name,
          username: u.username,
          email: u.email,
          gender: u.gender,
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

    // Include in-memory users registered during session
    const memoryUsers = Array.from(inMemoryUsersStore.values())
      .filter((u) => !dbUsers.some((dbU) => dbU.username === u.username))
      .map((u) => ({
        id: u.id,
        fullName: u.fullName,
        username: u.username,
        email: u.email,
        gender: u.gender,
        mobileNumber: u.mobileNumber,
        status: u.status,
        isSuperAdmin: u.isSuperAdmin,
        createdAt: u.createdAt,
        primaryDivision: u.primaryDivision,
        authorizedDivisions: u.authorizedDivisions || [u.primaryDivision],
        roles: u.roles || [{ id: 'role-div-user', name: 'Division User' }],
      }));

    let allUsers = [...dbUsers, ...memoryUsers];

    // If database was empty / unmigrated, provide standard development accounts as well
    if (allUsers.length === 0 || (!dbUsers.length && !memoryUsers.some(u => u.username === 'ho_admin'))) {
      const demoUsers = [
        {
          id: '00000000-0000-0000-0000-000000000000',
          fullName: 'HO Administrator',
          username: 'ho_admin',
          email: 'ho_admin@skmsteels.com',
          gender: 'Male',
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
          email: 'inox@skmsteels.com',
          gender: 'Male',
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
      allUsers = [...allUsers, ...demoUsers];
    }

    if (status) {
      allUsers = allUsers.filter((u) => u.status === status);
    }

    return allUsers;
  }

  async updateUser(id: string, dto: any) {
    const supabase = this.supabaseService.getClient();

    const dbPayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (dto.fullName) dbPayload.full_name = dto.fullName;
    if (dto.email) dbPayload.email = dto.email;
    if (dto.gender) dbPayload.gender = dto.gender;
    if (dto.mobileNumber) dbPayload.mobile_number = dto.mobileNumber;
    if (dto.primaryDivisionId) dbPayload.primary_division_id = dto.primaryDivisionId;
    if (dto.status) dbPayload.status = dto.status;

    let normalizedUsername: string | undefined;
    if (dto.username) {
      normalizedUsername = dto.username.toLowerCase().trim();
      // Check memory store for collision with another user
      for (const [uname, u] of inMemoryUsersStore.entries()) {
        if (uname === normalizedUsername && u.id !== id) {
          throw new BadRequestException('Username is already taken');
        }
      }
      // Check database
      try {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', normalizedUsername)
          .neq('id', id)
          .single();
        if (existing) {
          throw new BadRequestException('Username is already taken');
        }
      } catch {
        // ignore
      }
      dbPayload.username = normalizedUsername;
    }

    // Handle Password reset/change or username change in Supabase Auth if provided
    const authAdminPayload: Record<string, any> = {};
    if (dto.password) {
      authAdminPayload.password = dto.password;
    }
    if (normalizedUsername) {
      authAdminPayload.email = `${normalizedUsername}@skmsteels.internal`;
    }
    if (Object.keys(authAdminPayload).length > 0) {
      try {
        await supabase.auth.admin.updateUserById(id, authAdminPayload);
      } catch (err: any) {
        this.logger.warn(`Supabase auth admin update error: ${err.message}`);
      }
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(dbPayload)
        .eq('id', id);

      if (error) {
        this.logger.debug(`Database update user info: ${error.message}`);
      }
    } catch {
      // ignore
    }

    // Also update in-memory store
    for (const [uname, u] of Array.from(inMemoryUsersStore.entries())) {
      if (u.id === id) {
        if (dto.fullName) u.fullName = dto.fullName;
        if (dto.email) u.email = dto.email;
        if (dto.gender) u.gender = dto.gender;
        if (dto.mobileNumber) u.mobileNumber = dto.mobileNumber;
        if (dto.status) u.status = dto.status;
        if (dto.password) u.password = dto.password;
        if (dto.primaryDivisionId) {
          const seeded = AUTHORITATIVE_DIVISIONS.map((d, index) => ({
            id: `10000000-0000-0000-0000-${index.toString().padStart(12, '0')}`,
            name: d.name,
            code: d.code,
            is_ho: d.is_ho,
          }));
          const found = seeded.find((d) => d.id === dto.primaryDivisionId);
          if (found) {
            u.primaryDivision = found;
          }
        }
        if (normalizedUsername && normalizedUsername !== uname) {
          u.username = normalizedUsername;
          inMemoryUsersStore.delete(uname);
          inMemoryUsersStore.set(normalizedUsername, u);
        }
        break;
      }
    }

    // Handle atomic division assignment if provided
    let assignedDivisions: any[] = [];
    if (Array.isArray(dto.divisionIds)) {
      try {
        const divRes = await this.assignDivisions(id, dto.divisionIds);
        assignedDivisions = divRes?.divisions || [];
      } catch (err: any) {
        this.logger.debug(`assignDivisions in updateUser error: ${err.message}`);
      }
    }

    // Handle atomic role assignment if provided
    let assignedRoles: any[] = [];
    if (Array.isArray(dto.roleIds)) {
      try {
        const roleRes = await this.assignRoles(id, dto.roleIds);
        assignedRoles = roleRes?.roles || [];
      } catch (err: any) {
        this.logger.debug(`assignRoles in updateUser error: ${err.message}`);
      }
    }

    this.supabaseService.broadcastEvent('USER_UPDATED', {
      id,
      ...dto,
      divisions: assignedDivisions,
      roles: assignedRoles,
    });

    return {
      message: 'User updated successfully',
      id,
      ...dto,
      divisions: assignedDivisions,
      roles: assignedRoles,
    };
  }

  async deleteUser(id: string) {
    const supabase = this.supabaseService.getClient();

    try {
      // Delete associated junction records
      await supabase.from('user_divisions').delete().eq('user_id', id);
      await supabase.from('user_roles').delete().eq('user_id', id);
      // Delete profile
      await supabase.from('profiles').delete().eq('id', id);
      // Delete Supabase Auth user
      await supabase.auth.admin.deleteUser(id);
    } catch (err: any) {
      this.logger.warn(`Database delete user info: ${err.message}`);
    }

    // Remove from inMemoryUsersStore
    for (const [uname, u] of inMemoryUsersStore.entries()) {
      if (u.id === id) {
        inMemoryUsersStore.delete(uname);
        break;
      }
    }

    this.supabaseService.broadcastEvent('USER_DELETED', { userId: id });

    return { message: 'User deleted successfully', id };
  }

  async updateUserStatus(id: string, status: string) {
    // Also update in-memory store
    for (const u of inMemoryUsersStore.values()) {
      if (u.id === id) {
        u.status = status as any;
        break;
      }
    }

    const supabase = this.supabaseService.getClient();

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        this.logger.debug(`Database update user status info: ${error.message}`);
      }
    } catch {
      // ignore unmigrated
    }

    return { message: `User status updated to ${status}`, id, status };
  }

  async assignDivisions(userId: string, divisionIds: string[]) {
    const supabase = this.supabaseService.getClient();

    try {
      await supabase.from('user_divisions').delete().eq('user_id', userId);

      const rows = divisionIds.map((divId) => ({
        user_id: userId,
        division_id: divId,
      }));

      if (rows.length > 0) {
        await supabase.from('user_divisions').insert(rows);
      }
    } catch (err: any) {
      this.logger.debug(`Database assign divisions info: ${err.message}`);
    }

    // Load full division objects
    let assignedDivisions: any[] = [];
    try {
      const { data } = await supabase
        .from('divisions')
        .select('id, name, code, is_ho')
        .in('id', divisionIds);
      if (data && data.length > 0) {
        assignedDivisions = data;
      }
    } catch {
      // ignore
    }

    if (assignedDivisions.length === 0) {
      // Fallback deterministic resolution if unmigrated
      const hoDivision = {
        id: '10000000-0000-0000-0000-000000000000',
        name: 'SKM STEELS LIMITED (HO)',
        code: 'DIV_HO',
        is_ho: true,
      };
      const inoxDivision = {
        id: '10000000-0000-0000-0000-000000000001',
        name: 'SKM Inox',
        code: 'DIV_INOX',
        is_ho: false,
      };
      assignedDivisions = [hoDivision, inoxDivision].filter((d) =>
        divisionIds.includes(d.id),
      );
    }

    // Update in-memory user if exists
    for (const u of inMemoryUsersStore.values()) {
      if (u.id === userId) {
        u.authorizedDivisions = assignedDivisions;
        break;
      }
    }

    this.supabaseService.broadcastEvent('DIVISIONS_UPDATED', {
      userId,
      divisionIds,
      divisions: assignedDivisions,
    });

    return {
      message: 'Authorized divisions assigned successfully',
      userId,
      divisionIds,
      divisions: assignedDivisions,
    };
  }

  async assignRoles(userId: string, roleIds: string[]) {
    const supabase = this.supabaseService.getClient();

    try {
      await supabase.from('user_roles').delete().eq('user_id', userId);

      const rows = roleIds.map((roleId) => ({
        user_id: userId,
        role_id: roleId,
      }));

      if (rows.length > 0) {
        await supabase.from('user_roles').insert(rows);
      }
    } catch (err: any) {
      this.logger.debug(`Database assign roles info: ${err.message}`);
    }

    const allRoles = await this.listRoles();
    const assignedRoles = allRoles.filter((r) => roleIds.includes(r.id));

    // Update in-memory user if exists
    for (const u of inMemoryUsersStore.values()) {
      if (u.id === userId) {
        u.roles = assignedRoles.map((r) => ({ id: r.id, name: r.name }));
        break;
      }
    }

    return {
      message: 'Roles assigned successfully',
      userId,
      roleIds,
      roles: assignedRoles,
    };
  }

  async listRoles() {
    const supabase = this.supabaseService.getClient();

    try {
      const { data, error } = await supabase
        .from('roles')
        .select(`
          id,
          name,
          description,
          is_system,
          role_permissions(permission:permissions(code, module, entity, action, description))
        `);

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {
      // ignore
    }

    return [
      {
        id: 'role-super-admin',
        name: 'Super Admin',
        description: 'Full unrestricted enterprise-wide access across all divisions and modules',
        is_system: true,
      },
      {
        id: 'role-ho-admin',
        name: 'HO Administrator',
        description: 'Head Office administrator with complete management of Parameters and Masters',
        is_system: true,
      },
      {
        id: 'role-ho-staff',
        name: 'HO Staff',
        description: 'Head Office staff with view, create, edit capabilities for assigned modules',
        is_system: false,
      },
      {
        id: 'role-div-manager',
        name: 'Division Manager',
        description: 'Branch/Division level manager with operational oversight and view/use access',
        is_system: false,
      },
      {
        id: 'role-div-user',
        name: 'Division User',
        description: 'Standard divisional operator with view and use permissions for assigned records',
        is_system: false,
      },
    ];
  }
}
