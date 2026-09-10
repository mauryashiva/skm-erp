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
import { AccountTypeService } from './account-type.service';
import { CreateAccountTypeDto } from './dto/create-account-type.dto';
import { UpdateAccountTypeDto } from './dto/update-account-type.dto';
import { AssignAccountTypeDto } from './dto/assign-account-type.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { HoOnlyGuard } from '../../common/guards/ho-only.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

@Controller('parameters/account-types')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccountTypeController {
  constructor(private readonly accountTypeService: AccountTypeService) {}

  @Get()
  @RequirePermissions('parameters.account_type.view')
  async listAccountTypes(
    @CurrentUser() user: AuthUser,
    @Query('search') search?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const isActiveOnly = activeOnly !== 'false';
    return this.accountTypeService.listAccountTypes(user, search, isActiveOnly);
  }

  @Post()
  @UseGuards(HoOnlyGuard)
  @RequirePermissions('parameters.account_type.create')
  async createAccountType(
    @Body() dto: CreateAccountTypeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.accountTypeService.createAccountType(dto, user);
  }

  @Patch(':id')
  @UseGuards(HoOnlyGuard)
  @RequirePermissions('parameters.account_type.edit')
  async updateAccountType(
    @Param('id') id: string,
    @Body() dto: UpdateAccountTypeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.accountTypeService.updateAccountType(id, dto, user);
  }

  @Post(':id/activate')
  @UseGuards(HoOnlyGuard)
  @RequirePermissions('parameters.account_type.edit')
  async activateAccountType(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.accountTypeService.activateAccountType(id, user);
  }

  @Post(':id/deactivate')
  @UseGuards(HoOnlyGuard)
  @RequirePermissions('parameters.account_type.delete')
  async deactivateAccountType(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.accountTypeService.deactivateAccountType(id, user);
  }

  @Delete(':id')
  @UseGuards(HoOnlyGuard)
  @RequirePermissions('parameters.account_type.delete')
  async deleteAccountType(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.accountTypeService.deleteAccountType(id, user);
  }

  @Post(':id/assign')
  @UseGuards(HoOnlyGuard)
  @RequirePermissions('parameters.account_type.assign')
  async assignDivisions(
    @Param('id') id: string,
    @Body() dto: AssignAccountTypeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.accountTypeService.assignDivisions(id, dto.divisionIds, user);
  }
}
