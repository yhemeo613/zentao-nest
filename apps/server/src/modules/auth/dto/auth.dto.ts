import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** 登录入参（契约：docs/03 §4.0 LoginDto） */
export class LoginDto {
  @ApiProperty({
    description: '登录账号（3-64 字符）',
    example: 'admin',
    minLength: 3,
    maxLength: 64,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  account: string;

  @ApiProperty({
    description: '登录密码（6-64 字符）',
    example: 'Admin@123456',
    minLength: 6,
    maxLength: 64,
  })
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password: string;
}

/** 刷新入参 */
export class RefreshDto {
  @ApiProperty({
    description: 'refresh token（登录时返回，白名单轮换）',
    example: 'eyJhbGciOi...',
  })
  @IsString()
  @MinLength(10)
  refreshToken: string;
}

/** 双 token 响应（TokenPairVo） */
export class TokenPairVo {
  @ApiProperty({
    description: '访问令牌（2 小时），请求头 Authorization: Bearer <token>',
    example: 'eyJhbGciOi...',
  })
  accessToken: string;

  @ApiProperty({
    description: '刷新令牌（7 天，Redis 白名单，单次轮换）',
    example: 'eyJhbGciOi...',
  })
  refreshToken: string;
}

/** 当前用户响应（CurrentUserVo） */
export class CurrentUserVo {
  @ApiProperty({ description: '用户 ID', example: '1' })
  id: string;

  @ApiProperty({ description: '登录账号', example: 'admin' })
  account: string;

  @ApiProperty({
    description: '真实姓名（空则回退账号）',
    example: '系统管理员',
  })
  realname: string;

  @ApiProperty({
    description: '权限点集合（module.action）；超管返回全部 active 权限点',
    example: ['user.browse', 'user.create', 'dept.manage'],
    type: [String],
  })
  permissions: string[];
}
