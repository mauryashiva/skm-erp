import { IsArray, IsNotEmpty } from 'class-validator';

export class AssignUserRolesDto {
  @IsNotEmpty()
  @IsArray()
  roleIds: string[];
}
