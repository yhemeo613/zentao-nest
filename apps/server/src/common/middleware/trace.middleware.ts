import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { runWithTrace } from '../context/trace.context.js';

/**
 * 链路追踪中间件：透传或生成 traceId，写入响应头并贯穿请求上下文
 */
export function createTraceMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const traceId = (req.header('x-trace-id') ?? randomUUID()).slice(0, 64);
    res.setHeader('X-Trace-Id', traceId);
    runWithTrace(traceId, () => next());
  };
}
