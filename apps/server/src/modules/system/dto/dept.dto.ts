import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateDeptDto {
  @ApiProperty({
    description: '部门名称（1-60 字符）',
    example: '研发部',
    minLength: 1,
    maxLength: 60,
  })
  @IsString()
  @MaxLength(60)
  name: string;

  @ApiPropertyOptional({
    description: '父部门 ID（0=根节点；父不存在报 3005）',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  parentId?: number;

  @ApiPropertyOptional({
    description: '部门负责人（账号）',
    example: 'admin',
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  manager?: string;

  @ApiPropertyOptional({ description: '同级排序号（小在前）', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;
}

export class UpdateDeptDto {
  @ApiPropertyOptional({
    description: '部门名称',
    example: '平台研发部',
    maxLength: 60,
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional({ description: '部门负责人（账号）', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  manager?: string;

  @ApiPropertyOptional({ description: '同级排序号', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;
}
