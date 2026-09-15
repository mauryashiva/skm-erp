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
          permissions: u.permissions || [],
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
        permissions: u.permissions || [],
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

  /**
   * Helper to ensure user ID is a valid PostgreSQL UUID.
   * If an in-memory session or legacy username-based ID is provided,
   * it resolves the real UUID from Supabase profiles.
   */
  private async resolveUserId(id: string): Promise<string> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) return id;

    const supabase = this.supabaseService.getClient();
    const memUser = Array.from(inMemoryUsersStore.values()).find((u) => u.id === id);
    if (memUser) {
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', memUser.username)
          .single();
        if (prof?.id) {
          memUser.id = prof.id;
          return prof.id;
        }
      } catch {
        // ignore
      }
    }
    return id;
  }

  async updateUser(id: string, dto: any) {
    const supabase = this.supabaseService.getClient();
    const targetId = await this.resolveUserId(id);

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
        if (uname === normalizedUsername && u.id !== id && u.id !== targetId) {
          throw new BadRequestException('Username is already taken');
        }
      }
      // Check database
      try {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', normalizedUsername)
          .neq('id', targetId)
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
        await supabase.auth.admin.updateUserById(targetId, authAdminPayload);
      } catch (err: any) {
        this.logger.warn(`Supabase auth admin update error: ${err.message}`);
      }
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(dbPayload)
        .eq('id', targetId);

      if (error) {
        this.logger.warn(`Database update user profile info: ${error.message}`);
      }
    } catch {
      // ignore
    }

    // Also update in-memory store
    for (const [uname, u] of Array.from(inMemoryUsersStore.entries())) {
      if (u.id === id || u.id === targetId) {
        u.id = targetId;
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
        const divRes = await this.assignDivisions(targetId, dto.divisionIds);
        assignedDivisions = divRes?.divisions || [];
      } catch (err: any) {
        this.logger.debug(`assignDivisions in updateUser error: ${err.message}`);
      }
    }

    // Handle atomic role assignment if provided
    let assignedRoles: any[] = [];
    if (Array.isArray(dto.roleIds)) {
      try {
        const roleRes = await this.assignRoles(targetId, dto.roleIds);
        assignedRoles = roleRes?.roles || [];
      } catch (err: any) {
        this.logger.debug(`assignRoles in updateUser error: ${err.message}`);
      }
    }

    // Handle direct permissions array update if provided
    if (Array.isArray(dto.permissions)) {
      for (const u of inMemoryUsersStore.values()) {
        if (u.id === id || u.id === targetId) {
          u.permissions = dto.permissions;
          break;
        }
      }
      try {
        await supabase
          .from('profiles')
          .update({ permissions: dto.permissions, updated_at: new Date().toISOString() })
          .eq('id', targetId);
      } catch (err: any) {
        this.logger.debug(`Database update permissions info: ${err.message}`);
      }
    }

    this.supabaseService.broadcastEvent('USER_UPDATED', {
      id: targetId,
      ...dto,
      divisions: assignedDivisions,
      roles: assignedRoles,
    });

    return {
      message: 'User updated successfully',
      id: targetId,
      ...dto,
      divisions: assignedDivisions,
      roles: assignedRoles,
    };
  }

  async deleteUser(id: string) {
    const supabase = this.supabaseService.getClient();
    const targetId = await this.resolveUserId(id);

    try {
      // Delete associated junction records
      await supabase.from('user_divisions').delete().eq('user_id', targetId);
      await supabase.from('user_roles').delete().eq('user_id', targetId);
      // Delete profile
      await supabase.from('profiles').delete().eq('id', targetId);
      // Delete Supabase Auth user
      await supabase.auth.admin.deleteUser(targetId);
    } catch (err: any) {
      this.logger.warn(`Database delete user info: ${err.message}`);
    }

    // Remove from inMemoryUsersStore
    for (const [uname, u] of inMemoryUsersStore.entries()) {
      if (u.id === id || u.id === targetId) {
        inMemoryUsersStore.delete(uname);
        break;
      }
    }

    this.supabaseService.broadcastEvent('USER_DELETED', { userId: targetId });

    return { message: 'User deleted successfully', id: targetId };
  }

  async updateUserStatus(id: string, status: string) {
    const targetId = await this.resolveUserId(id);

    // Also update in-memory store
    for (const u of inMemoryUsersStore.values()) {
      if (u.id === id || u.id === targetId) {
        u.id = targetId;
        u.status = status as any;
        break;
      }
    }

    const supabase = this.supabaseService.getClient();

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', targetId);

      if (error) {
        this.logger.warn(`Database update user status info: ${error.message}`);
      }
    } catch {
      // ignore unmigrated
    }

    return { message: `User status updated to ${status}`, id: targetId, status };
  }

  async assignDivisions(userId: string, divisionIds: string[]) {
    const supabase = this.supabaseService.getClient();
    const targetId = await this.resolveUserId(userId);

    try {
      await supabase.from('user_divisions').delete().eq('user_id', targetId);

      const rows = divisionIds.map((divId) => ({
        user_id: targetId,
        division_id: divId,
      }));

      if (rows.length > 0) {
        await supabase.from('user_divisions').insert(rows);
      }
    } catch (err: any) {
      this.logger.warn(`Database assign divisions info: ${err.message}`);
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
      if (u.id === userId || u.id === targetId) {
        u.id = targetId;
        u.authorizedDivisions = assignedDivisions;
        break;
      }
    }

    this.supabaseService.broadcastEvent('DIVISIONS_UPDATED', {
      userId: targetId,
      divisionIds,
      divisions: assignedDivisions,
    });

    return {
      message: 'Authorized divisions assigned successfully',
      userId: targetId,
      divisionIds,
      divisions: assignedDivisions,
    };
  }

  async assignRoles(userId: string, roleIds: string[]) {
    const supabase = this.supabaseService.getClient();
    const targetId = await this.resolveUserId(userId);

    try {
      await supabase.from('user_roles').delete().eq('user_id', targetId);

      const rows = roleIds.map((roleId) => ({
        user_id: targetId,
        role_id: roleId,
      }));

      if (rows.length > 0) {
        await supabase.from('user_roles').insert(rows);
      }
    } catch (err: any) {
      this.logger.warn(`Database assign roles info: ${err.message}`);
    }

    const allRoles = await this.listRoles();
    const assignedRoles = allRoles.filter((r) => roleIds.includes(r.id));

    const ROLE_PERMISSIONS_MAP: Record<string, string[]> = {
      'Super Admin': [
        'parameters.pincode.view', 'parameters.pincode.create', 'parameters.pincode.edit', 'parameters.pincode.delete', 'parameters.pincode.assign', 'parameters.pincode.audit',
        'parameters.account_type.view', 'parameters.account_type.create', 'parameters.account_type.edit', 'parameters.account_type.delete', 'parameters.account_type.assign', 'parameters.account_type.audit',
        'masters.party.view', 'masters.party.create', 'masters.party.edit', 'masters.party.delete',
        'settings.users.view', 'settings.users.approve', 'settings.users.edit', 'settings.users.delete', 'settings.users.assign', 'settings.users.audit',
        'settings.roles.view', 'settings.roles.create', 'settings.roles.edit', 'settings.roles.delete', 'settings.roles.audit',
        'settings.form_access.view', 'settings.form_access.edit', 'settings.form_access.audit',
        'users.manage', 'roles.manage',
      ],
      'HO Administrator': [
        'parameters.pincode.view', 'parameters.pincode.create', 'parameters.pincode.edit', 'parameters.pincode.delete', 'parameters.pincode.assign', 'parameters.pincode.audit',
        'parameters.account_type.view', 'parameters.account_type.create', 'parameters.account_type.edit', 'parameters.account_type.delete', 'parameters.account_type.assign', 'parameters.account_type.audit',
        'masters.party.view', 'masters.party.create', 'masters.party.edit', 'masters.party.delete',
        'settings.users.view', 'settings.users.approve', 'settings.users.edit', 'settings.users.delete', 'settings.users.assign', 'settings.users.audit',
        'settings.roles.view', 'settings.roles.create', 'settings.roles.edit', 'settings.roles.delete', 'settings.roles.audit',
        'settings.form_access.view', 'settings.form_access.edit', 'settings.form_access.audit',
        'users.manage', 'roles.manage',
      ],
      'HO Staff': [
        'parameters.pincode.view', 'parameters.pincode.create', 'parameters.pincode.edit', 'parameters.pincode.audit',
        'parameters.account_type.view', 'parameters.account_type.create', 'parameters.account_type.edit', 'parameters.account_type.audit',
        'masters.party.view', 'masters.party.create', 'masters.party.edit',
      ],
      'Division Manager': [
        'parameters.pincode.view', 'parameters.account_type.view', 'masters.party.view',
      ],
      'Division User': [
        'parameters.pincode.view', 'parameters.account_type.view', 'masters.party.view',
      ],
    };

    // Update in-memory user if exists and impart role permissions
    for (const u of inMemoryUsersStore.values()) {
      if (u.id === userId || u.id === targetId) {
        u.id = targetId;
        u.roles = assignedRoles.map((r) => ({ id: r.id, name: r.name }));
        const rolePerms = new Set<string>();
        assignedRoles.forEach((r) => {
          const perms = ROLE_PERMISSIONS_MAP[r.name] || [];
          perms.forEach((p) => rolePerms.add(p));
        });
        u.permissions = Array.from(new Set([...(u.permissions || []), ...rolePerms]));
        break;
      }
    }

    this.supabaseService.broadcastEvent('USER_PERMISSIONS_UPDATED', {
      userId: targetId,
      roles: assignedRoles,
    });

    return {
      message: 'Roles assigned successfully',
      userId: targetId,
      roleIds,
      roles: assignedRoles,
    };
  }

  async updateFormAccess(
    formCode: string,
    assignments: Array<{ userId: string; hasAccess: boolean; actions: string[] }>,
  ) {
    const supabase = this.supabaseService.getClient();

    for (const item of assignments) {
      const { userId, hasAccess, actions } = item;
      const targetId = await this.resolveUserId(userId);

      // Base permission when hasAccess is true is always <formCode>.view
      // Plus elevated privileges: <formCode>.<action> (create, edit, delete, assign, audit)
      const formPerms = hasAccess
        ? [
            `${formCode}.view`,
            ...(actions || []).map((act) => `${formCode}.${act.toLowerCase().trim()}`),
          ]
        : [];

      // 1. Update in-memory user
      for (const u of inMemoryUsersStore.values()) {
        if (u.id === userId || u.id === targetId) {
          u.id = targetId;
          const current = u.permissions || [];
          // Strip any permissions matching this formCode
          const filtered = current.filter((p) => !p.startsWith(`${formCode}.`));
          u.permissions = Array.from(new Set([...filtered, ...formPerms]));
          break;
        }
      }

      // 2. Update database profile permissions if exists
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, permissions')
          .eq('id', targetId)
          .single();

        if (prof) {
          const current: string[] = prof.permissions || [];
          const filtered = current.filter((p) => !p.startsWith(`${formCode}.`));
          const updated = Array.from(new Set([...filtered, ...formPerms]));
          await supabase
            .from('profiles')
            .update({ permissions: updated, updated_at: new Date().toISOString() })
            .eq('id', targetId);
        }
      } catch (err: any) {
        this.logger.debug(`Database updateFormAccess error for ${targetId}: ${err.message}`);
      }
    }

    // Broadcast across all open ERP sessions for instant real-time sync
    this.supabaseService.broadcastEvent('USER_PERMISSIONS_UPDATED', {
      formCode,
      assignmentsCount: assignments.length,
      timestamp: new Date().toISOString(),
    });

    return {
      message: 'Form access policies updated successfully',
      formCode,
      count: assignments.length,
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
