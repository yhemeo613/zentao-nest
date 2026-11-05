import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** JWT 载荷用户（sub/account/jti；不含角色——docs/01 §9 铁律） */
export interface JwtUser {
  id: string;
  account: string;
  jti: string;
  typ: 'access' | 'refresh';
  exp?: number;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser =>
    ctx.switchToHttp().getRequest().user,
);
