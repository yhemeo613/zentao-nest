import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ErrorCodes } from '@zentao/shared';
import { BusinessException } from '../exceptions/business.exception.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/** 全局认证守卫（docs/01 §9）：@Public 白名单放行，其余验 JWT + denylist */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return isPublic ? true : super.canActivate(context);
  }

  // 策略层抛出的 BusinessException（如 denylist 命中 2002）原样透传，其余统一 2001
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override handleRequest(err: any, user: any, info: any): any {
    if (err || !user) {
      throw (
        err ??
        new BusinessException(ErrorCodes.AUTH.UNAUTHENTICATED, info?.message)
      );
    }
    return user;
  }
}
