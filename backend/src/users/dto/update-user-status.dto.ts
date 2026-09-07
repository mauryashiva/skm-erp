import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateUserStatusDto {
  @IsNotEmpty()
  @IsIn(['APPROVED', 'REJECTED', 'SUSPENDED', 'PENDING'])
  status: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'PENDING';
}
