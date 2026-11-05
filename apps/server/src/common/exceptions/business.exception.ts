import { HttpException } from '@nestjs/common';
import { DefaultErrorMessages, httpStatusFor } from '@zentao/shared';

/**
 * 业务异常：携带 docs/03 §2 注册表错误码，HTTP 状态按段位自动推导。
 * 用法：throw new BusinessException(ErrorCodes.VALIDATION.INVALID_TRANSITION, '任务已关闭，无法开始');
 */
export class BusinessException extends HttpException {
  readonly code: number;

  constructor(code: number, message?: string, status?: number) {
    super(
      { code, message: message ?? DefaultErrorMessages[code] ?? '业务异常' },
      status ?? httpStatusFor(code),
    );
    this.code = code;
  }
}
