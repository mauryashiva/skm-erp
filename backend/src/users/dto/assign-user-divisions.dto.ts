import { IsArray, IsNotEmpty } from 'class-validator';

export class AssignUserDivisionsDto {
  @IsNotEmpty()
  @IsArray()
  divisionIds: string[];
}
