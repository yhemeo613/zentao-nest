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
import { TaskType } from '@zentao/shared';

export class CreateTaskDto {
  @ApiProperty({ description: '所属项目 ID', example: '1' })
  @IsString()
  projectId: string;

  @ApiProperty({ description: '所属执行 ID', example: '1' })
  @IsString()
  executionId: string;

  @ApiProperty({
    description: '任务名称（1-255 字符）',
    example: '设备接入接口开发',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: '任务类型',
    example: 'devel',
    enum: Object.values(TaskType),
  })
  @IsOptional()
  @IsIn(Object.values(TaskType))
  type?: string;

  @ApiPropertyOptional({ description: '关联需求 ID（锁定 storyVersion）' })
  @IsOptional()
  @IsString()
  storyId?: string;

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

  @ApiProperty({ description: '预计工时（≥0）', example: 8, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimate: number;

  @ApiPropertyOptional({ description: '指派给（用户 ID）' })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({ description: '预计开始日期' })
  @IsOptional()
  @IsDateString()
  estStarted?: string;

  @ApiPropertyOptional({ description: '截止日期' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({ description: '描述（Markdown）' })
  @IsOptional()
  @IsString()
  desc?: string;
}

export class StartTaskDto {
  @ApiProperty({
    description: '本次开始消耗工时（≥0，须 ≥ 旧 consumed）',
    example: 0,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  consumed: number;

  @ApiProperty({
    description: '剩余工时（≥0；=0 直接完成 docs/02 §6.1）',
    example: 8,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  left: number;

  @ApiPropertyOptional({ description: '实际开始日期' })
  @IsOptional()
  @IsDateString()
  realStarted?: string;
}

export class FinishTaskDto {
  @ApiProperty({
    description: '本次完成消耗工时（>0；consumed=旧+新增，docs/02 §6.1）',
    example: 8,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  consumed: number;

  @ApiProperty({ description: '实际开始日期', example: '2026-11-10' })
  @IsDateString()
  realStarted: string;

  @ApiProperty({
    description: '完成日期（≥realStarted）',
    example: '2026-11-20',
  })
  @IsDateString()
  finishedDate: string;

  @ApiPropertyOptional({ description: '工作内容' })
  @IsOptional()
  @IsString()
  work?: string;
}

export class ActivateTaskDto {
  @ApiProperty({
    description: '返工剩余工时（>0 必填，4706）',
    example: 4,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  left: number;
}

export class AssignTaskDto {
  @ApiProperty({ description: '指派给（用户 ID）', example: '2' })
  @IsString()
  assignedTo: string;

  @ApiPropertyOptional({
    description: '剩余工时（未完成任务指派须 >0，4706）',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  left?: number;
}

export class RecordEffortDto {
  @ApiProperty({
    description: '工时日期（≤今天，4703）',
    example: '2026-11-15',
  })
  @IsDateString()
  date: string;

  @ApiProperty({ description: '本次消耗工时（>0）', example: 4, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  consumed: number;

  @ApiProperty({
    description: '记录后剩余工时（≥0；=0 隐式完成，docs/02 §6.4）',
    example: 4,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  left: number;

  @ApiProperty({ description: '工作内容' })
  @IsString()
  work: string;
}

export class UpdateTaskDto {
  @ApiPropertyOptional({ description: '任务名称', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  desc?: string;

  @ApiPropertyOptional({ description: '截止日期' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({ description: '优先级 1-4', minimum: 1, maximum: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pri?: number;
}

export class TaskQueryDto {
  @ApiPropertyOptional({ description: '执行 ID' })
  @IsOptional()
  @IsString()
  executionId?: string;

  @ApiPropertyOptional({ description: '项目 ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: '需求 ID' })
  @IsOptional()
  @IsString()
  storyId?: string;

  @ApiPropertyOptional({
    description: '状态筛选（逗号分隔多值）',
    example: 'wait,doing',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '指派给（用户 ID）' })
  @IsOptional()
  @IsString()
  assignedTo?: string;
}
