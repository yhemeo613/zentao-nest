import { getSchemaPath } from '@nestjs/swagger';

/**
 * Swagger 响应 schema 助手（docs/03 §1 统一响应体契约的可视化）
 * 所有端点 @ApiOkResponse 必须经此包裹——文档明确展示 code/message/data/traceId/timestamp 结构。
 */

export interface EnvelopedItem {
  [key: string]: unknown;
}

/** 单对象响应：data 为 $ref 对象 */
export function enveloped(
  itemClass: abstract new (...args: never[]) => unknown,
): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      code: { type: 'number', example: 0 },
      message: { type: 'string', example: 'ok' },
      data: { $ref: getSchemaPath(itemClass as never) },
      traceId: { type: 'string', example: 'uuid' },
      timestamp: { type: 'integer', example: 1793860284593 },
    },
    required: ['code', 'message', 'data', 'traceId', 'timestamp'],
  };
}

/** 列表分页响应：data 为 PageResult<T> 结构 */
export function envelopedPage(
  itemClass: abstract new (...args: never[]) => unknown,
): Record<string, unknown> {
  const itemPath = getSchemaPath(itemClass as never);
  return {
    type: 'object',
    properties: {
      code: { type: 'number', example: 0 },
      message: { type: 'string', example: 'ok' },
      data: {
        type: 'object',
        properties: {
          list: { type: 'array', items: { $ref: itemPath } },
          total: { type: 'integer', example: 1 },
          page: { type: 'integer', example: 1 },
          pageSize: { type: 'integer', example: 20 },
        },
        required: ['list', 'total', 'page', 'pageSize'],
      },
      traceId: { type: 'string', example: 'uuid' },
      timestamp: { type: 'integer', example: 1793860284593 },
    },
    required: ['code', 'message', 'data', 'traceId', 'timestamp'],
  };
}

/** 标量/空响应：data 为内联类型 */
export function envelopedInline(
  dataSchema: Record<string, unknown>,
): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      code: { type: 'number', example: 0 },
      message: { type: 'string', example: 'ok' },
      data: dataSchema,
      traceId: { type: 'string', example: 'uuid' },
      timestamp: { type: 'integer', example: 1793860284593 },
    },
    required: ['code', 'message', 'data', 'traceId', 'timestamp'],
  };
}

/** 业务错误响应示例（错误码契约 docs/03 §2） */
export function errorExample(
  code: number,
  message: string,
): Record<string, unknown> {
  return {
    code: { example: code },
    message: { example: message },
    data: { example: null },
    traceId: { example: 'uuid' },
    timestamp: { example: 1793860298883 },
  };
}

/** 常用错误响应 schema 集合（401/403/400/404） */
export const ERRORS = {
  unauthorized: errorExample(2001, '未登录或凭证缺失'),
  tokenInvalid: errorExample(2002, '登录状态无效或已过期'),
  forbidden: errorExample(2003, '无功能权限'),
  badRequest: errorExample(3001, '参数校验失败'),
  notFound: errorExample(3005, '资源不存在或已删除'),
  invalidTransition: errorExample(3006, '当前状态不允许该操作'),
} as const;
