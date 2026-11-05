import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ description: '所属产品 ID', example: '1' })
  @IsString()
  productId: string;

  @ApiProperty({
    description: '计划标题（1-90 字符）',
    example: '2026-Q4 迭代计划',
    minLength: 1,
    maxLength: 90,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(90)
  title: string;

  @ApiProperty({ description: '开始日期', example: '2026-11-01' })
  @IsDateString()
  begin: string;

  @ApiProperty({ description: '结束日期', example: '2026-12-31' })
  @IsDateString()
  end: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  desc?: string;

  @ApiPropertyOptional({
    description: '未来计划（是 → begin/end 存 2038-01-01 约定，docs/02 §5.1）',
    example: false,
  })
  @IsOptional()
  @IsIn([0, 1])
  isFuture?: number;
}

export class UpdatePlanDto {
  @ApiPropertyOptional({ description: '标题', maxLength: 90 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(90)
  title?: string;

  @ApiPropertyOptional({ description: '结束日期（延期）' })
  @IsOptional()
  @IsDateString()
  end?: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  desc?: string;
}

export class LinkPlanStoriesDto {
  @ApiProperty({
    description: '需求 ID 全量数组（追加式关联）',
    type: [String],
    example: ['1', '2'],
  })
  @IsArray()
  @IsString({ each: true })
  storyIds: string[];
}
