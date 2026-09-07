import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  PostalLookupService,
} from './postal-lookup.service';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('postal-lookup')
export class PostalLookupController {
  constructor(
    private readonly postalLookupService: PostalLookupService,
  ) { }

  /**
   * Lookup a postal / PIN code using the local
   * country postal dataset.
   *
   * Example:
   * GET /postal-lookup/401209?country=IN
   *
   * The endpoint remains protected by the existing
   * JWT authentication guard.
   */
  @Get(':code')
  @UseGuards(JwtAuthGuard)
  async lookup(
    @Param('code') code: string,
    @Query('country') country?: string,
  ) {
    return this.postalLookupService.lookup(
      code,
      country || 'IN',
    );
  }
}