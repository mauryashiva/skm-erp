import { IsArray, IsBoolean, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class FormAccessAssignmentItemDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsBoolean()
  hasAccess: boolean;

  @IsArray()
  @IsString({ each: true })
  actions: string[];
}

export class UpdateFormAccessDto {
  @IsNotEmpty()
  @IsString()
  formCode: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormAccessAssignmentItemDto)
  assignments: FormAccessAssignmentItemDto[];
}
