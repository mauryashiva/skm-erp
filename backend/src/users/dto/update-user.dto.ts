import { IsOptional, IsString, IsEmail, IsIn, IsArray } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsIn(['Male', 'Female'])
  gender?: string;

  @IsOptional()
  @IsString()
  mobileNumber?: string;

  @IsOptional()
  @IsString()
  primaryDivisionId?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsIn(['APPROVED', 'REJECTED', 'SUSPENDED', 'PENDING'])
  status?: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'PENDING';

  @IsOptional()
  @IsArray()
  divisionIds?: string[];

  @IsOptional()
  @IsArray()
  roleIds?: string[];

  @IsOptional()
  @IsArray()
  permissions?: string[];
}

