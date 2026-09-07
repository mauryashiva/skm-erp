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

    if (!user.is_ho_active) {
      throw new ForbiddenException(
        'Permanent HO Control Rule: Central Parameters and Masters can only be managed from SKM STEELS LIMITED (HO). Child divisions have View & Use access only.',
      );
    }

    return true;
  }
}
