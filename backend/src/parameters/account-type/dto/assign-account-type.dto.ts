import { IsArray, IsNotEmpty } from 'class-validator';

export class AssignAccountTypeDto {
  @IsNotEmpty({ message: 'Division IDs list cannot be empty' })
  @IsArray()
  divisionIds: string[];
}
