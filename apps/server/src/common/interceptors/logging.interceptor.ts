import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { getTraceId } from '../context/trace.context.js';

/** 慢请求告警阈值（docs/01 §7：1s） */
const SLOW_REQUEST_MS = 1000;

/**
 * 日志切面：请求入出耗时 + traceId；慢请求 WARN。
 * JSON 结构化日志（对接采集）在 P7 观测性阶段统一升级。
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = ctx.switchToHttp();
    const req = http.getRequest<Request>();
    const started = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = http.getResponse<Response>();
          const cost = Date.now() - started;
          const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${cost}ms trace=${getTraceId()}`;
          if (cost >= SLOW_REQUEST_MS) this.logger.warn(`slow ${line}`);
          else this.logger.log(line);
        },
        error: (err: unknown) => {
          const cost = Date.now() - started;
          this.logger.error(
            `${req.method} ${req.originalUrl} ${cost}ms trace=${getTraceId()} error=${String(err)}`,
          );
        },
      }),
    );
  }
}
