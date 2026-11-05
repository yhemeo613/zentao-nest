import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class AddTeamMemberDto {
  @ApiProperty({
    description: '归属类型（project|execution）',
    example: 'project',
    enum: ['project', 'execution'],
  })
  @IsIn(['project', 'execution'])
  rootType: 'project' | 'execution';

  @ApiProperty({ description: '归属对象 ID', example: '1' })
  @IsString()
  @MaxLength(30)
  rootId: string;

  @ApiProperty({ description: '成员用户 ID', example: '2' })
  @IsString()
  @MaxLength(30)
  userId: string;

  @ApiPropertyOptional({
    description: '成员角色（PM/dev/qa 等）',
    example: 'dev',
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  role?: string;

  @ApiPropertyOptional({
    description: '岗位',
    example: '后端开发',
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  position?: string;

  @ApiPropertyOptional({
    description: '受限成员（0 否 / 1 是）',
    example: 0,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  limited?: number;

  @ApiPropertyOptional({ description: '投入天数', example: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  days?: number;

  @ApiPropertyOptional({
    description: '日可用工时（0-9.9）',
    example: 8,
    minimum: 0,
    maximum: 9.9,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hours?: number;
}

export class UpdateTeamMemberDto {
  @ApiPropertyOptional({ description: '成员角色', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  role?: string;

  @ApiPropertyOptional({ description: '岗位', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  position?: string;

  @ApiPropertyOptional({ description: '投入天数' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  days?: number;

  @ApiPropertyOptional({
    description: '日可用工时（0-9.9）',
    minimum: 0,
    maximum: 9.9,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hours?: number;
}

export class TeamQueryDto {
  @ApiProperty({
    description: '归属类型（project|execution）',
    example: 'project',
    enum: ['project', 'execution'],
  })
  @IsIn(['project', 'execution'])
  rootType: 'project' | 'execution';

  @ApiProperty({ description: '归属对象 ID', example: '1' })
  @IsString()
  rootId: string;
}
