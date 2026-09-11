import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuditService } from '../services/audit.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get(':entityType/:entityId')
  async getEntityHistory(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.getEntityHistory(entityType, entityId);
  }
}
