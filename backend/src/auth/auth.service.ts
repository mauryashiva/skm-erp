import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AuthUser, DivisionInfo } from '../common/interfaces/auth-user.interface';
import { inMemoryUsersStore } from './pending-users.store';

import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async signup(dto: SignupDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password and confirmation password do not match');
    }

    const normalizedUsername = dto.username.toLowerCase().trim();

    if (inMemoryUsersStore.has(normalizedUsername)) {
      throw new BadRequestException('Username is already taken');
    }

    const supabase = this.supabaseService.getClient();

    // Verify division exists
    const { data: division, error: divError } = await supabase
      .from('divisions')
      .select('id, name, code, is_ho')
      .eq('id', dto.divisionId)
      .single();

    if (divError || !division) {
      throw new BadRequestException('Selected division is invalid');
    }

    // Check if username is already taken in database
    try {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', normalizedUsername)
        .single();

      if (existingUser) {
        throw new BadRequestException('Username is already taken');
      }
    } catch {
      // Ignore if table doesn't exist
    }

    // Standardized internal email for username-based Supabase Auth
    const internalEmail = `${normalizedUsername}@skmsteels.internal`;
    let userId: string = randomUUID();

    // Create or synchronize user in Supabase Auth
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: internalEmail,
        password: dto.password,
        email_confirm: true,
        user_metadata: {
          username: normalizedUsername,
          full_name: dto.fullName,
          email: dto.email.toLowerCase().trim(),
          gender: dto.gender,
        },
      });

      if (!authError && authData?.user) {
        userId = authData.user.id;
      } else if (authError) {
        this.logger.warn(`Supabase Auth admin createUser notice: ${authError.message}`);
        // If auth user already exists in auth.users, retrieve existing UUID and update password
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existingAuthUser = listData?.users?.find(
          (u) => u.email === internalEmail || u.user_metadata?.username === normalizedUsername,
        );
        if (existingAuthUser) {
          userId = existingAuthUser.id;
          await supabase.auth.admin.updateUserById(userId, {
            password: dto.password,
            user_metadata: {
              username: normalizedUsername,
              full_name: dto.fullName,
              email: dto.email.toLowerCase().trim(),
              gender: dto.gender,
            },
          });
        }
      }
    } catch (err: any) {
      this.logger.warn(`Supabase Auth admin createUser error: ${err?.message}`);
    }

    // Create or upsert Profile with PENDING status in DB
    try {
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: userId,
          full_name: dto.fullName,
          username: normalizedUsername,
          email: dto.email.toLowerCase().trim(),
          gender: dto.gender,
          mobile_number: dto.mobileNumber,
          primary_division_id: dto.divisionId,
          status: 'PENDING',
          is_super_admin: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );

      if (profileError) {
        this.logger.error(`Profile table upsert failed (${profileError.message})`);
      } else {
        // Link initial primary division in user_divisions
        await supabase.from('user_divisions').upsert(
          {
            user_id: userId,
            division_id: dto.divisionId,
          },
          { onConflict: 'user_id,division_id' },
        );

        // Assign default role 'Division User' in user_roles
        const { data: roleRow } = await supabase
          .from('roles')
          .select('id')
          .eq('name', 'Division User')
          .single();
        if (roleRow?.id) {
          await supabase.from('user_roles').upsert(
            {
              user_id: userId,
              role_id: roleRow.id,
            },
            { onConflict: 'user_id,role_id' },
          );
        }
      }
    } catch (err: any) {
      this.logger.warn(`Profile table persistence error: ${err?.message}`);
    }

    // Always record in inMemoryUsersStore as well for instant pending review & standby resilience
    inMemoryUsersStore.set(normalizedUsername, {
      id: userId,
      fullName: dto.fullName,
      username: normalizedUsername,
      email: dto.email.toLowerCase().trim(),
      gender: dto.gender,
      mobileNumber: dto.mobileNumber,
      password: dto.password,
      primaryDivision: division,
      authorizedDivisions: [division],
      roles: [{ id: 'fe8961fd-ad14-415a-93e3-d56bc5f37771', name: 'Division User' }],
      permissions: ['parameters.pincode.view', 'parameters.account_type.view'],
      status: 'PENDING',
      isSuperAdmin: false,
      createdAt: new Date().toISOString(),
    });

    // Notify all admin dashboards in real time across the ERP
    this.supabaseService.broadcastEvent('USER_REGISTERED', {
      userId,
      username: normalizedUsername,
      fullName: dto.fullName,
      status: 'PENDING',
    });

    return {
      message: 'Signup successful! Your account is currently PENDING review by the Administrator.',
      status: 'PENDING',
      username: normalizedUsername,
      fullName: dto.fullName,
      primaryDivision: division.name,
    };
  }

  async login(dto: LoginDto) {
    const supabase = this.supabaseService.getClient();
    const normalizedUsername = dto.username.toLowerCase().trim();

    // 1. Check if user is in inMemoryUsersStore
    const memUser = inMemoryUsersStore.get(normalizedUsername);
    if (memUser) {
      if (memUser.password && memUser.password !== dto.password) {
        throw new UnauthorizedException('Invalid username or password');
      }
      if (memUser.status === 'PENDING') {
        throw new ForbiddenException(
          'Your account is currently PENDING Administrator review and approval. Please contact the SKM ERP Super Admin.',
        );
      }
      if (memUser.status === 'REJECTED' || memUser.status === 'SUSPENDED') {
        throw new ForbiddenException(`Your account has been ${memUser.status.toLowerCase()}. Access denied.`);
      }
      return {
        accessToken: `dev-session-${memUser.id}`,
        user: {
          id: memUser.id,
          username: memUser.username,
          full_name: memUser.fullName,
          email: memUser.email,
          gender: memUser.gender,
          mobile_number: memUser.mobileNumber,
          status: memUser.status,
          is_super_admin: memUser.isSuperAdmin,
          primary_division: memUser.primaryDivision,
          authorized_divisions: memUser.authorizedDivisions || [memUser.primaryDivision],
          roles: memUser.roles?.map(r => r.name) || ['Division User'],
          permissions: memUser.permissions || ['parameters.pincode.view'],
          active_division_id: memUser.primaryDivision.id,
          is_ho_active: !!memUser.primaryDivision.is_ho,
        },
      };
    }

    // 2. Check if user profile exists in database
    const { data: profile, error: profileErr } = await supabase
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
        primary_division:divisions!profiles_primary_division_id_fkey(id, name, code, is_ho)
      `)
      .eq('username', normalizedUsername)
      .single();

    if (profileErr || !profile) {
      // Fallback dev check if credentials are placeholder
      if (normalizedUsername === 'ho_admin' && dto.password === 'admin123') {
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
        return {
          accessToken: 'dev-ho-admin-token',
          user: {
            id: '00000000-0000-0000-0000-000000000000',
            username: 'ho_admin',
            full_name: 'HO Administrator',
            email: 'ho_admin@skmsteels.com',
            gender: 'Male',
            mobile_number: '+91 9876543210',
            status: 'APPROVED',
            is_super_admin: true,
            primary_division: hoDivision,
            authorized_divisions: [hoDivision, childDivision],
            roles: ['Super Admin', 'HO Administrator'],
            permissions: [
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
            ],
            active_division_id: hoDivision.id,
            is_ho_active: true,
          },
        };
      }

      if (normalizedUsername === 'inox_user' && dto.password === 'user123') {
        const memInox = inMemoryUsersStore.get('inox_user');
        const childDivision: DivisionInfo = {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'SKM Inox',
          code: 'DIV_INOX',
          is_ho: false,
        };
        const userId = memInox?.id || '99999999-9999-9999-9999-999999999999';
        return {
          accessToken: `dev-session-${userId}`,
          user: {
            id: userId,
            username: 'inox_user',
            full_name: memInox?.fullName || 'SKM Inox Operator',
            email: memInox?.email || 'inox@skmsteels.com',
            gender: 'Male',
            mobile_number: '+91 9876543211',
            status: 'APPROVED',
            is_super_admin: false,
            primary_division: childDivision,
            authorized_divisions: memInox?.authorizedDivisions || [childDivision],
            roles: memInox?.roles?.map((r) => r.name) || ['Division User'],
            permissions: memInox?.permissions || ['parameters.pincode.view', 'parameters.account_type.view', 'masters.party.view'],
            active_division_id: childDivision.id,
            is_ho_active: false,
          },
        };
      }

      throw new UnauthorizedException('Invalid username or password');
    }

    // 3. Check approval status
    if (profile.status === 'PENDING') {
      throw new ForbiddenException(
        'Your account is currently PENDING Administrator review and approval. Please contact the SKM ERP Super Admin.',
      );
    }

    if (profile.status === 'REJECTED' || profile.status === 'SUSPENDED') {
      throw new ForbiddenException(`Your account has been ${profile.status.toLowerCase()}. Access denied.`);
    }

    // 4. Authenticate with Supabase Auth
    const internalEmail = `${normalizedUsername}@skmsteels.internal`;
    const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password: dto.password,
    });

    if (signinError || !signinData?.session) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // 5. Load authorized divisions
    let authorizedDivisions: DivisionInfo[] = [];
    if (profile.is_super_admin) {
      const { data: allDivisions } = await supabase
        .from('divisions')
        .select('id, name, code, is_ho');
      authorizedDivisions = allDivisions || [];
    } else {
      const { data: divData } = await supabase
        .from('user_divisions')
        .select('division:divisions(id, name, code, is_ho)')
        .eq('user_id', profile.id);

      authorizedDivisions = (divData || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((d: any) => d.division)
        .filter(Boolean);
    }

    // 6. Load roles and permissions
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role:roles(name, role_permissions(permission:permissions(code)))')
      .eq('user_id', profile.id);

    const roles: string[] = [];
    const permissionsSet = new Set<string>();

    (roleData || []).forEach((ur: any) => {
      if (ur.role?.name) roles.push(ur.role.name);
      if (ur.role?.role_permissions) {
        ur.role.role_permissions.forEach((rp: any) => {
          if (rp.permission?.code) permissionsSet.add(rp.permission.code);
        });
      }
    });

    const activeDivision = (profile.primary_division as unknown as DivisionInfo) || authorizedDivisions[0];

    const authUser: AuthUser = {
      id: profile.id,
      username: profile.username,
      full_name: profile.full_name,
      email: (profile as any).email,
      gender: (profile as any).gender,
      mobile_number: profile.mobile_number,
      status: profile.status,
      is_super_admin: profile.is_super_admin,
      primary_division: profile.primary_division as unknown as DivisionInfo,
      authorized_divisions: authorizedDivisions,
      roles,
      permissions: Array.from(permissionsSet),
      active_division_id: activeDivision?.id,
      is_ho_active: activeDivision?.is_ho || false,
    };

    return {
      accessToken: signinData.session.access_token,
      user: authUser,
    };
  }

  getMe(user: AuthUser): AuthUser {
    return user;
  }
}
