import { Controller, Get, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuditService } from '../services/audit.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { AuthUser } from '../interfaces/auth-user.interface';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get(':entityType/:entityId')
  async getEntityHistory(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentUser() user: AuthUser,
  ) {
    // Super admins always have full audit privileges
    if (!user.is_super_admin) {
      // Map entityType to module audit permission code
      let requiredPerm = `${entityType}.audit`;
      if (entityType === 'pincodes' || entityType === 'pincode') {
        requiredPerm = 'parameters.pincode.audit';
      } else if (
        entityType === 'account_types' ||
        entityType === 'account-types' ||
        entityType === 'account_type'
      ) {
        requiredPerm = 'parameters.account_type.audit';
      }

      const hasPerm = user.permissions?.includes(requiredPerm);
      if (!hasPerm) {
        throw new ForbiddenException(
          `Unauthorized: You do not have permission to inspect audit history for ${entityType}.`,
        );
      }
    }

    return this.auditService.getEntityHistory(entityType, entityId);
  }
}
