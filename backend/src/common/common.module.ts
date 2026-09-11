import { Global, Module } from '@nestjs/common';
import { ParameterDivisionService } from './services/parameter-division.service';

@Global()
@Module({
  providers: [ParameterDivisionService],
  exports: [ParameterDivisionService],
})
export class CommonModule {}
