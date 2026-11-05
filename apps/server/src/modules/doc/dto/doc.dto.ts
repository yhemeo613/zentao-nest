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

export class CreateSpaceDto {
  @ApiProperty({
    description: '空间类型',
    example: 'project',
    enum: ['product', 'project', 'execution', 'personal'],
  })
  @IsIn(['product', 'project', 'execution', 'personal'])
  objectType: string;

  @ApiPropertyOptional({
    description: '挂载对象 ID（personal=用户 ID）',
    example: '1',
  })
  @IsOptional()
  @IsString()
  objectId?: string;

  @ApiProperty({
    description: '空间名称（1-90 字符）',
    example: '项目文档库',
    minLength: 1,
    maxLength: 90,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(90)
  name: string;

  @ApiPropertyOptional({
    description: '访问控制',
    example: 'open',
    enum: ['open', 'private', 'custom'],
  })
  @IsOptional()
  @IsIn(['open', 'private', 'custom'])
  acl?: 'open' | 'private' | 'custom';

  @ApiPropertyOptional({ description: '白名单用户 ID 数组', type: [String] })
  @IsOptional()
  @IsArray()
  whitelist?: string[];
}

export class CreateDocLibDto {
  @ApiProperty({ description: '所属空间 ID', example: '1' })
  @IsString()
  spaceId: string;

  @ApiProperty({
    description: '库名称（1-60 字符）',
    example: '需求文档',
    minLength: 1,
    maxLength: 60,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name: string;

  @ApiPropertyOptional({
    description: '默认库标记',
    example: 0,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  main?: number;

  @ApiPropertyOptional({ description: '排序号' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;
}

export class CreateDocDto {
  @ApiProperty({ description: '所属库 ID', example: '1' })
  @IsString()
  libId: string;

  @ApiProperty({
    description: '文档标题（1-90 字符）',
    example: '接入方案设计',
    minLength: 1,
    maxLength: 90,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(90)
  title: string;

  @ApiPropertyOptional({ description: '正文（Markdown；type=link 时为 URL）' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: '类型（默认 markdown）',
    example: 'markdown',
    enum: ['text', 'markdown', 'link'],
  })
  @IsOptional()
  @IsIn(['text', 'markdown', 'link'])
  type?: string;

  @ApiPropertyOptional({ description: '关键词' })
  @IsOptional()
  @IsString()
  keywords?: string;

  @ApiPropertyOptional({ description: '挂载业务对象类型（task/story/bug…）' })
  @IsOptional()
  @IsString()
  objectType?: string;

  @ApiPropertyOptional({ description: '挂载业务对象 ID' })
  @IsOptional()
  @IsString()
  objectId?: string;

  @ApiPropertyOptional({ description: '模块 ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  moduleId?: number;
}

export class UpdateDocDto {
  @ApiPropertyOptional({ description: '标题', maxLength: 90 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(90)
  title?: string;

  @ApiPropertyOptional({ description: '正文（Markdown；变化 → version+1）' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '关键词' })
  @IsOptional()
  @IsString()
  keywords?: string;

  @ApiPropertyOptional({ description: '排序号' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;
}
