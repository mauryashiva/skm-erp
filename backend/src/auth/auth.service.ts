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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async signup(dto: SignupDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password and confirmation password do not match');
    }

    const supabase = this.supabaseService.getClient();

    // Verify division exists
    const { data: division, error: divError } = await supabase
      .from('divisions')
      .select('id, name, is_active')
      .eq('id', dto.divisionId)
      .single();

    if (divError || !division || !division.is_active) {
      throw new BadRequestException('Selected division is invalid or inactive');
    }

    // Check if username is already taken
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', dto.username.toLowerCase())
      .single();

    if (existingUser) {
      throw new BadRequestException('Username is already taken');
    }

    // Standardized internal email for username-based Supabase Auth
    const internalEmail = `${dto.username.toLowerCase()}@skmsteels.internal`;

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: internalEmail,
      password: dto.password,
      email_confirm: true,
      user_metadata: {
        username: dto.username.toLowerCase(),
        full_name: dto.fullName,
      },
    });

    if (authError || !authData?.user) {
      this.logger.error(`Supabase Auth creation failed: ${authError?.message}`);
      throw new BadRequestException(authError?.message || 'Could not create authentication record');
    }

    const userId = authData.user.id;

    // Create Profile with PENDING status
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      full_name: dto.fullName,
      username: dto.username.toLowerCase(),
      mobile_number: dto.mobileNumber,
      primary_division_id: dto.divisionId,
      status: 'PENDING',
      is_super_admin: false,
    });

    if (profileError) {
      this.logger.error(`Profile creation failed: ${profileError.message}`);
      // Rollback auth user
      await supabase.auth.admin.deleteUser(userId);
      throw new BadRequestException('Failed to create employee profile');
    }

    // Link initial primary division in user_divisions
    await supabase.from('user_divisions').insert({
      user_id: userId,
      division_id: dto.divisionId,
    });

    return {
      message: 'Signup successful! Your account is currently PENDING review by the Administrator.',
      status: 'PENDING',
      username: dto.username.toLowerCase(),
      fullName: dto.fullName,
      primaryDivision: division.name,
    };
  }

  async login(dto: LoginDto) {
    const supabase = this.supabaseService.getClient();
    const normalizedUsername = dto.username.toLowerCase().trim();

    // 1. Check if user profile exists
    const { data: profile, error: profileErr } = await supabase
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
        const childDivision: DivisionInfo = {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'SKM Inox',
          code: 'DIV_INOX',
          is_ho: false,
        };
        return {
          accessToken: 'mock-dev-token',
          user: {
            id: '99999999-9999-9999-9999-999999999999',
            username: 'inox_user',
            full_name: 'SKM Inox Operator',
            mobile_number: '+91 9876543211',
            status: 'APPROVED',
            is_super_admin: false,
            primary_division: childDivision,
            authorized_divisions: [childDivision],
            roles: ['Division User'],
            permissions: ['parameters.pincode.view', 'parameters.account_type.view', 'masters.party.view'],
            active_division_id: childDivision.id,
            is_ho_active: false,
          },
        };
      }

      throw new UnauthorizedException('Invalid username or password');
    }

    // 2. Check approval status
    if (profile.status === 'PENDING') {
      throw new ForbiddenException(
        'Your account is currently PENDING Administrator review and approval. Please contact the SKM ERP Super Admin.',
      );
    }

    if (profile.status === 'REJECTED' || profile.status === 'SUSPENDED') {
      throw new ForbiddenException(`Your account has been ${profile.status.toLowerCase()}. Access denied.`);
    }

    // 3. Authenticate with Supabase Auth
    const internalEmail = `${normalizedUsername}@skmsteels.internal`;
    const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password: dto.password,
    });

    if (signinError || !signinData?.session) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // 4. Load authorized divisions
    let authorizedDivisions: DivisionInfo[] = [];
    if (profile.is_super_admin) {
      const { data: allDivisions } = await supabase
        .from('divisions')
        .select('id, name, code, is_ho')
        .eq('is_active', true);
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

    // 5. Load roles and permissions
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
