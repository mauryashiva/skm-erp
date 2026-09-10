import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateAccountTypeDto {
  @IsString()
  @IsNotEmpty({ message: 'Account Type is required' })
  accountType: string;

  @IsString()
  @IsOptional()
  shortName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  assignedDivisionIds?: string[];
}
