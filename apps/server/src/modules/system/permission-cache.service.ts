import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RedisService } from '../../common/redis/redis.service.js';
import { SysPermission } from './entities/sys-permission.entity.js';
import { SysRole } from './entities/sys-role.entity.js';
import { SysRolePermission } from './entities/sys-role-permission.entity.js';
import { SysUserRole } from './entities/sys-user-role.entity.js';

const PERM_TTL = 600; // docs/01 §10：权限缓存 10 分钟，授权变更主动失效
const permKey = (userId: string) => `rbac:user:${userId}:permissions`;
const superKey = (userId: string) => `rbac:user:${userId}:super`;

/**
 * 权限缓存（docs/01 §10 / ADR D004）：Redis 缓存优先，未命中回源 DB。
 * 失效策略：角色授权变更 → invalidateRoleUsers；用户角色变更 → invalidateUser。
 */
@Injectable()
export class PermissionCacheService {
  constructor(
    private readonly redis: RedisService,
    @InjectRepository(SysUserRole)
    private readonly userRoleRepo: Repository<SysUserRole>,
    @InjectRepository(SysRole) private readonly roleRepo: Repository<SysRole>,
    @InjectRepository(SysRolePermission)
    private readonly rolePermRepo: Repository<SysRolePermission>,
    @InjectRepository(SysPermission)
    private readonly permRepo: Repository<SysPermission>,
  ) {}

  async getPermissions(userId: string): Promise<string[]> {
    const cached = await this.redis.get(permKey(userId));
    if (cached) {
      try {
        return JSON.parse(cached) as string[];
      } catch {
        // 缓存损坏按未命中处理，回源重算
      }
    }
    const rows = await this.userRoleRepo.find({
      where: { userId, projectId: 0 },
    });
    if (rows.length === 0) {
      await this.redis.set(permKey(userId), '[]', PERM_TTL);
      return [];
    }
    const rolePerms = await this.rolePermRepo.find({
      where: { roleId: In(rows.map((r) => r.roleId)) },
    });
    let perms: string[] = [];
    if (rolePerms.length > 0) {
      const permEntities = await this.permRepo.find({
        where: {
          id: In([...new Set(rolePerms.map((rp) => rp.permissionId))]),
          status: 'active',
        },
      });
      perms = permEntities.map((p) => `${p.module}.${p.action}`);
    }
    await this.redis.set(permKey(userId), JSON.stringify(perms), PERM_TTL);
    return perms;
  }

  async isSuper(userId: string): Promise<boolean> {
    const cached = await this.redis.get(superKey(userId));
    if (cached !== null) return cached === '1';
    const rows = await this.userRoleRepo.find({
      where: { userId, projectId: 0 },
    });
    let isSuper = false;
    if (rows.length > 0) {
      const superRoles = await this.roleRepo.count({
        where: { id: In(rows.map((r) => r.roleId)), isSuper: 1, deleted: 0 },
      });
      isSuper = superRoles > 0;
    }
    await this.redis.set(superKey(userId), isSuper ? '1' : '0', PERM_TTL);
    return isSuper;
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.redis.del(permKey(userId), superKey(userId));
  }

  /** 角色/授权变更后：失效该角色下全部用户的权限缓存（docs/01 §10 失效策略） */
  async invalidateRoleUsers(roleId: string): Promise<void> {
    const rows = await this.userRoleRepo.find({ where: { roleId } });
    await Promise.all(rows.map((r) => this.invalidateUser(r.userId)));
  }

  /** 全量激活权限点（超管 me 返回菜单全量用） */
  async getAllActivePermKeys(): Promise<string[]> {
    const perms = await this.permRepo.find({ where: { status: 'active' } });
    return perms.map((p) => `${p.module}.${p.action}`);
  }
}
