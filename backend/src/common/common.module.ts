import { Global, Module } from '@nestjs/common';
import { ParameterDivisionService } from './services/parameter-division.service';
import { AuditService } from './services/audit.service';
import { AuditController } from './controllers/audit.controller';

@Global()
@Module({
  controllers: [AuditController],
  providers: [ParameterDivisionService, AuditService],
  exports: [ParameterDivisionService, AuditService],
})
export class CommonModule {}

