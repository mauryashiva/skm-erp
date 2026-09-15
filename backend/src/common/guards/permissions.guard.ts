import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthUser } from '../interfaces/auth-user.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthUser = request.user;

    if (!user) {
      throw new ForbiddenException('User context not established');
    }

    if (user.is_super_admin) {
      return true;
    }

    const userPerms = Array.isArray(user.permissions) ? user.permissions : [];

    const hasAccess = requiredPermissions.some((perm) => {
      // 1. Direct permission match
      if (userPerms.includes(perm)) return true;

      // 2. High-level manager match: 'users.manage' satisfies any 'settings.users.*'
      if (userPerms.includes('users.manage') && perm.startsWith('settings.users.')) return true;

      // 3. 'roles.manage' satisfies any 'settings.roles.*' or 'settings.form_access.*'
      if (userPerms.includes('roles.manage') && (perm.startsWith('settings.roles.') || perm.startsWith('settings.form_access.'))) return true;

      return false;
    });

    if (!hasAccess) {
      throw new ForbiddenException(
        `Insufficient permissions. Required one of: [${requiredPermissions.join(', ')}]`,
      );
    }

    return true;
  }
}
