import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'zentao:isPublic';

/** 标记公开路由（白名单仅 /health、/auth/login|refresh，docs/01 §7） */
export const Public = (): MethodDecorator => SetMetadata(IS_PUBLIC_KEY, true);
