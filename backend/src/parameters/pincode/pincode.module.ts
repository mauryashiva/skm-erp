import { Module } from '@nestjs/common';
import { PincodeController } from './pincode.controller';
import { PincodeService } from './pincode.service';

@Module({
  controllers: [PincodeController],
  providers: [PincodeService],
  exports: [PincodeService],
})
export class PincodeModule {}
