import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PincodeService } from './pincode.service';
import { CreatePincodeDto } from './dto/create-pincode.dto';
import { UpdatePincodeDto } from './dto/update-pincode.dto';
import { AssignPincodeDto } from './dto/assign-pincode.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { HoOnlyGuard } from '../../common/guards/ho-only.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

@Controller('parameters/pincodes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PincodeController {
  constructor(private readonly pincodeService: PincodeService) {}

  @Get()
  @RequirePermissions('parameters.pincode.view')
  async listPincodes(
    @CurrentUser() user: AuthUser,
    @Query('search') search?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const isActiveOnly = activeOnly !== 'false';
    return this.pincodeService.listPincodes(user, search, isActiveOnly);
  }

  @Post()
  @UseGuards(HoOnlyGuard)
  @RequirePermissions('parameters.pincode.create')
  async createPincode(
    @Body() dto: CreatePincodeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.pincodeService.createPincode(dto, user);
  }

  @Patch(':id')
  @UseGuards(HoOnlyGuard)
  @RequirePermissions('parameters.pincode.edit')
  async updatePincode(
    @Param('id') id: string,
    @Body() dto: UpdatePincodeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.pincodeService.updatePincode(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(HoOnlyGuard)
  @RequirePermissions('parameters.pincode.delete')
  async deactivatePincode(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.pincodeService.deactivatePincode(id, user);
  }

  @Post(':id/assign')
  @UseGuards(HoOnlyGuard)
  @RequirePermissions('parameters.pincode.assign')
  async assignDivisions(
    @Param('id') id: string,
    @Body() dto: AssignPincodeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.pincodeService.assignDivisions(id, dto.divisionIds, user);
  }
}
