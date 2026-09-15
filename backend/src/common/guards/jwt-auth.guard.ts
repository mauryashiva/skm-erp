import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { AuthUser, DivisionInfo } from '../interfaces/auth-user.interface';
import { inMemoryUsersStore } from '../../auth/pending-users.store';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    const activeDivisionId = (request.headers['x-division-id'] ||
      request.headers['x-active-division-id']) as string | undefined;

    // Support mock dev session if token is 'mock-dev-token'
    if (authHeader === 'Bearer mock-dev-token' || authHeader === 'Bearer dev-ho-admin-token') {
      const isHO = authHeader === 'Bearer dev-ho-admin-token';
      const hoDivision: DivisionInfo = {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'SKM STEELS LIMITED (HO)',
        code: 'DIV_HO',
        is_ho: true,
      };
      const childDivision: DivisionInfo = {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'SKM Inox',
        code: 'DIV_INOX',
        is_ho: false,
      };

      if (!isHO && activeDivisionId && activeDivisionId !== childDivision.id) {
        throw new ForbiddenException('User is not authorized for the requested active division');
      }

      const selectedDivision = activeDivisionId === childDivision.id ? childDivision : hoDivision;

      request.user = {
        id: '00000000-0000-0000-0000-000000000000',
        username: isHO ? 'ho_admin' : 'inox_user',
        full_name: isHO ? 'HO Administrator' : 'Inox Operator',
        mobile_number: '+91 9876543210',
        status: 'APPROVED',
        is_super_admin: isHO,
        primary_division: selectedDivision,
        authorized_divisions: isHO ? [hoDivision, childDivision] : [childDivision],
        roles: isHO ? ['Super Admin', 'HO Administrator'] : ['Division User'],
        permissions: isHO
          ? [
              'parameters.pincode.view',
              'parameters.pincode.create',
              'parameters.pincode.edit',
              'parameters.pincode.delete',
              'parameters.pincode.assign',
              'parameters.account_type.view',
              'parameters.account_type.create',
              'parameters.account_type.edit',
              'parameters.account_type.delete',
              'parameters.account_type.assign',
              'masters.party.view',
              'masters.party.create',
              'masters.party.edit',
              'masters.party.delete',
              'users.manage',
            ]
          : ['parameters.pincode.view', 'parameters.account_type.view', 'masters.party.view'],
        active_division_id: selectedDivision.id,
        is_ho_active: selectedDivision.is_ho,
      } as AuthUser;
      return true;
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication token missing or invalid');
    }

    // Support dev session tokens created in memory or re-hydrated from database
    if (authHeader.startsWith('Bearer dev-session-')) {
      const sessionId = authHeader.replace('Bearer dev-session-', '').trim();
      let memUser = Array.from(inMemoryUsersStore.values()).find(
        (u) => u.id === sessionId,
      );

      if (!memUser) {
        const supabase = this.supabaseService.getClient();
        try {
          const { data: profile } = await supabase
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
              permissions,
              primary_division:divisions!profiles_primary_division_id_fkey(id, name, code, is_ho),
              user_divisions(division:divisions(id, name, code, is_ho)),
              user_roles(role:roles(id, name))
            `)
            .eq('id', sessionId)
            .single();

          if (profile) {
            memUser = {
              id: profile.id,
              fullName: profile.full_name,
              username: profile.username,
              email: profile.email,
              gender: profile.gender,
              mobileNumber: profile.mobile_number,
              status: profile.status,
              isSuperAdmin: profile.is_super_admin,
              primaryDivision: profile.primary_division as unknown as DivisionInfo,
              authorizedDivisions: (profile.user_divisions || []).map((ud: any) => ud.division).filter(Boolean),
              roles: (profile.user_roles || []).map((ur: any) => ur.role).filter(Boolean),
              permissions: profile.permissions || ['parameters.pincode.view'],
            } as any;
            inMemoryUsersStore.set(profile.username, memUser!);
          }
        } catch {
          // ignore
        }
      }

      if (memUser) {
        if (memUser.status !== 'APPROVED' && !memUser.isSuperAdmin) {
          throw new ForbiddenException(
            `Account status is ${memUser.status}. Access is pending administrator review and approval.`,
          );
        }
        const authorizedDivisions = memUser.authorizedDivisions || [memUser.primaryDivision];
        let currentDivision = authorizedDivisions[0];
        if (activeDivisionId) {
          const found = authorizedDivisions.find((d) => d.id === activeDivisionId);
          if (!found && !memUser.isSuperAdmin) {
            throw new ForbiddenException('User is not authorized for the requested active division');
          }
          currentDivision = found || currentDivision;
        }
        request.user = {
          id: memUser.id,
          username: memUser.username,
          full_name: memUser.fullName,
          mobile_number: memUser.mobileNumber,
          status: memUser.status,
          is_super_admin: memUser.isSuperAdmin,
          primary_division: memUser.primaryDivision,
          authorized_divisions: authorizedDivisions,
          roles: memUser.roles?.map((r: any) => r.name || r) || ['Division User'],
          permissions: memUser.permissions || ['parameters.pincode.view'],
          active_division_id: currentDivision?.id,
          is_ho_active: !!currentDivision?.is_ho,
        } as AuthUser;
        return true;
      }
    }

    const token = authHeader.split(' ')[1];
    const supabase = this.supabaseService.getClient();

    // Verify token with Supabase Auth
    const { data: userData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !userData?.user) {
      throw new UnauthorizedException('Invalid or expired authentication session');
    }

    const userId = userData.user.id;

    // Load full profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        username,
        mobile_number,
        status,
        is_super_admin,
        primary_division:divisions!profiles_primary_division_id_fkey(id, name, code, is_ho)
      `)
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new UnauthorizedException('User profile not found');
    }

    if (profile.status !== 'APPROVED' && !profile.is_super_admin) {
      throw new ForbiddenException(
        `Account status is ${profile.status}. Access is pending administrator review and approval.`,
      );
    }

    // Load authorized divisions
    const { data: divisionData } = await supabase
      .from('user_divisions')
      .select('division:divisions(id, name, code, is_ho)')
      .eq('user_id', userId);

    const authorizedDivisions: DivisionInfo[] = (divisionData || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((d: any) => d.division)
      .filter(Boolean);

    // If super admin, they have access to all active divisions
    let finalAuthorizedDivisions = authorizedDivisions;
    if (profile.is_super_admin) {
      const { data: allDivisions } = await supabase
        .from('divisions')
        .select('id, name, code, is_ho');
      finalAuthorizedDivisions = allDivisions || [];
    }

    // Load roles and permissions
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role:roles(name, role_permissions(permission:permissions(code)))')
      .eq('user_id', userId);

    const roles: string[] = [];
    const permissionsSet = new Set<string>();

    (roleData || []).forEach((ur: any) => {
      if (ur.role?.name) {
        roles.push(ur.role.name);
      }
      if (ur.role?.role_permissions) {
        ur.role.role_permissions.forEach((rp: any) => {
          if (rp.permission?.code) {
            permissionsSet.add(rp.permission.code);
          }
        });
      }
    });

    // Merge granular form-access permissions from in-memory store or profile
    const memUserMatch = Array.from(inMemoryUsersStore.values()).find((u) => u.id === userId);
    if (memUserMatch?.permissions) {
      memUserMatch.permissions.forEach((p) => permissionsSet.add(p));
    }
    if ((profile as any)?.permissions && Array.isArray((profile as any).permissions)) {
      (profile as any).permissions.forEach((p: string) => permissionsSet.add(p));
    }

    // Validate active division requested in header
    let currentDivision: DivisionInfo | null = null;
    if (activeDivisionId) {
      const found = finalAuthorizedDivisions.find((d) => d.id === activeDivisionId);
      if (!found && !profile.is_super_admin) {
        throw new ForbiddenException('User is not authorized for the requested active division');
      }
      currentDivision = found || null;
    } else if (profile.primary_division) {
      currentDivision = profile.primary_division as unknown as DivisionInfo;
    } else if (finalAuthorizedDivisions.length > 0) {
      currentDivision = finalAuthorizedDivisions[0];
    }

    const authUser: AuthUser = {
      id: profile.id,
      username: profile.username,
      full_name: profile.full_name,
      mobile_number: profile.mobile_number,
      status: profile.status,
      is_super_admin: profile.is_super_admin,
      primary_division: profile.primary_division as unknown as DivisionInfo,
      authorized_divisions: finalAuthorizedDivisions,
      roles,
      permissions: Array.from(permissionsSet),
      active_division_id: currentDivision?.id,
      is_ho_active: currentDivision?.is_ho || false,
    };

    request.user = authUser;
    return true;
  }
}
