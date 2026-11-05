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

export class CreateCaseDto {
  @ApiProperty({ description: '所属产品 ID', example: '1' })
  @IsString()
  productId: string;

  @ApiProperty({
    description: '用例标题（1-255 字符）',
    example: '设备接入-正常流',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: '前置条件（Markdown）' })
  @IsOptional()
  @IsString()
  precondition?: string;

  @ApiProperty({ description: '步骤列表（版本化整套存储）', type: [Object] })
  @IsArray()
  steps: Array<{ stepDesc: string; expect?: string; type?: 'step' | 'group' }>;

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

  @ApiPropertyOptional({ description: '模块 ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  moduleId?: number;
}

export class UpdateCaseDto {
  @ApiPropertyOptional({ description: '标题', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: '前置条件' })
  @IsOptional()
  @IsString()
  precondition?: string;

  @ApiPropertyOptional({
    description: '步骤列表（内容变化 → version+1 整套重插，docs/02 §7.2）',
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  steps?: Array<{ stepDesc: string; expect?: string; type?: 'step' | 'group' }>;

  @ApiPropertyOptional({ description: '优先级 1-4', minimum: 1, maximum: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pri?: number;
}

export class ReviewCaseDto {
  @ApiProperty({
    description: '评审结果（仅两值：pass→normal；clarify 留 wait）',
    example: 'pass',
    enum: ['pass', 'clarify'],
  })
  @IsIn(['pass', 'clarify'])
  result: string;
}

export class RunCaseDto {
  @ApiProperty({
    description:
      '步骤结果列表（聚合规则：任一 fail→fail；否则首个非 pass/n-a；docs/02 §7.3）',
    type: [Object],
    example: [{ stepId: 1, result: 'pass', real: '正常' }],
  })
  @IsArray()
  steps: Array<{
    stepId: number;
    result: 'pass' | 'fail' | 'blocked' | 'n/a';
    real?: string;
  }>;
}
