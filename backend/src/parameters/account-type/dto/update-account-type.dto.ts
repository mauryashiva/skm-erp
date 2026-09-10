import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class UpdateAccountTypeDto {
  @IsString()
  @IsOptional()
  accountType?: string;

  @IsString()
  @IsOptional()
  shortName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsOptional()
  assignedDivisionIds?: string[];
}
