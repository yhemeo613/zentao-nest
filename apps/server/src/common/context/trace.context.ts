import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * 链路上下文：traceId 贯穿中间件 → 拦截器/过滤器 → 日志与响应体
 * （docs/03 §1：响应体携带 traceId，响应头 X-Trace-Id 回传）
 */
interface TraceStore {
  traceId: string;
}

const als = new AsyncLocalStorage<TraceStore>();

export function runWithTrace<T>(traceId: string, fn: () => T): T {
  return als.run({ traceId }, fn);
}

export function getTraceId(fallback = '-'): string {
  return als.getStore()?.traceId ?? fallback;
}
