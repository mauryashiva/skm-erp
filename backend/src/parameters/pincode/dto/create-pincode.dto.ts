import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class CreatePincodeDto {
  @IsNotEmpty({ message: 'Pincode is required' })
  @IsString()
  pincode: string;

  @IsNotEmpty({ message: 'City is required' })
  @IsString()
  city: string;

  @IsNotEmpty({ message: 'State is required' })
  @IsString()
  state: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsArray()
  assignedDivisionIds?: string[];
}
