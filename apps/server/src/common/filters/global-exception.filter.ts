import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ErrorCodes } from '@zentao/shared';
import { Request, Response } from 'express';
import { BusinessException } from '../exceptions/business.exception.js';
import { getTraceId } from '../context/trace.context.js';

/** 按框架 HTTP 状态兜底推导业务错误码（无 code 的异常体，docs/03 §2 段位） */
function fallbackCodeByStatus(status: number): number {
  switch (status) {
    case HttpStatus.UNAUTHORIZED:
      return ErrorCodes.AUTH.UNAUTHENTICATED;
    case HttpStatus.FORBIDDEN:
      return ErrorCodes.AUTH.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return ErrorCodes.VALIDATION.NOT_FOUND;
    case HttpStatus.TOO_MANY_REQUESTS:
      return ErrorCodes.SYS.RATE_LIMITED;
    default:
      return status >= HttpStatus.BAD_REQUEST
        ? ErrorCodes.VALIDATION.BUSINESS_RULE
        : ErrorCodes.SYS.INTERNAL_ERROR;
  }
}

/**
 * 全局异常过滤器：任何异常统一为 { code, message, data: null, traceId, timestamp }
 * （docs/01 §7 / docs/03 §1；HTTP 状态保留语义，业务码双层表达）
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: number = ErrorCodes.SYS.INTERNAL_ERROR;
    let message = '系统内部错误';

    if (exception instanceof BusinessException) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse() as Record<string, unknown> | string;
      if (typeof body === 'string') {
        code = fallbackCodeByStatus(status);
        message = body;
      } else {
        // ValidationPipe（docs/06 §5.2）：聚合字段级错误信息
        const rawMessage = body['message'];
        if (Array.isArray(rawMessage)) {
          code = ErrorCodes.VALIDATION.VALIDATION_FAILED;
          message = (rawMessage as string[]).join('；');
        } else {
          code =
            typeof body['code'] === 'number'
              ? body['code']
              : fallbackCodeByStatus(status);
          message = (rawMessage as string) ?? exception.message;
        }
      }
    } else {
      this.logger.error(
        exception instanceof Error
          ? (exception.stack ?? exception.message)
          : String(exception),
      );
    }

    res.status(status).json({
      code,
      message,
      data: null,
      traceId: getTraceId(req.header('x-trace-id') ?? '-'),
      timestamp: Date.now(),
    });
  }
}
