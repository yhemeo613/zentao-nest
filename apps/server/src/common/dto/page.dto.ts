import { Type } from 'class-transformer';
import { IsInt, IsIn, IsOptional, IsString, Max, Min } from 'class-validator';
import { PageResult } from '@zentao/shared';

/** 分页/排序查询基类（docs/03 §1 全局约定；pageSize 上限 100） */
export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string;

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
): PageResult<T> {
  return { list, total, page: query.page, pageSize: query.pageSize };
}
