import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** 分页/排序查询基类（docs/03 §1 全局约定；pageSize 上限 100） */
export class PageQueryDto {
  @ApiPropertyOptional({
    description: '页码（1 起）',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: '每页条数（1-100）',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ApiPropertyOptional({
    description: '排序字段（实体属性 camelCase）',
    example: 'id',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: '排序方向',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder: 'ASC' | 'DESC' = 'DESC';

  get offset(): number {
    return (this.page - 1) * this.pageSize;
  }
}

export function toPageResult<T>(
  list: T[],
  total: number,
  query: Pick<PageQueryDto, 'page' | 'pageSize'>,
): { list: T[]; total: number; page: number; pageSize: number } {
  return { list, total, page: query.page, pageSize: query.pageSize };
}
