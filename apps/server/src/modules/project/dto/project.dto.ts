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
import { ACL_VALUES } from '../../program/dto/program.dto.js';

/** 一期管理模型（docs/01 §4.3 / ADR D009：开放枚举，源码可用 3 种） */
export const PROJECT_MODELS = ['scrum', 'waterfall', 'kanban'] as const;
export type ProjectModel = (typeof PROJECT_MODELS)[number];

/** model → 执行类型映射（docs/02 §3.1 execution/config.php:15-18 对齐） */
export const MODEL_EXECUTION_TYPE: Record<string, string> = {
  scrum: 'sprint',
  waterfall: 'stage',
  kanban: 'kanban',
};

export class CreateProjectDto {
  @ApiPropertyOptional({
    description: '所属项目集 ID（0=独立项目）',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  programId?: number;

  @ApiProperty({
    description: '项目名称（1-90 字符）',
    example: '能耗平台一期',
    minLength: 1,
    maxLength: 90,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(90)
  name: string;

  @ApiProperty({
    description: '项目编码（唯一，重复 3004）',
    example: 'EMS-P1',
    maxLength: 45,
  })
  @IsString()
  @MaxLength(45)
  code: string;

  @ApiProperty({
    description: '管理模型（一期：scrum/waterfall/kanban；决定执行类型映射）',
    example: 'scrum',
    enum: ['scrum', 'waterfall', 'kanban'],
  })
  @IsIn(PROJECT_MODELS)
  model: ProjectModel;

  @ApiProperty({ description: '开始日期', example: '2026-11-10' })
  @IsDateString()
  begin: string;

  @ApiProperty({ description: '结束日期', example: '2027-01-31' })
  @IsDateString()
  end: string;

  @ApiPropertyOptional({
    description: '工作日数（0=自动按自然日估算）',
    example: 60,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  days?: number;

  @ApiPropertyOptional({ description: '项目经理用户 ID', example: '1' })
  @IsOptional()
  @IsString()
  pmId?: string;

  @ApiPropertyOptional({
    description: '多执行项目（0=单执行：自动创建影子迭代；1=允许多执行）',
    example: 0,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  multiple?: number;

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
}

export class UpdateProjectDto {
  @ApiPropertyOptional({ description: '项目名称', maxLength: 90 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(90)
  name?: string;

  @ApiPropertyOptional({ description: '项目经理用户 ID' })
  @IsOptional()
  @IsString()
  pmId?: string;

  @ApiPropertyOptional({
    description: '结束日期（延期）',
    example: '2027-03-15',
  })
  @IsOptional()
  @IsDateString()
  end?: string;

  @ApiPropertyOptional({ description: '描述', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  desc?: string;
}

export class CloseProjectDto {
  @ApiProperty({
    description: '关闭原因（done/cancel）',
    example: 'done',
    enum: ['done', 'cancel'],
  })
  @IsIn(['done', 'cancel'])
  closedReason: 'done' | 'cancel';
}

/** PUT /projects/:id/products（全量替换项目-产品关联，docs/03 §4.8 manageProducts） */
export class SetProjectProductsDto {
  @ApiProperty({
    description: '产品关联全量数组（替换式）',
    example: [{ productId: '1', plan: '', roadmap: '' }],
    type: [Object],
  })
  @IsArray()
  items: Array<{ productId: string; plan?: string; roadmap?: string }>;
}
