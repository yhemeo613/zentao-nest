import { ErrorCodes } from '@zentao/shared';
import { ApiError } from './http.js';

export type ErrorKind = 'unauthorized' | 'forbidden' | 'transition' | 'biz' | 'sys';

/**
 * 错误码→前端行为分发（docs/05 §4 错误码路由表）
 * toast 文案默认取 ApiError.message（服务端中文），此处只做分类与跳转决策。
 */
export function describeError(error: unknown): { code: number; message: string; kind: ErrorKind } {
  if (error instanceof ApiError) {
    const { code, message } = error;
    let kind: ErrorKind = 'biz';
    if (code === 2001 || code === 2002 || code === 2007) kind = 'unauthorized';
    else if (code === 2003 || code === 2004) kind = 'forbidden';
    else if (code === ErrorCodes.VALIDATION.INVALID_TRANSITION) kind = 'transition';
    else if (code >= 1000 && code < 2000) kind = 'sys';
    return { code, message, kind };
  }
  return {
    code: ErrorCodes.SYS.INTERNAL_ERROR,
    message: error instanceof Error ? error.message : '未知错误',
    kind: 'sys',
  };
}
