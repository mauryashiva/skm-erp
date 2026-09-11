import { IsNotEmpty, IsString, MinLength, IsEmail, IsIn } from 'class-validator';

export class SignupDto {
  @IsNotEmpty({ message: 'Full name is required' })
  @IsString()
  fullName: string;

  @IsNotEmpty({ message: 'Email ID is required' })
  @IsEmail({}, { message: 'Please provide a valid Email ID' })
  @IsString()
  email: string;

  @IsNotEmpty({ message: 'Gender is required' })
  @IsIn(['Male', 'Female'], { message: 'Gender must be either Male or Female' })
  @IsString()
  gender: string;

  @IsNotEmpty({ message: 'Username is required' })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  username: string;

  @IsNotEmpty({ message: 'Mobile number is required' })
  @IsString()
  mobileNumber: string;

  @IsNotEmpty({ message: 'Primary division is required' })
  @IsString()
  divisionId: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsNotEmpty({ message: 'Confirm password is required' })
  @IsString()
  confirmPassword: string;
}

