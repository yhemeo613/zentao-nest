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
  Min,
  MinLength,
} from 'class-validator';

export class CreateTestTaskDto {
  @ApiProperty({ description: '所属产品 ID', example: '1' })
  @IsString()
  productId: string;

  @ApiProperty({
    description: '测试单名称（1-90 字符）',
    example: 'EMS 一轮测试',
    minLength: 1,
    maxLength: 90,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(90)
  name: string;

  @ApiProperty({ description: '测试构建 ID（测试对象）', example: '1' })
  @IsString()
  buildId: string;

  @ApiPropertyOptional({ description: '项目 ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: '执行 ID' })
  @IsOptional()
  @IsString()
  executionId?: string;

  @ApiProperty({ description: '负责人（用户 ID）', example: '2' })
  @IsString()
  ownerId: string;

  @ApiProperty({ description: '开始日期', example: '2026-11-21' })
  @IsDateString()
  begin: string;

  @ApiProperty({ description: '结束日期', example: '2026-11-25' })
  @IsDateString()
  end: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  desc?: string;
}

export class CloseTestTaskDto {
  @ApiProperty({
    description: '实际完成日期（必填且晚于 begin，4951）',
    example: '2026-11-26',
  })
  @IsDateString()
  realFinishedDate: string;
}

export class LinkCasesDto {
  @ApiProperty({
    description: '用例 ID 数组（replace 语义写 test_run，docs/02 §7.3）',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  caseIds: string[];
}

export class RunCaseBodyDto {
  @ApiProperty({
    description: '步骤结果列表（聚合：任一 fail→fail）',
    type: [Object],
  })
  @IsArray()
  steps: Array<{
    stepId: number;
    result: 'pass' | 'fail' | 'blocked' | 'n/a';
    real?: string;
  }>;

  @ApiPropertyOptional({ description: '用例 ID（不传取 run 上的 case）' })
  @IsOptional()
  @IsString()
  caseId?: string;
}
