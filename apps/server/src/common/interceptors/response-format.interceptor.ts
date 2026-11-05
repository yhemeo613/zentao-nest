import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiResponse } from '@zentao/shared';
import { getTraceId } from '../context/trace.context.js';

/**
 * 统一响应格式拦截器（docs/03 §1）：{ code: 0, message: 'ok', data, traceId, timestamp }
 * 控制器只返回业务数据，包装在此处统一完成。
 */
@Injectable()
export class ResponseFormatInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    _ctx: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        code: 0,
        message: 'ok',
        data,
        traceId: getTraceId(),
        timestamp: Date.now(),
      })),
    );
  }
}
