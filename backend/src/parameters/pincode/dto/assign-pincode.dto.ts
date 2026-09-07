import { IsArray, IsNotEmpty } from 'class-validator';

export class AssignPincodeDto {
  @IsNotEmpty({ message: 'Division IDs list cannot be empty' })
  @IsArray()
  divisionIds: string[];
}
