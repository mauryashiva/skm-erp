import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { AssignUserDivisionsDto } from './dto/assign-user-divisions.dto';
import { AssignUserRolesDto } from './dto/assign-user-roles.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.manage')
  async listUsers(@Query('status') status?: string) {
    return this.usersService.listUsers(status);
  }

  @Patch(':id/status')
  @RequirePermissions('users.manage')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateUserStatus(id, dto.status);
  }

  @Patch(':id/divisions')
  @RequirePermissions('users.manage')
  async assignDivisions(
    @Param('id') id: string,
    @Body() dto: AssignUserDivisionsDto,
  ) {
    return this.usersService.assignDivisions(id, dto.divisionIds);
  }

  @Patch(':id/roles')
  @RequirePermissions('users.manage')
  async assignRoles(
    @Param('id') id: string,
    @Body() dto: AssignUserRolesDto,
  ) {
    return this.usersService.assignRoles(id, dto.roleIds);
  }
}
