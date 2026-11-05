/**
 * 统一响应与分页契约（规格：docs/03-接口与契约.md §1 全局约定）
 * 双端唯一响应包装定义 —— 前端禁止自造 R/RList 类临时包装（docs/06 §4.4）。
 */

/** 统一响应体 */
export interface ApiResponse<T = unknown> {
  /** 0=成功，其余见 @zentao/shared ErrorCodes */
  code: number;
  message: string;
  data: T;
  /** 链路追踪 ID（请求头 X-Trace-Id 透传） */
  traceId: string;
  /** 服务端时间戳（ms） */
  timestamp: number;
}

/** 分页响应（列表端点统一 data 结构） */
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 分页/排序查询参数（后端 PageQueryDto 基类字段） */
export interface PageQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
