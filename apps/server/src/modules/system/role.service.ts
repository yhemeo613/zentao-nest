import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ErrorCodes } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { SysPermission } from './entities/sys-permission.entity.js';
import { SysRole } from './entities/sys-role.entity.js';
import { SysRolePermission } from './entities/sys-role-permission.entity.js';
import { SysUserRole } from './entities/sys-user-role.entity.js';
import { PermissionCacheService } from './permission-cache.service.js';
import {
  CreateRoleDto,
  SetRolePermissionsDto,
  UpdateRoleDto,
} from './dto/role.dto.js';

/** 角色 CRUD + 授权（docs/03 §4.1；删除/授权均触发权限缓存失效，docs/01 §10） */
@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(SysRole) private readonly roleRepo: Repository<SysRole>,
    @InjectRepository(SysPermission)
    private readonly permRepo: Repository<SysPermission>,
    @InjectRepository(SysRolePermission)
    private readonly rolePermRepo: Repository<SysRolePermission>,
    @InjectRepository(SysUserRole)
    private readonly userRoleRepo: Repository<SysUserRole>,
    private readonly permCache: PermissionCacheService,
  ) {}

  async create(dto: CreateRoleDto, operatorId: string): Promise<SysRole> {
    const exists = await this.roleRepo.findOne({
      where: { code: dto.code, deleted: 0 },
    });
    if (exists)
      throw new BusinessException(ErrorCodes.SYSTEM.ROLE_CODE_DUPLICATED);
    return this.roleRepo.save(
      this.roleRepo.create({
        name: dto.name,
        code: dto.code,
        remark: dto.remark ?? '',
        createdBy: operatorId,
      }),
    );
  }

  async list(): Promise<SysRole[]> {
    return this.roleRepo.find({ where: { deleted: 0 }, order: { id: 'ASC' } });
  }

  async update(id: string, dto: UpdateRoleDto): Promise<SysRole> {
    const role = await this.mustFind(id);
    if (dto.name !== undefined) role.name = dto.name;
    if (dto.remark !== undefined) role.remark = dto.remark;
    return this.roleRepo.save(role);
  }

  /** 有成员角色禁删（5303，docs/03 §4.1） */
  async remove(id: string): Promise<void> {
    const role = await this.mustFind(id);
    if (role.isSuper === 1) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.BUSINESS_RULE,
        '超级管理员角色禁止删除',
      );
    }
    const users = await this.userRoleRepo.count({ where: { roleId: id } });
    if (users > 0)
      throw new BusinessException(ErrorCodes.SYSTEM.ROLE_HAS_USERS);
    await this.roleRepo.update(id, { deleted: 1 });
    await this.rolePermRepo.delete({ roleId: id });
    await this.permCache.invalidateRoleUsers(id);
  }

  /** 权限点树（module → action 分组，前端勾选树用） */
  async permissionTree(): Promise<
    Array<{
      module: string;
      actions: Array<{ key: string; name: string; status: string }>;
    }>
  > {
    const perms = await this.permRepo.find({
      order: { module: 'ASC', action: 'ASC' },
    });
    const grouped = new Map<
      string,
      Array<{ key: string; name: string; status: string }>
    >();
    for (const p of perms) {
      const list = grouped.get(p.module) ?? [];
      list.push({
        key: `${p.module}.${p.action}`,
        name: p.name,
        status: p.status,
      });
      grouped.set(p.module, list);
    }
    return [...grouped.entries()].map(([module, actions]) => ({
      module,
      actions,
    }));
  }

  /** 全量替换角色权限（删后重插，对齐禅道 updatePrivByGroup；保底含 index 语义此处为 browse） */
  async setPermissions(
    roleId: string,
    dto: SetRolePermissionsDto,
  ): Promise<void> {
    const role = await this.mustFind(roleId);
    if (role.isSuper === 1) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.BUSINESS_RULE,
        '超级管理员角色不支持显式授权（鉴权直通）',
      );
    }
    const permIds: SysPermission[] = [];
    // 按 module.action 解析 id（仅 active 权限点可授予）
    const targets = dto.permissions
      .map((key) => {
        const [module, action] = key.split('.');
        return { module, action };
      })
      .filter((p) => p.module && p.action);
    const resolved = targets.length
      ? await this.permRepo.find({
          where: targets.map((t) => ({ module: t.module, action: t.action })),
        })
      : permIds;

    await this.rolePermRepo.delete({ roleId });
    if (resolved.length > 0) {
      await this.rolePermRepo.save(
        resolved.map((p) =>
          this.rolePermRepo.create({ roleId, permissionId: p.id }),
        ),
      );
    }
    await this.permCache.invalidateRoleUsers(roleId);
  }

  /** 角色当前权限点 */
  async getPermissions(roleId: string): Promise<string[]> {
    await this.mustFind(roleId);
    const links = await this.rolePermRepo.find({ where: { roleId } });
    if (links.length === 0) return [];
    const perms = await this.permRepo.find({
      where: { id: In(links.map((l) => l.permissionId)) },
    });
    return perms.map((p) => `${p.module}.${p.action}`);
  }

  private async mustFind(id: string): Promise<SysRole> {
    const role = await this.roleRepo.findOne({ where: { id, deleted: 0 } });
    if (!role)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '角色不存在',
      );
    return role;
  }
}
