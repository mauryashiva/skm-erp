import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../interfaces/auth-user.interface';

@Injectable()
export class HoOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: AuthUser = request.user;

    if (!user) {
      throw new ForbiddenException('User context not found');
    }

    if (user.is_super_admin) {
      return true;
    }

    // Permanent HO Control Rule: Central parameters and masters can only be created or managed from Head Office (HO)
    if (!user.is_ho_active) {
      throw new ForbiddenException(
        'Permanent HO Control Rule: Central Parameters and Masters can only be created and managed from SKM STEELS LIMITED (HO). Operating divisions have read-only assigned record view.',
      );
    }

    return true;
  }
}
