import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDeptDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  parentId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  manager?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;
}

export class UpdateDeptDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  manager?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;
}
