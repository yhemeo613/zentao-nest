import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  StoryClosedReason,
  StoryReviewResult,
  StorySource,
  StoryStatus,
  StoryType,
} from '@zentao/shared';

export class CreateStoryDto {
  @ApiProperty({ description: '所属产品 ID', example: '1' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({
    description: '分支（0=主干）',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  branchId?: number;

  @ApiPropertyOptional({ description: '所属模块 ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  moduleId?: number;

  @ApiProperty({
    description: '需求标题（1-255 字符）',
    example: '支持设备批量接入',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    description: '需求类型（一期 story）',
    example: 'story',
    enum: ['story', 'requirement', 'epic'],
  })
  @IsOptional()
  @IsIn([StoryType.Story, StoryType.Requirement, StoryType.Epic])
  type?: string;

  @ApiPropertyOptional({
    description: '优先级 1-4（默认 3）',
    example: 3,
    minimum: 1,
    maximum: 4,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pri?: number;

  @ApiPropertyOptional({
    description: '预估工时（≥0）',
    example: 8,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimate?: number;

  @ApiProperty({ description: '需求描述（Markdown）' })
  @IsString()
  spec: string;

  @ApiProperty({ description: '验收标准（Markdown）' })
  @IsString()
  verify: string;

  @ApiPropertyOptional({
    description:
      '提交状态：draft=存草稿；active=提请评审（needReview 默认开启 → 服务端覆写为 reviewing）',
    example: 'active',
    enum: ['draft', 'active'],
  })
  @IsOptional()
  @IsIn([StoryStatus.Draft, StoryStatus.Active])
  status?: string;

  @ApiPropertyOptional({
    description: '评审人用户 ID 数组（提审时必填）',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  reviewerIds?: string[];

  @ApiPropertyOptional({
    description: '来源',
    example: 'customer',
    enum: Object.values(StorySource),
  })
  @IsOptional()
  @IsIn(Object.values(StorySource))
  source?: string;

  @ApiPropertyOptional({ description: '来源备注', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sourceNote?: string;

  @ApiPropertyOptional({ description: '关键词', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  keywords?: string;

  @ApiPropertyOptional({ description: '指派给（用户 ID）' })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({ description: '由 Bug 转需求时携带（回写 bug 用）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fromBugId?: number;
}

export class ChangeStoryDto {
  @ApiProperty({ description: '标题（1-255）', minLength: 1, maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: '需求描述（Markdown）' })
  @IsString()
  spec: string;

  @ApiProperty({ description: '验收标准（Markdown）' })
  @IsString()
  verify: string;

  @ApiPropertyOptional({ description: '优先级 1-4', minimum: 1, maximum: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pri?: number;

  @ApiPropertyOptional({ description: '预估工时', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimate?: number;

  @ApiProperty({
    description: '是否提请评审（true→reviewing；false→changing）',
    example: true,
  })
  @IsBoolean()
  submitReview: boolean;

  @ApiPropertyOptional({
    description: '评审人用户 ID 数组（提审必填）',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  reviewerIds?: string[];
}

export class ReviewStoryDto {
  @ApiProperty({
    description:
      '评审结果：pass 通过 / revert 撤销变更（仅 v>1）/ clarify 有待明确 / reject 拒绝（仅 v=1）',
    example: 'pass',
    enum: Object.values(StoryReviewResult),
  })
  @IsIn(Object.values(StoryReviewResult))
  result: string;

  @ApiPropertyOptional({
    description: '关闭原因（reject 必填）',
    enum: Object.values(StoryClosedReason),
  })
  @IsOptional()
  @IsIn(Object.values(StoryClosedReason))
  closedReason?: string;

  @ApiPropertyOptional({
    description: '重复需求 ID（closedReason=duplicate 必填）',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  duplicateStoryId?: number;
}

export class CloseStoryDto {
  @ApiProperty({
    description: '关闭原因',
    example: 'done',
    enum: Object.values(StoryClosedReason),
  })
  @IsIn(Object.values(StoryClosedReason))
  closedReason: string;

  @ApiPropertyOptional({
    description: '重复需求 ID（closedReason=duplicate 必填）',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  duplicateStoryId?: number;

  @ApiPropertyOptional({
    description: '存在未关闭子需求时强制关闭（默认 false → 报 4203）',
    example: false,
  })
  @IsOptional()
  force?: boolean;
}

export class SubdivideStoryDto {
  @ApiProperty({
    description: '子需求列表（父 estimate=Σ子；父 isParent=1）',
    type: [Object],
    example: [{ title: '子需求1', spec: '...', verify: '...', estimate: 4 }],
  })
  @IsArray()
  children: Array<{
    title: string;
    spec: string;
    verify: string;
    estimate?: number;
  }>;
}

export class AssignStoryDto {
  @ApiProperty({ description: '指派给（用户 ID）', example: '2' })
  @IsString()
  assignedTo: string;
}

export class StoryQueryDto {
  @ApiPropertyOptional({ description: '产品 ID' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({
    description: '状态筛选',
    enum: ['draft', 'reviewing', 'active', 'changing', 'closed'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '模块 ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  moduleId?: number;

  @ApiPropertyOptional({ description: '关键字（标题）' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  keyword?: string;
}
