import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCodes } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { PERMISSION_META_KEY } from '../decorators/permissions.decorator.js';
import { JwtUser } from '../decorators/current-user.decorator.js';
import { PermissionCacheService } from '../../modules/system/permission-cache.service.js';

/**
 * 功能权限守卫（docs/01 §9 / ADR D004）：
 * 权限点从 DB（Redis 缓存优先）读取，绝不读 JWT 内角色字段。
 * 无 @Permissions 装饰器的路由 = 「登录即可」语义（docs/03 §4 各表）。
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cache: PermissionCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const perm = this.reflector.getAllAndOverride<string>(PERMISSION_META_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!perm) return true;

    const user = context.switchToHttp().getRequest().user as
      JwtUser | undefined;
    if (!user) throw new BusinessException(ErrorCodes.AUTH.UNAUTHENTICATED);

    // 超管直通（is_super 角色，docs/04 §9.1）
    if (await this.cache.isSuper(user.id)) return true;

    const permissions = await this.cache.getPermissions(user.id);
    if (!permissions.includes(perm)) {
      throw new BusinessException(
        ErrorCodes.AUTH.FORBIDDEN,
        `缺少权限点：${perm}`,
      );
    }
    return true;
  }
}
