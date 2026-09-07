import { Module } from '@nestjs/common';

import { PostalLookupController } from './postal-lookup.controller';
import { PostalLookupService } from './postal-lookup.service';

@Module({
  controllers: [PostalLookupController],
  providers: [PostalLookupService],
  exports: [PostalLookupService],
})
export class PostalLookupModule { }