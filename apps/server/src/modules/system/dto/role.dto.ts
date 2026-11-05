import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(30)
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}

/** PUT /roles/:id/permissions（全量替换，docs/03 §4.1 对齐禅道 updatePrivByGroup） */
export class SetRolePermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
