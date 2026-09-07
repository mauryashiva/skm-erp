import { Controller, Get, UseGuards } from '@nestjs/common';
import { DivisionsService } from './divisions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';

@Controller('divisions')
export class DivisionsController {
  constructor(private readonly divisionsService: DivisionsService) {}

  // Public endpoint for signup dropdown
  @Get('public')
  async getPublicDivisions() {
    return this.divisionsService.getAllDivisions();
  }

  // Authenticated endpoint returning user's authorized divisions
  @Get()
  @UseGuards(JwtAuthGuard)
  async getUserDivisions(@CurrentUser() user: AuthUser) {
    return this.divisionsService.getUserAuthorizedDivisions(user);
  }
}
