/**
 * 权限点常量（规格：docs/03-接口与契约.md §3/§4 权限点列；矩阵：docs/04-数据与种子 §9.2）
 * 唯一事实源：后端 @Permissions 装饰器与前端 v-permission/路由 meta 均须 import 此处。
 * 新模块落地时在本文件追加分组，并回填 docs/03 §12。
 */

export const PERMS = {
  /** system 系统模块（P1） */
  user: {
    browse: 'user.browse',
    create: 'user.create',
    view: 'user.view',
    edit: 'user.edit',
    delete: 'user.delete',
  },
  dept: { browse: 'dept.browse', manage: 'dept.manage' },
  group: {
    browse: 'group.browse',
    create: 'group.create',
    edit: 'group.edit',
    delete: 'group.delete',
    updatePriv: 'group.updatePriv',
  },
  acl: { browse: 'acl.browse', manage: 'acl.manage' },
} as const;

type PermValues<T> = T extends string ? T : PermValues<T[keyof T]>;
export type PermKey = PermValues<typeof PERMS>;

/** 展平全部权限点字符串（种子/校验用） */
export function allPermKeys(): PermKey[] {
  const out: PermKey[] = [];
  for (const group of Object.values(PERMS)) {
    for (const key of Object.values(group)) out.push(key as PermKey);
  }
  return out;
}

/** 解析 'module.action' → [module, action]（权限缓存/守卫判定用） */
export function splitPermKey(perm: string): [string, string] {
  const idx = perm.indexOf('.');
  if (idx <= 0 || idx === perm.length - 1) throw new Error(`非法权限点：${perm}`);
  return [perm.slice(0, idx), perm.slice(idx + 1)];
}
