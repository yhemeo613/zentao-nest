import { SetMetadata } from '@nestjs/common';

export const PERMISSION_META_KEY = 'zentao:permissions';

/**
 * 权限点注册表：装饰器执行期（模块加载）自动登记，供种子脚本扫描。
 * 权限点字符串必须来自 @zentao/shared PERMS（AGENTS §4），禁止手写裸串。
 */
const registry = new Map<string, string>(); // perm -> name(暂用 key 本身)

export const Permissions = (perm: string, name?: string): MethodDecorator => {
  registry.set(perm, name ?? perm);
  return SetMetadata(PERMISSION_META_KEY, perm);
};

/** 种子脚本读取（PermissionSeedService.onModuleInit 时全部控制器已加载） */
export function getPermissionRegistry(): Array<{ perm: string; name: string }> {
  return [...registry.entries()].map(([perm, name]) => ({ perm, name }));
}
