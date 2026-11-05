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

export class CreateTodoDto {
  @ApiProperty({
    description: '类型（custom 自建；其余关联对象）',
    example: 'custom',
    enum: ['custom', 'task', 'bug', 'story', 'test', 'cycle'],
  })
  @IsIn(['custom', 'task', 'bug', 'story', 'test', 'cycle'])
  type: string;

  @ApiPropertyOptional({ description: '关联对象 ID（type≠custom 必填，5101）' })
  @IsOptional()
  @IsString()
  objectId?: string;

  @ApiPropertyOptional({ description: '日期', example: '2026-11-06' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: '优先级 1-4（默认 3）',
    minimum: 1,
    maximum: 4,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pri?: number;

  @ApiPropertyOptional({ description: '名称（custom 必填）', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  desc?: string;

  @ApiPropertyOptional({ description: '指派给（用户 ID）' })
  @IsOptional()
  @IsString()
  assignedTo?: string;
}

export class UpdateTodoDto {
  @ApiPropertyOptional({ description: '名称', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  desc?: string;

  @ApiPropertyOptional({ description: '优先级 1-4', minimum: 1, maximum: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pri?: number;

  @ApiPropertyOptional({ description: '日期' })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class CreateEffortDto {
  @ApiProperty({
    description: '对象类型',
    example: 'custom',
    enum: ['task', 'story', 'bug', 'case', 'todo', 'custom'],
  })
  @IsIn(['task', 'story', 'bug', 'case', 'todo', 'custom'])
  objectType: string;

  @ApiPropertyOptional({ description: '对象 ID（objectType≠custom 必填）' })
  @IsOptional()
  @IsString()
  objectId?: string;

  @ApiProperty({ description: '日期（≤今天）', example: '2026-11-06' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: '消耗工时（>0）', example: 2, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  consumed: number;

  @ApiPropertyOptional({
    description: '剩余工时（≥0）',
    example: 6,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  left?: number;

  @ApiProperty({ description: '工作内容' })
  @IsString()
  work: string;
}
