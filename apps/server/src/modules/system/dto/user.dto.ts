import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PageQueryDto } from '../../../common/dto/page.dto.js';

export class CreateUserDto {
  @ApiProperty({
    description: '登录账号（全局唯一，3-64 字符）',
    example: 'dev01',
    minLength: 3,
    maxLength: 64,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  account: string;

  @ApiProperty({
    description: '初始密码（6-64 字符，服务端 bcrypt(12) 哈希）',
    example: 'Dev@123456',
    minLength: 6,
    maxLength: 64,
  })
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password: string;

  @ApiProperty({ description: '真实姓名', example: '研发一号', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  realname: string;

  @ApiPropertyOptional({ description: '昵称', example: '小白', maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  nickname?: string;

  @ApiPropertyOptional({
    description: '职位展示字段（dev/qa/pm/po/td/pd/qd/top/others，不参与鉴权）',
    example: 'dev',
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  role?: string;

  @ApiPropertyOptional({
    description: '部门 ID（0=未分配）',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  deptId?: number;

  @ApiPropertyOptional({
    description: '邮箱',
    example: 'dev01@example.com',
    maxLength: 90,
  })
  @IsOptional()
  @IsString()
  @MaxLength(90)
  email?: string;

  @ApiPropertyOptional({
    description: '手机号',
    example: '13800000000',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobile?: string;

  @ApiPropertyOptional({
    description: '初始角色 ID 数组（写 sys_user_role，projectId=0 全局）',
    example: [5],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  roleIds?: number[];
}

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: '真实姓名',
    example: '研发二号',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  realname?: string;

  @ApiPropertyOptional({ description: '昵称', example: '小白', maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  nickname?: string;

  @ApiPropertyOptional({
    description: '职位展示字段（不参与鉴权）',
    example: 'qa',
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  role?: string;

  @ApiPropertyOptional({ description: '部门 ID', example: 1, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  deptId?: number;

  @ApiPropertyOptional({
    description: '邮箱',
    example: 'dev02@example.com',
    maxLength: 90,
  })
  @IsOptional()
  @IsString()
  @MaxLength(90)
  email?: string;

  @ApiPropertyOptional({
    description: '手机号',
    example: '13900000000',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobile?: string;

  @ApiPropertyOptional({
    description: '重置密码（提供时 bcrypt 重哈希）',
    example: 'NewPass@123',
    minLength: 6,
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password?: string;
}

export class UserQueryDto extends PageQueryDto {
  @ApiPropertyOptional({
    description: '关键字（匹配 账号/姓名/昵称）',
    example: 'dev',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  keyword?: string;

  @ApiPropertyOptional({ description: '按部门筛选', example: 1, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  deptId?: number;
}

/** PUT /users/:id/roles（docs/03 §4.1；projectId=0 全局授权） */
export class AssignRolesDto {
  @ApiProperty({
    description: '角色 ID 全量数组（替换式，空数组=清空）',
    example: [5, 6],
    type: [Number],
  })
  @IsArray()
  roleIds: number[];

  @ApiPropertyOptional({
    description: '作用项目 ID（0=全局授权，>0 仅该项目内生效）',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  projectId?: number;
}
