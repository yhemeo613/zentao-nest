import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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

/** 瀑布工序属性（docs/02 §3.5 stage 模板类型枚举） */
export const STAGE_ATTRIBUTES = [
  'mix',
  'request',
  'design',
  'dev',
  'qa',
  'release',
  'review',
  'other',
] as const;

export class CreateExecutionDto {
  @ApiProperty({ description: '所属项目 ID', example: '1' })
  @IsString()
  projectId: string;

  @ApiProperty({
    description: '执行名称（1-90 字符）',
    example: '迭代一',
    minLength: 1,
    maxLength: 90,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(90)
  name: string;

  @ApiProperty({ description: '开始日期', example: '2026-11-10' })
  @IsDateString()
  begin: string;

  @ApiProperty({ description: '结束日期', example: '2026-11-28' })
  @IsDateString()
  end: string;

  @ApiPropertyOptional({ description: '工作日数', example: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  days?: number;

  @ApiPropertyOptional({
    description: '瀑布工序属性（仅 type=stage 时有效）',
    example: 'dev',
    enum: STAGE_ATTRIBUTES,
  })
  @IsOptional()
  @IsIn(STAGE_ATTRIBUTES)
  attribute?: (typeof STAGE_ATTRIBUTES)[number];

  @ApiPropertyOptional({
    description: '父阶段 ID（创建瀑布子阶段时提供；子阶段 grade=父+1）',
  })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Scrum 冲刺目标', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sprintGoal?: string;

  @ApiPropertyOptional({
    description: '里程碑（瀑布，0/1）',
    example: 0,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  milestone?: number;

  @ApiPropertyOptional({
    description: '阶段工时占比（瀑布，同级合计≤100，超限 4604）',
    example: 40,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  percent?: number;
}

export class UpdateExecutionDto {
  @ApiPropertyOptional({ description: '执行名称', maxLength: 90 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(90)
  name?: string;

  @ApiPropertyOptional({
    description: '结束日期（延期由 /putoff 端点处理；此处支持普通编辑）',
    example: '2026-12-05',
  })
  @IsOptional()
  @IsDateString()
  end?: string;

  @ApiPropertyOptional({ description: 'Scrum 冲刺目标', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sprintGoal?: string;

  @ApiPropertyOptional({ description: '排序号' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;
}

export class CloseExecutionDto {
  @ApiProperty({
    description: '关闭原因（done/cancel）',
    example: 'done',
    enum: ['done', 'cancel'],
  })
  @IsIn(['done', 'cancel'])
  closedReason: 'done' | 'cancel';
}
