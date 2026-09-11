import { IsArray, IsNotEmpty, IsString, Matches } from 'class-validator';

export class AssignDivisionsDto {
  @IsNotEmpty({ message: 'Division IDs list cannot be empty' })
  @IsArray({ message: 'divisionIds must be an array' })
  @IsString({ each: true, message: 'each value in divisionIds must be a string' })
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, {
    each: true,
    message: 'each value in divisionIds must be a valid UUID',
  })
  divisionIds: string[];
}
