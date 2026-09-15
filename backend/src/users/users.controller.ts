import { Controller, Get, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignUserDivisionsDto } from './dto/assign-user-divisions.dto';
import { AssignUserRolesDto } from './dto/assign-user-roles.dto';
import { UpdateFormAccessDto } from './dto/update-form-access.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('roles')
  @RequirePermissions('users.manage', 'settings.users.view', 'roles.manage')
  async listRoles() {
    return this.usersService.listRoles();
  }

  @Patch('form-access')
  @RequirePermissions('users.manage', 'roles.manage', 'settings.form_access.edit')
  async updateFormAccess(@Body() dto: UpdateFormAccessDto) {
    return this.usersService.updateFormAccess(dto.formCode, dto.assignments);
  }

  @Get()
  @RequirePermissions(
    'users.manage',
    'settings.users.view',
    'settings.form_access.view',
    'settings.form_access.edit',
    'roles.manage',
  )
  async listUsers(@Query('status') status?: string) {
    return this.usersService.listUsers(status);
  }

  @Patch(':id')
  @RequirePermissions('users.manage', 'settings.users.edit')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('users.manage', 'settings.users.approve')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateUserStatus(id, dto.status);
  }

  @Patch(':id/divisions')
  @RequirePermissions('users.manage', 'settings.users.assign', 'settings.users.edit')
  async assignDivisions(
    @Param('id') id: string,
    @Body() dto: AssignUserDivisionsDto,
  ) {
    return this.usersService.assignDivisions(id, dto.divisionIds);
  }

  @Patch(':id/roles')
  @RequirePermissions('users.manage', 'settings.users.assign', 'settings.users.edit')
  async assignRoles(
    @Param('id') id: string,
    @Body() dto: AssignUserRolesDto,
  ) {
    return this.usersService.assignRoles(id, dto.roleIds);
  }

  @Delete(':id')
  @RequirePermissions('users.manage', 'settings.users.delete')
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
