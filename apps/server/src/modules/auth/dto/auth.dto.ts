import { IsString, MaxLength, MinLength } from 'class-validator';

/** 登录入参（契约：docs/03 §4.0 LoginDto） */
export class LoginDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  account: string;

  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password: string;
}

/** 刷新入参 */
export class RefreshDto {
  @IsString()
  @MinLength(10)
  refreshToken: string;
}
