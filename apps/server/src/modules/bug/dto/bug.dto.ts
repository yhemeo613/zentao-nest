import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { BugResolution } from '@zentao/shared';

export class CreateBugDto {
  @ApiProperty({ description: '所属产品 ID', example: '1' })
  @IsString()
  productId: string;

  @ApiProperty({
    description: '标题（1-255 字符）',
    example: '接入接口超时',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: '重现步骤（Markdown）' })
  @IsString()
  steps: string;

  @ApiProperty({ description: '发现构建 ID（逗号分隔多值）', example: '1' })
  @IsString()
  openedBuild: string;

  @ApiPropertyOptional({
    description: '严重程度 1-4（默认 3）',
    minimum: 1,
    maximum: 4,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  severity?: number;

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

  @ApiPropertyOptional({ description: '模块 ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  moduleId?: number;

  @ApiPropertyOptional({ description: '项目 ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: '执行 ID' })
  @IsOptional()
  @IsString()
  executionId?: string;

  @ApiPropertyOptional({ description: '关联需求 ID' })
  @IsOptional()
  @IsString()
  storyId?: string;

  @ApiPropertyOptional({
    description: '关联用例 ID 及版本（fail 转 Bug 溯源）',
  })
  @IsOptional()
  @IsString()
  caseId?: string;

  @ApiPropertyOptional({ description: '溯源测试结果 ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  resultId?: number;

  @ApiPropertyOptional({ description: '溯源测试单 ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  testtaskId?: number;

  @ApiPropertyOptional({ description: '指派给（用户 ID）' })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'OS' })
  @IsOptional()
  @IsString()
  os?: string;

  @ApiPropertyOptional({ description: '浏览器' })
  @IsOptional()
  @IsString()
  browser?: string;
}

export class ResolveBugDto {
  @ApiProperty({
    description: '解决方案（tostory 为独立转需求动作不在此列）',
    example: 'fixed',
    enum: Object.values(BugResolution),
  })
  @IsIn(Object.values(BugResolution))
  resolution: string;

  @ApiPropertyOptional({ description: '解决构建 ID（fixed 必填 4801）' })
  @IsOptional()
  @IsString()
  resolvedBuildId?: string;

  @ApiPropertyOptional({ description: '重复 Bug ID（duplicate 必填 4801）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  duplicateBugId?: number;

  @ApiPropertyOptional({ description: '指派给（默认回开单人，docs/02 §7.1）' })
  @IsOptional()
  @IsString()
  assignedTo?: string;
}

export class ActivateBugDto {
  @ApiProperty({ description: '发现构建 ID（必填 4803）', example: '1' })
  @IsString()
  openedBuild: string;

  @ApiPropertyOptional({ description: '指派给（默认=原解决人，docs/02 §7.1）' })
  @IsOptional()
  @IsString()
  assignedTo?: string;
}

export class BugQueryDto {
  @ApiPropertyOptional({ description: '产品 ID' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({
    description: '状态筛选（active/resolved/closed，逗号分隔）',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '关联需求 ID' })
  @IsOptional()
  @IsString()
  storyId?: string;

  @ApiPropertyOptional({ description: '指派给（用户 ID）' })
  @IsOptional()
  @IsString()
  assignedTo?: string;
}

export class ConvertBugToStoryDto {
  @ApiProperty({
    description: '需求标题（默认预填 bug 标题）',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: '需求描述（默认预填重现步骤）' })
  @IsString()
  spec: string;

  @ApiProperty({ description: '验收标准' })
  @IsString()
  verify: string;
}
