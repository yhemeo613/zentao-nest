import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ACL_VALUES } from '../../program/dto/program.dto.js';

export class CreateProductDto {
  @ApiPropertyOptional({
    description: '所属项目集 ID（0=独立产品）',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  programId?: number;

  @ApiProperty({
    description: '产品名称（1-110 字符）',
    example: '能耗管理平台',
    minLength: 1,
    maxLength: 110,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(110)
  name: string;

  @ApiPropertyOptional({ description: '编码', example: 'EMS', maxLength: 45 })
  @IsOptional()
  @IsString()
  @MaxLength(45)
  code?: string;

  @ApiPropertyOptional({ description: '产品负责人用户 ID', example: '1' })
  @IsOptional()
  @IsString()
  poId?: string;

  @ApiPropertyOptional({ description: '测试负责人用户 ID', example: '2' })
  @IsOptional()
  @IsString()
  qdId?: string;

  @ApiPropertyOptional({ description: '研发负责人用户 ID', example: '3' })
  @IsOptional()
  @IsString()
  rdId?: string;

  @ApiPropertyOptional({
    description: '访问控制',
    example: 'open',
    enum: ['open', 'private', 'custom'],
  })
  @IsOptional()
  @IsIn(ACL_VALUES)
  acl?: (typeof ACL_VALUES)[number];

  @ApiPropertyOptional({ description: '白名单用户 ID 数组', type: [String] })
  @IsOptional()
  @IsArray()
  whitelist?: string[];

  @ApiPropertyOptional({ description: '描述', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  desc?: string;

  @ApiPropertyOptional({ description: '同级排序号', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ description: '产品名称', maxLength: 110 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(110)
  name?: string;

  @ApiPropertyOptional({ description: '编码', maxLength: 45 })
  @IsOptional()
  @IsString()
  @MaxLength(45)
  code?: string;

  @ApiPropertyOptional({ description: '产品负责人用户 ID' })
  @IsOptional()
  @IsString()
  poId?: string;

  @ApiPropertyOptional({ description: '测试负责人用户 ID' })
  @IsOptional()
  @IsString()
  qdId?: string;

  @ApiPropertyOptional({ description: '研发负责人用户 ID' })
  @IsOptional()
  @IsString()
  rdId?: string;

  @ApiPropertyOptional({ description: '描述', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  desc?: string;

  @ApiPropertyOptional({ description: '同级排序号' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;
}

export class CreateModuleDto {
  @ApiProperty({ description: '所属产品 ID', example: '1' })
  @IsString()
  rootId: string;

  @ApiProperty({
    description: '模块名称（1-60 字符）',
    example: '设备接入',
    minLength: 1,
    maxLength: 60,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name: string;

  @ApiPropertyOptional({
    description: '父模块 ID（0=根）',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  parentId?: number;

  @ApiPropertyOptional({ description: '模块负责人用户 ID' })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional({ description: '排序号' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;
}

export class UpdateModuleDto {
  @ApiPropertyOptional({ description: '模块名称', maxLength: 60 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional({ description: '模块负责人用户 ID' })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional({ description: '排序号' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;
}
