import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';
import { PageQueryDto } from '../../../common/dto/page.dto.js';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  account: string;

  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password: string;

  @IsString()
  @MaxLength(100)
  realname: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  nickname?: string;

  /** 职位展示字段（不参与鉴权，docs/02 §2.1） */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  role?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  deptId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(90)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobile?: string;

  @IsOptional()
  @IsArray()
  roleIds?: number[];
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  realname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  role?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  deptId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(90)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobile?: string;

  /** 修改密码（bcrypt 重哈希） */
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password?: string;
}

export class UserQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  deptId?: number;
}

/** PUT /users/:id/roles（docs/03 §4.1；projectId=0 全局授权） */
export class AssignRolesDto {
  @IsArray()
  roleIds: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  projectId?: number;
}
