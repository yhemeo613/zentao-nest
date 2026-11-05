import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    description: '角色名称（1-30 字符）',
    example: '架构师',
    minLength: 1,
    maxLength: 30,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  name: string;

  @ApiProperty({
    description: '角色编码（唯一，重复报 5302）',
    example: 'arch',
    minLength: 2,
    maxLength: 30,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  code: string;

  @ApiPropertyOptional({
    description: '备注',
    example: '架构评审与设计',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}

export class UpdateRoleDto {
  @ApiPropertyOptional({
    description: '角色名称',
    example: '高级测试',
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  name?: string;

  @ApiPropertyOptional({
    description: '备注',
    example: '测试组角色',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}

/** PUT /roles/:id/permissions（全量替换，docs/03 §4.1 对齐禅道 updatePrivByGroup） */
export class SetRolePermissionsDto {
  @ApiProperty({
    description:
      '权限点全量数组（module.action，替换式；仅 active 权限点可授予；超管角色不可显式授权）',
    example: ['user.browse', 'user.create', 'dept.manage'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
