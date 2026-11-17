import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateBuildDto {
  @ApiProperty({ description: '所属产品 ID', example: '1' })
  @IsString()
  productId: string;

  @ApiProperty({
    description: '构建名称（同产品同分支唯一，4401）',
    example: 'v1.0.0-build.1',
    minLength: 1,
    maxLength: 150,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name: string;

  @ApiProperty({ description: '构建日期', example: '2026-11-17' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: '构建人（账号）', example: '1', maxLength: 30 })
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  builder: string;

  @ApiPropertyOptional({ description: '所属项目 ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: '所属执行 ID' })
  @IsOptional()
  @IsString()
  executionId?: string;

  @ApiPropertyOptional({ description: '代码路径（repo tag/commit）', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  scmPath?: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  desc?: string;

  @ApiPropertyOptional({
    description: '初始关联需求 ID 数组（追加式写关联表 + 逗号串）',
    type: [String],
    example: ['1', '2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  storyIds?: string[];
}

export class LinkBuildStoriesDto {
  @ApiProperty({
    description: '需求 ID 全量数组（追加式关联）',
    type: [String],
    example: ['1', '2'],
  })
  @IsArray()
  @IsString({ each: true })
  storyIds: string[];
}

export class LinkBuildBugsDto {
  @ApiProperty({
    description: 'Bug ID 全量数组（未解决的自动置 resolved/fixed 并回指开单人）',
    type: [String],
    example: ['1'],
  })
  @IsArray()
  @IsString({ each: true })
  bugIds: string[];
}

/** 发布创建（契约挂在 build 域：发布由所选构建汇总范围，docs/02 §5.3） */
export class CreateReleaseDto {
  @ApiProperty({ description: '所属产品 ID', example: '1' })
  @IsString()
  productId: string;

  @ApiProperty({ description: '发布名称', example: 'v1.0.0', minLength: 1, maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: '关联构建 ID 数组（范围需求/修复 Bug 按构建汇总）',
    type: [String],
    example: ['1'],
  })
  @IsArray()
  @IsString({ each: true })
  buildIds: string[];

  @ApiProperty({ description: '发布日期', example: '2026-11-17' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: '关联项目 ID 串（禅道 varchar 语义）' })
  @IsOptional()
  @IsString()
  projectIds?: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  desc?: string;
}

export class ChangeReleaseStatusDto {
  @ApiProperty({ description: '动作', enum: ['activate', 'terminate'], example: 'terminate' })
  @IsIn(['activate', 'terminate'])
  action: 'activate' | 'terminate';
}
