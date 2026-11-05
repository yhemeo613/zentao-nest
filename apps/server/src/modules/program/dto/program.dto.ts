import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** ACL 取值（docs/02 §2.2：v22 产品/项目主要 open|private，custom 预留） */
export const ACL_VALUES = ['open', 'private', 'custom'] as const;

export class CreateProgramDto {
  @ApiPropertyOptional({
    description: '父项目集 ID（0=顶级；自动 grade=父+1、path 物化路径）',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  parentId?: number;

  @ApiProperty({
    description: '项目集名称（1-90 字符）',
    example: '智慧能源事业群',
    minLength: 1,
    maxLength: 90,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(90)
  name: string;

  @ApiPropertyOptional({
    description: '编码',
    example: 'ENERGY',
    maxLength: 45,
  })
  @IsOptional()
  @IsString()
  @MaxLength(45)
  code?: string;

  @ApiPropertyOptional({ description: '项目集经理用户 ID', example: '1' })
  @IsOptional()
  @IsString()
  pmId?: string;

  @ApiPropertyOptional({
    description: '预算（≥0）',
    example: 1000000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({
    description: '预算单位',
    example: 'CNY',
    default: 'CNY',
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  budgetUnit?: string;

  @ApiProperty({ description: '开始日期', example: '2026-11-01' })
  @IsDateString()
  begin: string;

  @ApiProperty({ description: '结束日期', example: '2027-06-30' })
  @IsDateString()
  end: string;

  @ApiPropertyOptional({ description: '描述', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  desc?: string;

  @ApiPropertyOptional({
    description: '访问控制（open 公开 / private 私有 / custom 预留）',
    example: 'open',
    enum: ['open', 'private', 'custom'],
  })
  @IsOptional()
  @IsIn(ACL_VALUES)
  acl?: (typeof ACL_VALUES)[number];

  @ApiPropertyOptional({
    description: '白名单用户 ID 数组（private/custom 时生效，同时写 sys_acl）',
    example: ['2', '3'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  whitelist?: string[];

  @ApiPropertyOptional({ description: '同级排序号', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;
}

export class UpdateProgramDto {
  @ApiPropertyOptional({ description: '名称', maxLength: 90 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(90)
  name?: string;

  @ApiPropertyOptional({ description: '编码', maxLength: 45 })
  @IsOptional()
  @IsString()
  @MaxLength(45)
  code?: string;

  @ApiPropertyOptional({ description: '项目集经理用户 ID' })
  @IsOptional()
  @IsString()
  pmId?: string;

  @ApiPropertyOptional({ description: '预算（≥0）', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({
    description: '结束日期（延期）',
    example: '2027-08-31',
  })
  @IsOptional()
  @IsDateString()
  end?: string;

  @ApiPropertyOptional({ description: '描述', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  desc?: string;

  @ApiPropertyOptional({
    description: '访问控制',
    enum: ['open', 'private', 'custom'],
  })
  @IsOptional()
  @IsIn(ACL_VALUES)
  acl?: (typeof ACL_VALUES)[number];

  @ApiPropertyOptional({
    description: '白名单用户 ID 数组（全量替换）',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  whitelist?: string[];

  @ApiPropertyOptional({ description: '同级排序号' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;
}

/** POST /programs/:id/close（docs/02 §3.2；关闭原因枚举对齐禅道 closedReason） */
export class CloseProgramDto {
  @ApiProperty({
    description: '关闭原因（done 完成 / cancel 取消）',
    example: 'done',
    enum: ['done', 'cancel'],
  })
  @IsIn(['done', 'cancel'])
  closedReason: 'done' | 'cancel';
}
